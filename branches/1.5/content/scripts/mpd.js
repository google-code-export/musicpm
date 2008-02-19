/**    Music Player Minion  Copyright 2008, Chris Seickel
*
*      This program is free software; you can redistribute it and/or modify
*      it under the terms of the GNU General Public License as published by
*      the Free Software Foundation; either version 2 of the License, or
*      (at your option) any later version.
*
*      This program is distributed in the hope that it will be useful,
*      but WITHOUT ANY WARRANTY; without even the implied warranty of
*      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*      GNU General Public License for more details.
*
*      You should have received a copy of the GNU General Public License
*      along with this program; if not, write to the Free Software
*      Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
*      MA 02110-1301, USA.
*/

var observerService = Components.classes["@mozilla.org/observer-service;1"]
                        .getService(Components.interfaces.nsIObserverService);
var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                        .getService(Components.interfaces.nsIConsoleService);
var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);
                
if (prefs.getPrefType("extensions.mpm.mpd_host") != prefs.PREF_STRING){
    prefs.setCharPref("extensions.mpm.mpd_host", 'localhost')
}
if (prefs.getPrefType("extensions.mpm.mpd_port") != prefs.PREF_INT){
    prefs.setIntPref("extensions.mpm.mpd_port", 6600)
}
if (prefs.getPrefType("extensions.mpm.mpd_password") != prefs.PREF_STRING) {
    prefs.setCharPref("extensions.mpm.mpd_password", "")
}

var myPrefObserver = {
    register: function(){
        var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        this._branch = prefService.getBranch("extensions.mpm.");
        this._branch.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
        this._branch.addObserver("", this, false);
    },
    
    unregister: function(){
        if (!this._branch) 
            return;
        this._branch.removeObserver("", this);
    },
    
    observe: function(aSubject, aTopic, aData){
        if (aTopic != "nsPref:changed") 
            return;
        // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
        // aData is the name of the pref that's been changed (relative to aSubject)
        switch (aData) {
            case "host":
                mpd.host = prefs.getCharPref("extensions.mpm.mpd_host");
                mpd.connect();
                break;
            case "port":
                mpd.port = prefs.getIntPref("extensions.mpm.mpd_port");
                mpd.connect();
                break;
            case "password":
                mpd.password = prefs.getCharPref("extensions.mpm.password");
                mpd.connect();
                break;
        }
    }
}
myPrefObserver.register();

function debug(s) {
    //return null
    if (typeof(s) == 'object') {
        var str = ""
        for (x in s) {str += x + ": " + s[x] + "\n"}
    }
    else {var str = s}
    consoleService.logStringMessage(str)
}

function socketTalker() {
    var transport = transportService.createTransport(null,0,host,port,null);
    var outstream = transport.openOutputStream(0,0,0);
    var instream = transport.openInputStream(0,0,0);
    const replacementChar = Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
    var utf_instream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                   .createInstance(Components.interfaces.nsIConverterInputStream);
    var utf_outstream = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                   .createInstance(Components.interfaces.nsIConverterOutputStream)
                   
    conv_instream.init(instream, 'UTF-8', 1024, replacementChar);
    conv_outstream.init(outstream, 'UTF-8', 0, 0x0000)

    var listener = {
        data: "",
        onStartRequest: function(request, context){
            mpd.active = true
            mpd.idle = false
        },
        onStopRequest: function(request, context, status){
            try {
                utf_outstream.close()
            } 
            catch (e) {
            }
            try {
                utf_instream.close()
            } 
            catch (e) {
            }
            try {
                transport.close(0)
            } 
            catch (e) {
            }
            mpd.active = false
            mpd.idle = false
        },
        onDataAvailable: function(request, context, inputStream, offset, count){
            try {
                mpd.idle = false
                if (!mpd.active) {
                    request.cancel(0);
                    return null
                }
                var str = {};
                var done = false
                while (utf_instream.readString(4096, str) != 0) {
                    this.data += str.value
                }
                str = null
                if (this.data.slice(-3) == "OK\n") {
                    var snd = mpd.cmdQueue[0].outputData
                    if (snd != mpd.statusCmd) {
                        mpd.set('lastResponse', "OK")
                    }
                    if (mpd.cmdQueue.length > 0 && typeof(mpd.cmdQueue[0].callBack) == 'function') {
                        mpd.cmdQueue[0].callBack(this.data)
                    }
                    mpd.cmdQueue.shift()
                    this.data = ""
                    if (mpd.cmdQueue.length > 0) {
                        utf_outstream.writeString(mpd.cmdQueue[0].outputData);
                        var snd = mpd.cmdQueue[0].outputData
                        if (snd != mpd.statusCmd) {
                            if (snd.substr(0, 9) != "plchanges") {
                                mpd.set('lastCommand', shorten(snd));
                            }
                            mpd.set('lastResponse', "Working...");
                        }
                    }
                    else {
                        done = true
                    }
                }
                else 
                    if (this.data.substr(0, 6) == "OK MPD") {
                        mpd.set('lastResponse', this.data.substr(3))
                        this.data = ""
                        if (mpd.password.length > 0) {
                            mpd.cmdQueue.unshift({
                                'outputData': 'password ' +
                                mpd.password +
                                '\n',
                                'callBack': null
                            })
                        }
                        if (mpd.cmdQueue.length > 0) {
                            utf_outstream.writeString(mpd.cmdQueue[0].outputData);
                            var snd = mpd.cmdQueue[0].outputData
                            if (snd != status_command) {
                                if (snd.substr(0, 9) != "plchanges") {
                                    mpd.set('lastCommand', shorten(snd))
                                }
                                mpd.set('lastResponse', "Working...");
                            }
                        }
                        else {
                            done = true
                        }
                    }
                    else 
                        if (this.data.indexOf('ACK [') != -1) {
                            mpd.set('lastResponse', this.data.replace(/\n/g, ""))
                            if (snd == mpd.statusCmd) {
                                var msg = "An error has occured when communicating with MPD,\n" +
                                "do you want to halt execution?\n\n" +
                                "Click Cancel to continue sending commands, or\n" +
                                "Click OK to prevent further attempts.\n\n\n" +
                                "Command:\n" +
                                mpd.cmdQueue[0].outputData +
                                "\n\n" +
                                "Response:\n" +
                                this.data
                                mpd.active = !confirm(msg)
                            }
                            mpd.cmdQueue.shift()
                            mpd.doStatus = false
                            done = true
                        }
                if (done) {
                    this.data = ""
                    if (mpd.doStatus) {
                        mpd.doStatus = false
                        mpd.cmdQueue.push({
                            'outputData': status_command,
                            'callBack': statusCallBack
                        })
                        utf_outstream.writeString(status_command)
                    }
                    else {
                        mpd.idle = true
                    }
                }
            } 
            catch (e) {
                debug(e)
            }
        }
    }
}

function simple_send (cmd) {
    try {
        cmd += "\n"
        var smpl_transport = transportService.createTransport(null,0,host,port,null);
        var smpl_outstream = smpl_transport.openOutputStream(0,0,0);
        var smpl_stream = smpl_transport.openInputStream(0,0,0);
        var smpl_instream = Components.classes["@mozilla.org/scriptableinputstream;1"]
          .createInstance(Components.interfaces.nsIScriptableInputStream);
        smpl_instream.init(smpl_stream);

        var smpl_dataListener = {
          data : "",
          onStartRequest: function(request, context){
          },
          onStopRequest: function(request, context, status){
            smpl_instream.close();
            smpl_outstream.close()
            smpl_transport.close(0);
          },
          onDataAvailable: function(request, context, inputStream, offset, count){
            this.data += smpl_instream.read(count);
            debug("simple stream data: "+this.data)
            if (this.data.substr(0,6) == "OK MPD"){
                this.data = ""
                if (mpd.password.length > 0) {
                    pw = "password " + pass + "\n"
                    smpl_outstream.write(pw, pw.length)
                }
                else {
                    smpl_outstream.write(cmd, cmd.length)
                }
            }
            else if (this.data.slice(-3) == "OK\n") {
                if (mpd.password.length > 0) {
                    smpl_outstream.write(cmd, cmd.length)
                }
                else {
                    cmd = "close\n"
                    smpl_outstream.write(cmd, cmd.length)
                }
            }
            else if (this.data.indexOf('ACK [') != -1) {
                var msg = "An error has occured when communicating with MPD.\n\n" +
                        "Command: " + cmd +
                        "Response: "+ this.data
                alert(msg)
                request.cancel(0)
            }
          },
        };

        var smpl_pump = Components.
          classes["@mozilla.org/network/input-stream-pump;1"].
            createInstance(Components.interfaces.nsIInputStreamPump);
        smpl_pump.init(smpl_stream, -1, -1, 0, 0, false);
        smpl_pump.asyncRead(smpl_dataListener,null);
    } catch (e) {debug(e)}
}

var mpd = {
    status: {
        repeat: null,
        random: null,
        playlist: null,
        playlistlength: null,
        xfade: null,
        state: null,
        song: null,
        songid: null,
        time: null,
        bitrate: null,
        audio: null,
        artists: null,
        albums: null,
        songs: null,
        uptime: null,
        playtime: null,
        db_playtime: null,
        db_update: null,
        updating_db: null,
        file: null,
        Time: null,
        Artist: null,
        Title: null,
        Album: null,
        Track: null,
        Date: null,
        Genre: null,
        Composer: null,
        Pos: null,
        Id: null
    },
    host: prefs.getCharPref("extensions.mpm.mpd_host"),
    port: prefs.getIntPref("extensions.mpm.mpd_port"),
    password: prefs.getCharPref("extensions.mpm.password"),
    
    greeting: 'Not Connected',
    lastCommand: '',
    lastResponse: '',
    active: false,
    idle: false,
    refreshing: false,
    doStatus: true,
    cmdQueue: [],
    statusCmd: 'command_list_begin\nstatus\nstats\ncurrentsong\ncommand_list_end',
    outstream: null,
    
    timer: null,
    connect: function () {
        if (mpd.timer) mpd.timer.cancel()
        mpd.idle = false
        mpd.active = false
        mpd.checkStatus()
    },
    disconnect: function () {
        if (mpd.timer) {
            mpd.timer.cancel()
            mpd.timer = null
        }
        mpd.idle = false
        mpd.active = false
    },
    checkStatus: function () {
        mpd.doStatus = true
        if (!mpd.active) {mpd.outstream=socketTalker()}
        if (idle) {mpd.outstream.writeString("\n")}
        var tm = (mpd.state == "play") ? 200 : 800
        if (mpd.active) {mpd.timer = setTimeout("mpd.checkStatus()", tm)} 
    },
    doCmd: function (outputData, callBack){
        if (typeof(callBack)=='undefined') callBack = null
        if (!callBack && !mpd.active) {
            // Send it blind
            simple_send(outputData)
        }
        else {
            mpd.cmdQueue.push({'outputData':outputData+"\n", 'callBack':callBack})
            mpd.idoStatus = true
            if (mpd.active) {
                if (mpd.idle) {
                    mpd.outstream.writeString(queue[0].outputData)
                    mpd.idle = false
                }
            }
            else  {mpd.connect()}
            
        }
    },
    set: function (attr, val) {
        if (val != mpd[attr]) {
            observerService.notifyObservers(mpd, attr, val)
        }
    },
    setStatus: function (attr, val) {
        if (val != mpd.status[attr]) {
            observerService.notifyObservers(mpd, attr, val)
        }
    },
    // Batch update from polling loop.
    update: function (data) {
        mpd.refreshing = true
        
        //parse the incoming data into a status object
        var obj = new Object()
        data = data.split("\n")
        var dl = data.length
        var pair
        do {
            pair = data[dl - 1].split(": ", 2)
            if (pair.length == 2) {
                obj[pair[0]] = pair[1]
            }
        } while (--dl)
        
        //process status object
        var i = mpd.status.length
        for (x in mpd.status) {
            var attr = x
            var val = obj[x]
            if (typeof(val) == 'undefined') val = null
            mpd.setStatus(attr, val)
        }
        
        mpd.refreshing = false
        mpd.doStatus = false
    }
}


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

EXPORTED_SYMBOLS = ["mpd", "prefs", "debug", "observerService"]

// Use this line to import: 
// Components.utils.import("resource://minion/mpd.js");

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
                mpd._host = prefs.getCharPref("extensions.mpm.mpd_host");
                mpd.connect();
                break;
            case "port":
                mpd._port = prefs.getIntPref("extensions.mpm.mpd_port");
                mpd.connect();
                break;
            case "password":
                mpd._password = prefs.getCharPref("extensions.mpm.password");
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
    var transport = transportService.createTransport(null,0,mpd._host,mpd._port,null);
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
            mpd._idle = false
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
            mpd._set('greeting','Not Connected');
            mpd.active = false;
            mpd._idle = false;
            mpd.outstream = null
            mpd._socket = null
        },
        onDataAvailable: function(request, context, inputStream, offset, count){
            try {
                mpd._idle = false
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
                    var snd = mpd._cmdQueue[0].outputData
                    if (snd != mpd._statusCmd) {
                        mpd._set('lastResponse', "OK")
                    }
                    if (mpd._cmdQueue.length > 0 && typeof(mpd._cmdQueue[0].callBack) == 'function') {
                        mpd._cmdQueue[0].callBack(this.data)
                    }
                    mpd._cmdQueue.shift()
                    this.data = ""
                    if (mpd._cmdQueue.length > 0) {
                        utf_outstream.writeString(mpd._cmdQueue[0].outputData);
                        var snd = mpd._cmdQueue[0].outputData
                        if (snd != mpd._statusCmd) {
                            if (snd.substr(0, 9) != "plchanges") {
                                mpd._set('lastCommand', shorten(snd));
                            }
                            mpd._set('lastResponse', "Working...");
                        }
                    }
                    else {
                        done = true
                    }
                }
                else 
                    if (this.data.substr(0, 6) == "OK MPD") {
                        mpd._set('lastResponse', this.data.substr(3))
                        this.data = ""
                        if (mpd._password.length > 0) {
                            mpd._cmdQueue.unshift({
                                'outputData': 'password "' +
                                mpd._password + '"\n',
                                'callBack': null
                            })
                        }
                        if (mpd._cmdQueue.length > 0) {
                            utf_outstream.writeString(mpd._cmdQueue[0].outputData);
                            var snd = mpd._cmdQueue[0].outputData
                            if (snd != status_command) {
                                if (snd.substr(0, 9) != "plchanges") {
                                    mpd._set('lastCommand', shorten(snd))
                                }
                                mpd._set('lastResponse', "Working...");
                            }
                        }
                        else {
                            done = true
                        }
                    }
                    else 
                        if (this.data.indexOf('ACK [') != -1) {
                            mpd._set('lastResponse', this.data.replace(/\n/g, ""))
                            if (snd == mpd._statusCmd) {
                                var msg = "An error has occured when communicating with MPD,\n" +
                                "do you want to halt execution?\n\n" +
                                "Click Cancel to continue sending commands, or\n" +
                                "Click OK to prevent further attempts.\n\n\n" +
                                "Command:\n" +
                                mpd._cmdQueue[0].outputData +
                                "\n\n" +
                                "Response:\n" +
                                this.data
                                mpd.active = !confirm(msg)
                            }
                            mpd._cmdQueue.shift()
                            mpd._doStatus = false
                            done = true
                        }
                if (done) {
                    this.data = ""
                    if (mpd._doStatus) {
                        mpd._doStatus = false
                        mpd._cmdQueue.push({
                            'outputData': mpd._statusCmd,
                            'callBack': mpd._update
                        })
                        utf_outstream.writeString(status_command)
                    }
                    else {
                        mpd._idle = true
                    }
                }
            } 
            catch (e) {
                debug(e)
            }
        }
    }
    
    var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].
            createInstance(Components.interfaces.nsIInputStreamPump);
    pump.init(instream, -1, -1, 0, 0, false);
    pump.asyncRead(listener,null);
    
    
    var con = {
        cancel: function () {transport.cancel(0)},
        writeOut: function (str) {utf_outstream.writeString(str)}
    }
    return con
}

function simple_send (cmd) {
    try {
        cmd += "\n"
        var s_transport = transportService.createTransport(null,0,host,port,null);
        var s_outstream = s_transport.openOutputStream(0,0,0);
        var s_stream = s_transport.openInputStream(0,0,0);
        var s_instream = Components.classes["@mozilla.org/scriptableinputstream;1"]
          .createInstance(Components.interfaces.nsIScriptableInputStream);
        s_instream.init(s_stream);

        var s_dataListener = {
          data : "",
          onStartRequest: function(request, context){
          },
          onStopRequest: function(request, context, status){
            s_instream.close();
            s_outstream.close()
            s_transport.close(0);
          },
          onDataAvailable: function(request, context, inputStream, offset, count){
            this.data += s_instream.read(count);
            debug("simple stream data: "+this.data)
            if (this.data.substr(0,6) == "OK MPD"){
                this.data = ""
                if (mpd._password.length > 0) {
                    pw = 'password "' + pass + '"\n'
                    s_outstream.write(pw, pw.length)
                }
                else {
                    s_outstream.write(cmd, cmd.length)
                }
            }
            else if (this.data.slice(-3) == "OK\n") {
                if (mpd._password.length > 0) {
                    s_outstream.write(cmd, cmd.length)
                }
                else {
                    cmd = "close\n"
                    s_outstream.write(cmd, cmd.length)
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

        var s_pump = Components.
          classes["@mozilla.org/network/input-stream-pump;1"].
            createInstance(Components.interfaces.nsIInputStreamPump);
        s_pump.init(s_stream, -1, -1, 0, 0, false);
        s_pump.asyncRead(s_dataListener,null);
    } catch (e) {debug(e)}
}

var mpd = {
    _host: prefs.getCharPref("extensions.mpm.mpd_host"),
    _port: prefs.getIntPref("extensions.mpm.mpd_port"),
    _password: prefs.getCharPref("extensions.mpm.password"),
    _statusCmd:  'command_list_begin\n' +
                'status\n' +
                'stats\n' +
                'currentsong\n' +
                'command_list_end',
    status: {
        // Output of status
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
        updating_db: null,
        
        // Output of stats
        artists: null,
        albums: null,
        songs: null,
        uptime: null,
        playtime: null,
        db_playtime: null,
        db_update: null,
        
        // Output of currentsong
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
    
    // Connection state information
    greeting: 'Not Connected',
    lastCommand: '',
    lastResponse: '',
    active: false,
    _idle: false,
    _refreshing: false,
    _doStatus: true,
    _timer: null,
    _cmdQueue: [],
    _socket: null,
    
    // Connection methods
    connect: function () {
        if (mpd._timer) mpd._timer.abort()
        if (mpd.active) {
            mpd._socket.cancel()
        }
        mpd.checkStatus()
    },
    disconnect: function () {
        if (mpd._timer) {
            mpd._timer.abort()
            mpd._timer = null
        }
        mpd._socket.cancel()
    },
    _checkStatus: function () {
        mpd._doStatus = true
        if (!mpd.active) {mpd._socket = socketTalker()}
        if (idle) {mpd._socket.writeOut("\n")}
        var tm = (mpd.state == "play") ? 200 : 800
        if (mpd.active) {mpd._timer = setTimeout("mpd.checkStatus()", tm)} 
    },
    
    // Talk directlty to MPD, outputData must be properly escaped and quoted.
    // callBack is optional, if left out or null and no socket is in use,
    // a single use connection will be made for this command.
    doCmd: function (outputData, callBack){
        if (typeof(callBack)=='undefined') callBack = null
        if (!callBack && !mpd.active) {
            // Send it blind
            simple_send(outputData)
        }
        else {
            mpd._cmdQueue.push({'outputData':outputData+"\n", 'callBack':callBack})
            mpd._doStatus = true
            if (mpd.active) {
                if (mpd._idle) {
                    mpd._socket.writeOut(queue[0].outputData)
                    mpd._idle = false
                }
            }
            else  {mpd.connect()}
            
        }
    },
    
    // Any attribute that may be observed must be set with these methods.
    // _set is for root level attributes, internal use only.
    _set: function (attr, val) {
        if (val != mpd[attr]) {
            observerService.notifyObservers(mpd, attr, val)
        }
    },
    
    // mpd.set(attribute, value) is used for status atrributes.
    set: function (attr, val) {
        if (val != mpd.status[attr]) {
            observerService.notifyObservers(mpd, attr, val)
        }
    },
    
    // Batch update from polling loop, internal use only.
    _update: function (data) {
        mpd._refreshing = true
        
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
            mpd.set(attr, val)
        }
        
        mpd._refreshing = false
        mpd._doStatus = false
    }
}


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

EXPORTED_SYMBOLS = ["mpd"]

// mpmUtils.js: EXPORTED_SYMBOLS = ["Nz", "debug", "prefService", "observerService"]
Components.utils.import("resource://minion/mpmUtils.js");


function loadSrvPref () {
	var srv = prefService.getCharPref("extensions.mpm.mpd_host");
	if (prefService.getPrefType("extensions.mpm.server") == prefService.PREF_STRING) {
		var srv = prefService.getCharPref("extensions.mpm.mpd_host");
		srv = srv.split(":", 3);
		if (srv.length == 3) {
			mpd._host = srv[0];
			mpd._port = parseInt(srv[1]);
			mpd._password = srv[2];
		}
	}
	else {
		prefService.setCharPref("extensions.mpm.server", 'localhost:6600:')
		mpd._host = 'localhost';
		mpd._port = 6600;
		mpd._password = '';
	}
}

var mpd = {
    _host: null,
    _port: null,
    _password: null,
    _statusCmd: 'command_list_begin\n' +
                'status\n' +
                'currentsong\n' +
                'command_list_end',
    status: {
        // Output of status
        repeat: null,
        random: null,
        playlistlength: null,
        playlist: null,
        xfade: null,
        state: null,
        song: null,
        songid: null,
        time: null,
        bitrate: null,
        audio: null,
        updating_db: null,
                
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
    _idle: false,
    _refreshing: false,
    _doStatus: true,
    _timer: null,
    _cmdQueue: [],
    _socket: null,
    
    // Connection methods
    connect: function () {
        if (mpd._timer) mpd._timer.abort()
        if (mpd._socket) {
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
        if (!mpd._socket) {mpd._socket = socketTalker()}
        if (idle) {mpd._socket.writeOut("\n")}
        var tm = (mpd.state == "play") ? 200 : 800
        if (mpd._timer) {
            mpd._timer.abort()
        }
        if (mpd._socket) {mpd._timer = setTimeout("mpd.checkStatus()", tm)} 
    },
    
    // Talk directlty to MPD, outputData must be properly escaped and quoted.
    // callBack is optional, if left out or null and no socket is in use,
    // a single use connection will be made for this command.
    doCmd: function (outputData, callBack){
        if (typeof(callBack)=='undefined') callBack = null
        if (!callBack && !mpd._socket) {
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
    
    // mpd.setStatus(attribute, value) is used for status atrributes.
    setState: function (attr, val) {
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
        
        //set status values 
		for (x in mpd.state){
			mpd.setState(x, obj[x])
        }
        
        mpd._refreshing = false
        mpd._doStatus = false
    }
}

function socketTalker() {
	if (Nz(mpd._host) || Nz(mpd._port)) {
		loadSrvPref()
	}
    try {
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
    } catch (e) {
        return null
    }

    var listener = {
        data: "",
        onStartRequest: function(request, context){
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
            mpd._idle = false;
            mpd._socket = null
        },
        onDataAvailable: function(request, context, inputStream, offset, count){
            try {
                mpd._idle = false
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

var myPrefObserver = {
    register: function(){
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
            case "server":
				loadSrvPref()
				mpd.connect();
                break;
        }
    }
}
myPrefObserver.register();

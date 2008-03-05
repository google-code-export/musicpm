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

Components.utils.import("resource://minion/mpmUtils.js");
EXPORTED_SYMBOLS = ["mpd", "mpd_EXPORTED_SYMBOLS"].concat(mpmUtils_EXPORTED_SYMBOLS)
var mpd_EXPORTED_SYMBOLS = copyArray(EXPORTED_SYMBOLS)


var prefService = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefService);
var prefBranch = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);
var mpd = {
    _host: null,
    _port: null,
    _password: null,

    // Output of status
    volume: null,
    repeat: null,
    random: null,
    playlistlength: null,
    playlist: 0,
    xfade: null,
    state: null,
    song: null,
    time: null,
    bitrate: null,
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

    // Playlist contents and total playtime
    plinfo: [],
    pltime: 0,

    // Connection state information
    greeting: 'Not Connected',
    lastCommand: '',
    lastResponse: '',
    _idle: false,
    _doStatus: true,
    _timer: null,
    _cmdQueue: [],
    _socket: null,

    // Connection methods
    connect: function () {
        if (mpd._timer) mpd._timer.cancel()
        if (mpd._socket) {
            mpd._socket.cancel()
        }
        mpd._checkStatus()
    },
    disconnect: function () {
        if (mpd._timer) {
            mpd._timer.cancel()
            mpd._timer = null
        }
        mpd._socket.cancel()
    },
    _checkStatus: function () {
        mpd._doStatus = true
        if (!mpd._socket) {mpd._socket = socketTalker()}
        if (mpd._idle) {mpd._socket.writeOut("\n")}
        var tm = (mpd.state == "play") ? 200 : 800
        if (mpd._timer) {
            mpd._timer.cancel()
        }
        if (mpd._socket) {
            var cb = {notify: function (tmr) {mpd._checkStatus()}}
            mpd._timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer)
            mpd._timer.initWithCallback(cb, tm, Components.interfaces.nsITimer.TYPE_ONE_SHOT)
        }
    },

    // Talk directlty to MPD, outputData must be properly escaped and quoted.
    // callBack is optional, if left out or null and no socket is in use,
    // a single use connection will be made for this command.
    doCmd: function (outputData, callBack, hide){
        hide = Nz(hide)
        mpd._cmdQueue.push({
            outputData: outputData+"\n",
            callBack: Nz(callBack),
            hide: hide
            })
        mpd._doStatus = true
        if (mpd._socket) {
            if (mpd._idle) {
                mpd._socket.writeOut(mpd._cmdQueue[0].outputData)
                if (!hide) mpd.set('lastCommand', shorten(outputData+"\n"));
                mpd._idle = false
            }
        }
        else  {mpd.connect()}
    },

    // Any property that may be observed must be set with these methods.
    set: function (prop, val) {
        if (val != mpd[prop]) {
            debug("Notify: mpd."+prop+" = "+val)
            mpd[prop] = val
            observerService.notifyObservers(null, prop, val)
        }
    },

    // Parse output from status command, internal use only.
    _update: function (data) {
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

        // React to and alter certain values.
        if (obj.state == 'stop') {
            obj.time = 0
        }
        else {
            obj.time = Nz(obj.time,'0').split(":")[0]
        }
        if (obj.song != mpd.song) {
            mpd.doCmd("currentsong", mpd._parseCurrentSong, true)
        }
        if (obj.playlist != mpd.playlist) {
            mpd.plinfo.length = obj.playlistlength
            mpd.doCmd("plchanges " + mpd.playlist, mpd._parsePL, true)
        }
        mpd.playlist = Nz(obj.playlist)
		if (mpd.updating_db) {
			if (!Nz(obj.updating_db)) {
				mpd.cache = {}
        		mpd.set('updating_db', null)
			}
		}

        //set status values
        mpd.set('volume', Nz(obj.volume))
        mpd.set('repeat', Nz(obj.repeat))
        mpd.set('random', Nz(obj.random))
        mpd.set('playlistlength', Nz(obj.playlistlength))
        mpd.set('xfade', Nz(obj.xfade))
        mpd.set('state', Nz(obj.state))
        mpd.set('song', Nz(obj.song))
        mpd.set('time', Nz(obj.time))
        mpd.set('bitrate', Nz(obj.bitrate))
        mpd.set('updating_db', Nz(obj.updating_db))

        mpd._doStatus = false
    },

    // Parse output from currentsong command, internal use only.
    _parseCurrentSong: function (data) {
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

        // React to and alter certain values.
        if (!Nz(obj.Title) && Nz(obj.file)) {
            obj.Title = obj.file.split("/").slice(-1)
        }

        //set currentsong values
        mpd.set('file', Nz(obj.file))
        mpd.set('Time', Nz(obj.Time))
        mpd.set('Artist', Nz(obj.Artist))
        mpd.set('Title', Nz(obj.Title))
        mpd.set('Album', Nz(obj.Album))
        mpd.set('Track', Nz(obj.Track))
        mpd.set('Date', Nz(obj.Date))
        mpd.set('Genre', Nz(obj.Genre))
        mpd.set('Composer', Nz(obj.Composer))
    },

    _parsePL: function (data) {
		data = data.split("\n")
		var dirty = false
        var dl = data.length
        if (dl > 0) {
            var n = dl
            do {
                var i = dl - n
                var sep = data[i].indexOf(": ")
                if (data[i].substr(0, sep) == 'file') {
                    var fname = data[i].slice(sep+2)
                    var song = {
                        'type': 'file',
                        'Name': fname,
                        'Title': fname,
                        'Artist': 'unknown',
                        'Album': 'unknown',
                        'Time': 0,
                        'Pos': 0
                    };
                    var d = data[i + 1]
                    while (d && d.substr(0, 6) != "file: ") {
                        var sep = d.indexOf(": ")
                        if (sep > 0) {
                            song[d.substr(0, sep)] = d.slice(sep + 2);
                        }
                        --n;
                        var d = data[dl - n + 1]
                    };
                    mpd.plinfo[parseInt(song.Pos)] = song
					dirty = true
                }
            }
            while (--n)
			if (dirty) {
				debug("Notify: mpd.plinfo = " + mpd.playlist)
				observerService.notifyObservers(null, "plinfo", mpd.playlist)
			}
        }
        var tm = 0
        var l = mpd.plinfo.length
        if (l > 0) {
            do {
                try {tm += parseInt(mpd.plinfo[l-1]['Time'])}
                catch (e) {debug(e)}
            } while (--l)
        }
        mpd.set("pltime", prettyTime(tm))
    },
	cache: {},
	query: function (URI, view, addrBox){
		/* Query mpd and return database results to nslTreeView view,
		 * then load addrBox.searchParam with appropriate autocomplete
		 * entries.
		 * 
		 * URI should be: return_tag_type://specifier or 
		 * return_tag_type://where_other_tag_type=specifier or
		 * an actual MPD command.
		 * 
		 * If '://' is not in string, it is assumed to be an MPD command.
		 */
		
	    var chkDupes = false
		var cmd = URI
		if (URI.indexOf("://") < 0) {
			// Clean up and validate command lists.
		    
			if (cmd.indexOf('command_list_begin') > -1) {
		        if  (cmd.indexOf('command_list_end') < 0) {
		            cmd += "\ncommand_list_end"
		        }
		    }
		    else if (cmd.indexOf(';') > -1) {
		        cmd = "command_list_begin;"+cmd
		        if  (cmd.indexOf('command_list_end') < 0) {
		            cmd += ";command_list_end"
		        }
				cmd = cmd.replace(/;/g,"\n")
		    }
			
			// Check if this command returns database results.
			// If so, check if it will return multiple sets that
			// will need to be combined.
			
	        var dbc = ["search ", "find ", "lsinfo", "plchanges ",
	                "list ", "listall", "listallinfo", "listplaylistinfo ",
	                "playlistsearch ", "playlistinfo", "playlistfind "]
	        var is_dbc = false
	        for (x in dbc) {
	            if (cmd.indexOf(dbc[x]) > -1) {
	                is_dbc = true
	            }
	        }
	        if (is_dbc) {
	            for (x in dbc) {
	                if (cmd.indexOf(dbc[x]) > -1) {
	                    chkDupes = true
	                }
	            }
	        }
	        if (!is_dbc) {
	            mpd.doCmd(cmd, null, false)
	            return null
	        }
		}
		else {
			// Not a command, proccess URI
			
			URI = URI.split("://")
			var type = URI[0]
			var id = Nz(URI[1], "")
			
			switch (type) {
				case "directory":
					var cmd = 'lsinfo  "' + id.replace(/"/g, '\\"') + '"';
					break;
				case "file":
					if (id.length==0){
						cmd = "listallinfo"
					}
					else if (id.indexOf("=") > 0) {
						id = id.split("=")
						cmd = 'find ' + id[0] + ' "' + id[1].replace(/"/g, '\\"') + '"';
					}
					else {
						mpd.doCmd('add "' + id.replace(/"/g, '\\"') + '"', null, false);
						return null;
					}
					break;
				case "playlist":
					if (id.length > 0) {
						cmd = 'listplaylistinfo  "' + id.replace(/"/g, '\\"') + '"';
					}
					else {
						cmd = 'lsinfo  "' + id.replace(/"/g, '\\"') + '"';
					}
					break;
				case "search":
					if (id.length > 0) {
						id = id.split("=")
						if (id.length == 1) {
							cmd = 'search any "' + id[0].replace(/"/g, '\\"') + '"';
						}
						else 
							if (id.length == 2) {
								cmd = 'search ' + id[0] + ' "' + id[1].replace(/"/g, '\\"') + '"';
							}
					}
					else {
						type = 'file'
						cmd = "listallinfo"
					}
					break;					
				default:
					cmd = 'list ' + type;
					if (id.length > 0) {
						id = id.split("=")
						if (id.length == 1) {
							cmd = 'find ' + type + ' "' + id[0].replace(/"/g, '\\"') + '"';
						}
						else 
							if (id.length == 2) {
								cmd = 'list ' + type + ' ' + id[0] + ' "' + id[1].replace(/"/g, '\\"') + '"';
							}
					}
					break;
			}
		}
		
		var cb = function(data){
			data = data.split("\n")
			var db = []
			var dl = data.length
			if (dl > 0) {
				var n = dl
				do {
					var i = dl - n
					var sep = data[i].indexOf(": ")
					if (sep > -1) {
						var fld = data[i].substr(0, sep)
						var val = data[i].slice(sep + 2)
						if (fld == 'file') {
							var song = {
								type: 'file',
								Name: val,
								Track: '0',
								Title: val,
								Artist: 'unknown',
								Album: 'unknown',
								Time: 0,
								URI: "file://" + val
							};
							var d = data[i + 1]
							while (d && d.substr(0, 6) != "file: ") {
								var sep = d.indexOf(": ")
								song[d.substr(0, sep)] = d.slice(sep + 2);
								--n;
								var d = data[dl - n + 1]
							};
							db.push(song);
						}
						else {
							if (fld == 'directory') {
								if (type == 'directory') {
									var dir = val.split("/")
									db.push({
										type: 'directory',
										Name: val,
										Title: dir[dir.length - 1],
										URI: "directory://" + val
									})
								}
							}
							else {
								db.push({
									type: fld,
									Name: val,
									Title: val,
									URI: fld.toLowerCase() + "://" + val
								})
							}
						}
					}
				}
				while (--n)
			}
			
			if (chkDupes) db = dbOR(db)
			var searchParam = ["Home"]
			if (Nz(type)) {
				searchParam.push(type+":/")
				if (Nz(URI[1])) {
					var dirs = URI[1].split("/")
					while (dirs.length > 0) {
						var l = searchParam[searchParam.length-1]
						searchParam.push(l+"/"+dirs.shift())
					}
				}
				searchParam[1] = type+"://"
			}
			for (x in db) {
				if (db[x].type != 'file') searchParam.push(db[x].URI)
			}
			searchParam = searchParam.toSource()
			
			if (URI != "playlist://") {
				mpd.cache[URI] = {
					db: db,
					searchParam: searchParam
				}
			}
			view.load(db, false)
			if (Nz(addrBox)) addrBox.searchParam = searchParam
		}
		
		var cache = Nz(mpd.cache[URI], false)
		if (cache) {
			view.load(cache.db, false)
			if (Nz(addrBox)) addrBox.searchParam = cache.searchParam
			return true
		}
		else {
			mpd.doCmd(cmd, cb, false)
			return true
		}
	}
}

function dbOR(db) {
    var rdb = []
    var dl = db.length
    if (dl < 1) {return db}
    var n = dl

    var srt = function(a,b) {
        if (a.Name.substr(i,1)<b.Name.substr(i,1)) return -1
        if (a.Name.substr(i,1)>b.Name.substr(i,1)) return 1
        return 0
    }

    db.sort(srt)
    do {
        var i = dl - n
        if (n==1) {rdb.push(db[i])}
        else if (db[i].Name != db[i+1].Name) {rdb.push(db[i])}
    } while (--n)
    return rdb
}

function loadSrvPref () {
    var srv = prefBranch.getCharPref("extensions.mpm.server");
    if (prefBranch.getPrefType("extensions.mpm.server") == prefBranch.PREF_STRING) {
        var srv = prefBranch.getCharPref("extensions.mpm.server");
        srv = srv.split(":", 3);
        if (srv.length == 3) {
            mpd._host = srv[0];
            mpd._port = parseInt(srv[1]);
            mpd._password = srv[2];
        }
    }
    else {
        prefBranch.setCharPref("extensions.mpm.server", '192.168.1.2:6600:')
        mpd._host = '192.168.1.2';
        mpd._port = 6600;
        mpd._password = '';
    }
}

function shorten(cmd){
    // Convert command_list to single line
    cmd = cmd.replace(/command_list.+?\n/g,"").replace(/\n/g,"; ")
    return cmd.substr(0, cmd.length-2)
}

function socketTalker() {
    try {
        var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"]
                                .getService(Components.interfaces.nsISocketTransportService);
        var transport = transportService.createTransport(null,0,mpd._host,mpd._port,null);
        var outstream = transport.openOutputStream(0,0,0);
        var instream = transport.openInputStream(0,0,0);
        const replacementChar = Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
        var utf_instream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                       .createInstance(Components.interfaces.nsIConverterInputStream);
        var utf_outstream = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                       .createInstance(Components.interfaces.nsIConverterOutputStream)

        utf_instream.init(instream, 'UTF-8', 1024, replacementChar);
        utf_outstream.init(outstream, 'UTF-8', 0, 0x0000)
    } catch (e) {
        debug(e)
        return null
    }

    var listener = {
        data: "",
        onStartRequest: function(request, context){
            mpd._idle = false
            debug('socketTalker for server '+mpd._host+":"+mpd._port+" created.")
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
            mpd._idle = false;
            mpd._socket = null
            debug('socketTalker for server '+mpd._host+":"+mpd._port+" destroyed.")
            mpd.set('greeting','Not Connected');
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
                    if (mpd._cmdQueue.length > 0) {
                        var snd = mpd._cmdQueue[0].outputData
                        if (!mpd._cmdQueue[0].hide) {
                            mpd.set('lastResponse', "OK");
                        }
                        else if (snd.slice(0,9) == "plchanges") {
                            mpd.set('lastResponse', "OK");
                        }
                        if (mpd._cmdQueue.length > 0 && mpd._cmdQueue[0].callBack) {
                            mpd._cmdQueue[0].callBack(this.data.slice(0,-3))
                        }
                        mpd._cmdQueue.shift()
                    }
                    this.data = ""
                    if (mpd._cmdQueue.length > 0) {
                        var snd = mpd._cmdQueue[0].outputData
                        utf_outstream.writeString(snd);
                        if (!mpd._cmdQueue[0].hide) {
                            mpd.set('lastCommand', shorten(snd));
                            mpd.set('lastResponse', "Working...");
                        }
                        else if (snd.slice(0,9) == "plchanges") {
                            mpd.set('lastResponse', "Working...");
                        }
                    }
                    else {
                        done = true
                    }
                }
                else
                    if (this.data.substr(0, 6) == "OK MPD") {
                        mpd.set('greeting', this.data)
                        this.data = ""
                        if (mpd._password.length > 0) {
                            mpd._cmdQueue.unshift({
                                outputData: 'password "'+mpd._password+'"\n',
                                callBack: null,
                                hide: true
                            })
                        }
                        if (mpd._cmdQueue.length > 0) {
                            var snd = mpd._cmdQueue[0].outputData
                            utf_outstream.writeString(snd);
                            if (!mpd._cmdQueue[0].hide) {
                                mpd.set('lastCommand', shorten(snd));
                                mpd.set('lastResponse', "Working...");
                            }
                            else if (snd.slice(0,9) == "plchanges") {
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
                            if (snd == "status\n") {
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
                    if (mpd._doStatus) {
                        mpd._doStatus = false
                        mpd._cmdQueue.push({
                            outputData: "status\n",
                            callBack: mpd._update,
                            hide: true
                        })
                        utf_outstream.writeString("status\n")
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
        cancel: function () {listener.onStopRequest()},
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
                if (mpd._socket) mpd.connect();
                break;
        }
    }
}

loadSrvPref()
myPrefObserver.register();

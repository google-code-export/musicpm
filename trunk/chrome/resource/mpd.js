/**
 * Music Player Minion Copyright 2008, Chris Seickel
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation; either version 2 of the License, or (at your option) any later
 * version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 */
Components.utils.import("resource://minion/mpmUtils.js");

let EXPORTED_SYMBOLS = ["dbQuery", "mpd"]

var lfId = nsMPM.prefs.get("lyricsfly_id","8890a06f973057f4b")

const NOSRV_STATUS = 2152398861
const LOSTC_STATUS = 2152398868

var default_servers = [["localhost", "localhost:6600:"]];

var mpd = {
    _host : null,
    _port : null,
    _password : null,
    
    // Output of status
    volume : null,
    repeat : null,
    random : null,
    playlistlength : 0,
    playlist : 0,
    xfade : null,
    state : null,
    song : null,
    songid : null,
    time : null,
    bitrate : null,
    updating_db : null,
    
    // Output of currentsong
    file : null,
    Time : null,
    Artist : null,
    Title : null,
    sbTitle : null,
    Album : null,
    Track : null,
    Date : null,
    Genre : null,
    Composer : null,
    currentsong : {}, // All values as object. Observe this if you need
                        // multiple properties.
    
    db_update : null,
    sec_ticks : 0,
    sec_synced : false,
    update_interval : nsMPM.prefs.get("update_interval", 200),
    adaptive_interval : nsMPM.prefs.get("adaptive_interval", true),
    playlistname : nsMPM.translateService.GetStringFromName("new_playlist"),
    
    // Playlist contents and total playtime
    plinfo : [],
    pltime : 0,
    prettytime: '',
    pl_lookup : {},
    
    // Connection state information
    greeting : nsMPM.translateService.GetStringFromName('not_connected'),
    last_command : '',
    lastResponse : '',
    _idle : false,
    _doStatus : true,
    _timer : null,
    _cmdQueue : [],
    _socket : null,
    
    cachedArt : [],
    cachedDB : [],
    servers : [["localhost", "localhost:6600:"]]
}

mpd._checkStatus = function() {
    nsMPM.mpd._doStatus = true
    var tm = (nsMPM.mpd.state != 'play') ? 1500 : nsMPM.mpd.update_interval
    if (nsMPM.mpd._timer) {
        nsMPM.mpd._timer.cancel()
    }
    if (!nsMPM.mpd._socket) {
        nsMPM.mpd._socket = socketTalker()
    }
    if (nsMPM.mpd._idle) {
        nsMPM.mpd.doCmd("ping", null, true)
    }
    if (nsMPM.mpd._socket) {
        var cb = {
            notify : function(tmr) {
                nsMPM.mpd._checkStatus()
            }
        }
        nsMPM.mpd._timer = Components.classes["@mozilla.org/timer;1"]
                .createInstance(Components.interfaces.nsITimer)
        nsMPM.mpd._timer.initWithCallback(cb, tm,
                Components.interfaces.nsITimer.TYPE_ONE_SHOT)
    }
}

// Parse output from currentsong nsMPM.mpd.doCmd, internal use only.
mpd._parseCurrentSong = function(data) {
    // parse the incoming data into a status object
    var obj = new Object()
    data = data.split("\n")
    var dl = data.length
    var pair
    do {
        var sep = data[dl - 1].indexOf(": ")
        if (sep > 0) {
            obj[data[dl - 1].substr(0, sep)] = data[dl - 1].slice(sep + 2)
        }
    } while (--dl)

    // React to and alter certain values.
    if (nsMPM.Nz(obj.file)) {
        if (nsMPM.Nz(obj.Title, '') == '') {
            if (nsMPM.prefs.get("guess_tags", false)) obj = nsMPM.guessTags(obj)
            else obj.Title = obj.file.split("/").pop()
        }
        obj.type = 'file'
        obj.name = obj.file
    }

    // set currentsong values
    nsMPM.mpd.set('Time', nsMPM.Nz(obj.Time))
    nsMPM.mpd.set('Artist', nsMPM.Nz(obj.Artist))
    nsMPM.mpd.set('Title', nsMPM.Nz(obj.Title))
    nsMPM.mpd.set('sbTitle', nsMPM.Nz(obj.Title))
    nsMPM.mpd.set('Album', nsMPM.Nz(obj.Album))
    nsMPM.mpd.set('Track', nsMPM.Nz(obj.Track))
    nsMPM.mpd.set('Date', nsMPM.Nz(obj.Date))
    nsMPM.mpd.set('Genre', nsMPM.Nz(obj.Genre))
    nsMPM.mpd.set('Composer', nsMPM.Nz(obj.Composer))
    nsMPM.mpd.set('currentsong', obj)
    nsMPM.mpd.set('file', nsMPM.Nz(obj.file))
}

mpd._parseDB = function(data) {
    data = data.split("\n")
    var db = []
    var dl = data.length
    var guess = nsMPM.prefs.get("guess_tags", false)
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
                        type : 'file',
                        file : val,
                        name : val,
                        Track : '',
                        Title : '',
                        Artist : '',
                        Album : '',
                        Time : 0,
                        Pos : null,
                        Id: null
                    };
                    var d = data[i + 1]
                    while (d && d.charCodeAt(0) < 97) {
                        var sep = d.indexOf(": ")
                        song[d.substr(0, sep)] = d.slice(sep + 2);
                        --n;
                        var d = data[dl - n + 1]
                    };
                    if (song.Title == '') {
                        if (guess) song = nsMPM.guessTags(song)
                        else song.Title = val.split("/").pop()
                    }
                    db.push(song);
                } else {
                    if (fld == 'directory') {
                        var dir = val.split("/")
                        db.push({
                            type : 'directory',
                            name : val,
                            Title : dir[dir.length - 1],
                            file : val
                        })
                    } else {
                        var x = {
                            type : fld,
                            name : val,
                            Title : val
                        }
                        x[fld] = val
                        db.push(x)
                    }
                }
            }
        } while (--n)
    }
    return db
}

mpd._parsePL = function(data) {
    try {
        nsMPM.debug("_parsePL: playlist="+mpd.playlist)
        var db = nsMPM.mpd._parseDB(data, false)
        if (db.length == 0) nsMPM.mpd._parseCurrentSong("")
        if (db.length > 0) {
            var i = db.length - 1
            do {
                nsMPM.mpd.plinfo[db[i].Pos] = db[i]
                nsMPM.mpd.pl_lookup[db[i].file] = db[i].Pos
            } while (i--)
        }
        var l = nsMPM.mpd.plinfo.length
        var tm = 0
        if (l > 0) {
            var n = l
            do {
                var item = nsMPM.Nz(nsMPM.mpd.plinfo[l - n])
                if (item)
                    tm += parseInt(nsMPM.mpd.plinfo[l - n].Time)
                else {
                    nsMPM.debug("Missing playlist item " + (l - n)
                            + " when calculating time.")
                    nsMPM.mpd.playlist = 0
                }
            } while (--n)
        }
        nsMPM.mpd.set("pltime", tm)
        nsMPM.observerService.notifyObservers(null, "plinfo", db.length)
        nsMPM.mpd.set("playlistlength", nsMPM.mpd.playlistlength)
        nsMPM.mpd.set("prettytime", nsMPM.prettyTime(tm))
        if (nsMPM.mpd.playlistlength == 0) {
            nsMPM.mpd.set("playlistname", nsMPM.translateService.GetStringFromName("new_playlist"))
        } else {
            if (nsMPM.mpd.playlistname == nsMPM.translateService.GetStringFromName("new_playlist")) nsMPM.mpd.guessPlaylistName()
        }
    } catch (e) {
        nsMPM.debug(e);
        nsMPM.mpd.playlist = 0
    }
}

// Parse output from status nsMPM.mpd.doCmd, internal use only.
mpd._update = function(data) {
    try {
        // parse the incoming data into a status object
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
        var t = nsMPM.Nz(obj.time, '0:0').split(":")
        if (obj.state == 'stop') {
            obj.time = 0
        } else {
            obj.time = t[0]
        }

        // Adaptive update intervals. Run updates at 200 ms until we are
        // updating in sync with the time, then switch to 1000 ms.
        if (nsMPM.mpd.state == 'play' && nsMPM.mpd.adaptive_interval) {
            if (obj.time == nsMPM.mpd.time) {
                nsMPM.mpd.sec_ticks++
            } else {
                if (nsMPM.mpd.update_interval == 1000) {
                    nsMPM.mpd.sec_synced = (nsMPM.mpd.sec_ticks < 2)
                } else {
                    nsMPM.mpd.sec_synced = (nsMPM.mpd.sec_ticks == 4)
                    nsMPM.mpd.sec_ticks = 0
                }
            }
            nsMPM.mpd.update_interval = (nsMPM.mpd.sec_synced) ? 1000 : 200
        }

        if (obj.songid != nsMPM.mpd.songid) {
            nsMPM.mpd.doCmd("currentsong", nsMPM.mpd._parseCurrentSong, true)
        } else {
            CS = false
            if (obj.song <= nsMPM.mpd.plinfo.length) {
                CS = nsMPM.Nz(nsMPM.mpd.plinfo[obj.song])
                if (CS.file.indexOf("://") > 0) {
                    if (CS.Title != nsMPM.mpd.Title){
                        nsMPM.mpd.doCmd("currentsong", nsMPM.mpd._parseCurrentSong, true)
                    }
                }
            }
        }
        nsMPM.mpd.playlist = nsMPM.Nz(nsMPM.mpd.playlist, 0)
        if (obj.playlist != nsMPM.mpd.playlist) {
            var l = parseInt(nsMPM.Nz(obj.playlistlength, 0))
            if (l < nsMPM.mpd.plinfo.length && nsMPM.Nz(nsMPM.mpd.pl_lookup)) {
                var new_lookup = {}
                for (x in nsMPM.mpd.pl_lookup) {
                    if (nsMPM.mpd.pl_lookup[x] < l) new_lookup[x] = nsMPM.mpd.pl_lookup[x]
                }
                nsMPM.mpd.pl_lookup = new_lookup
            }
            nsMPM.mpd.plinfo.length = l
            var cmd = (nsMPM.mpd.playlist > 0)
                    ? "plchanges " + nsMPM.mpd.playlist
                    : "playlistinfo"
            nsMPM.mpd.doCmd(cmd, nsMPM.mpd._parsePL, true)
        }
        nsMPM.mpd.playlist = nsMPM.Nz(obj.playlist)
        if (nsMPM.mpd.updating_db) {
            if (!nsMPM.Nz(obj.updating_db)) {
                nsMPM.mpd.set('updating_db', null)
                nsMPM.mpd.cachedDB = []
            }
        }

        // set status values
        nsMPM.mpd.set('volume', nsMPM.Nz(obj.volume))
        nsMPM.mpd.set('repeat', nsMPM.Nz(obj.repeat))
        nsMPM.mpd.set('random', nsMPM.Nz(obj.random))
        nsMPM.mpd.set('playlistlength', nsMPM.Nz(obj.playlistlength))
        nsMPM.mpd.set('xfade', nsMPM.Nz(obj.xfade))
        nsMPM.mpd.set('state', nsMPM.Nz(obj.state))
        nsMPM.mpd.set('song', nsMPM.Nz(obj.song))
        nsMPM.mpd.set('time', nsMPM.Nz(obj.time))
        nsMPM.mpd.set('bitrate', nsMPM.Nz(obj.bitrate))
        nsMPM.mpd.set('updating_db', nsMPM.Nz(obj.updating_db))
        nsMPM.mpd.set('db_update', nsMPM.Nz(obj.db_update))

        nsMPM.mpd._doStatus = false
    } catch (e) {
        nsMPM.debug(e)
    }
}

mpd.addToPlaylist = function(itemArray) {
    // Input should be an array of db objects or a single db object.
    if (typeof(itemArray[0]) != 'object')
        itemArray = [itemArray]
    var l = itemArray.length
    var cmd = "command_list_begin"
    var hasFiles = false
    for (var i = 0; i < l; i++) {
        var item = itemArray[i]
        if (item.type == 'file' || item.type == 'directory') {
            hasFiles = true
            cmd += '\nadd ' + nsMPM.Sz(item.name)
        } else {
            var q = new nsMPM.dbQuery()
            q.type = 'file'
            q.scope = item.type
            q.query = item.name
            q.callBack = function(db) {
                var dbl = db.length
                var c = "command_list_begin"
                for (var x = 0; x < dbl; x++) {
                    c += '\nadd ' + nsMPM.Sz(db[x].name)
                }
                nsMPM.mpd.doCmd(c + "\ncommand_list_end")
            }
            q.execute()
        }
    }
    if (hasFiles) {
        hasFiles = false
        nsMPM.mpd.doCmd(cmd + "\ncommand_list_end")
        cmd = "command_list_begin"
    }
}
// Connection methods
mpd.connect = function() {
    if (nsMPM.mpd._timer) {
        nsMPM.mpd._timer.cancel()
        nsMPM.mpd._timer = null
    }
    if (nsMPM.mpd._socket) {
        nsMPM.mpd._socket.cancel()
        nsMPM.mpd._socket = null
    }
    if (nsMPM.mpd._host && nsMPM.mpd._port) {
        nsMPM.mpd.set("playlistname", nsMPM.translateService.GetStringFromName("new_playlist"))
        nsMPM.mpd._checkStatus()
    } else
        nsMPM.mpd.set("lastResponse", nsMPM.translateService.GetStringFromName("server_not_selected"))
}

mpd.force_connect = function() { let that = this; that.loadSrvPref() }
mpd.disconnect = function() {
    if (nsMPM.mpd._timer) {
        nsMPM.mpd._timer.cancel()
        nsMPM.mpd._timer = null
    }
    if (nsMPM.mpd._socket) {
        nsMPM.mpd._socket.cancel()
        nsMPM.mpd._socket = null
    }
    nsMPM.mpd._host = null
    nsMPM.mpd._port = null
}

// Talk directlty to MPD, outputData must be properly escaped and quoted.
// callBack is optional, if left out or null and no socket is in use,
// a single use connection will be made for this nsMPM.mpd.doCmd.
mpd.doCmd = function(outputData, callBack, hide, priority) {
    
    hide = nsMPM.Nz(hide)
    priority = nsMPM.Nz(priority)
    if (/^rename\ |^rm\ |^save\ /m.test(outputData)) {
        callBack = function(d) {
            nsMPM.observerService.notifyObservers(null, 'playlists', null)
        }
    }
    if (/^\s*load\s/m.test(outputData)) {
        var name = /^\s*load\s+\"(.+)\"\s*$/m.exec(outputData)
        nsMPM.debug(outputData)
        if (name) {
            nsMPM.mpd.set("playlistname", name[1])
        }
    }
    if (priority) {
        nsMPM.debug("priority command: " + outputData)
        nsMPM.mpd._cmdQueue.unshift({
            outputData : outputData + "\n",
            callBack : nsMPM.Nz(callBack),
            hide : hide,
            sent : false
        })
    } else {
        nsMPM.mpd._cmdQueue.push({
            outputData : outputData + "\n",
            callBack : nsMPM.Nz(callBack),
            hide : hide,
            sent : false
        })
    }
    if (nsMPM.mpd._socket) {
        nsMPM.mpd._doStatus = true
        if (nsMPM.mpd._idle) {
            nsMPM.mpd._socket.writeOut(nsMPM.mpd._cmdQueue[0].outputData)
            if (!hide)
                nsMPM.mpd.set('last_command', outputData);
            nsMPM.mpd._idle = false
        }
    } else {
        nsMPM.mpd.connect()
    }
}

mpd.getAllDirs = function(callBack) {    
    if (!nsMPM.mpd._socket)
        nsMPM.mpd.connect()
    var cb = callBack
    nsMPM.mpd.doCmd("listall", function(d) {
        try {
            d = d.replace(/^file: .*\n/gm, "")
            d = d.replace(/^directory: /gm, "")
            d = d.replace(/^\//gm, "")
            dirs = d.split("\n").sort().slice(1)
            var hd = []
            var l = dirs.length
            if (l < 1) {
                nsMPM.debug("EMPTY getAllDirs() CALLBACK!");
                return []
            }
            var n = l
            do {
                var name = dirs[l - n]
                var path = name.split("/")
                var obj = {
                    Title : path.pop(),
                    level : path.length,
                    parent : path.join("/"),
                    name : name,
                    type : 'directory',
                    children : 0
                }
                if (obj.level > 0) {
                    for (var pi = hd.length - 1; pi > -1; pi--) {
                        if (hd[pi].name == obj.parent) {
                            hd[pi].children += 1
                            break
                        }
                    }
                }
                hd.push(obj)
            } while (--n)
            cb(hd)
        } catch (e) {
            nsMPM.debug(e)
        }
        return 'undefined';
    })
}

mpd.getArt = function(item, img) {
	var fallback = function (code, item, url) {
		try{
			if ( code == 200 || code == 0 ) {
				nsMPM.mpd.cachedArt[url] = url;
				img.setAttribute("tooltiptext",url);
				img.src = url;
				return;
			}
			if (nsMPM.prefs.get("use_amazon_art", 1) >= 1 ) {
				nsMPM.getAmazonArt(nsMPM.mpd, item, img);
			} else {
				img.src = "chrome://minion/content/images/album_blank.png";
				img.removeAttribute("tooltiptext");
			}
		} catch(e){ nsMPM.debug(e); }
	};

	try {
		if ( typeof(item.file) != 'string' ) {
			var art =  "chrome://minion/content/images/album_blank.png";
			img.src = art;
			img.setAttribute("tooltiptext",art);
			return;
		}

		var strFile = new String(item.file);
		if ( strFile.indexOf('http://') == 0 || strFile.indexOf('https://') == 0 ) {
			var art =  "chrome://minion/content/images/internet_music.png";
			img.src = art;
			img.setAttribute("tooltiptext",art);
			return;
		}
		
		img.src = "chrome://minion/content/images/album_loading.png";
		img.setAttribute("tooltiptext","...");
		
		if (nsMPM.prefs.get("use_custom_art", false)) {
			var url = nsMPM.urlReplace(nsMPM.prefs.get("custom_art_url"), item)
			nsMPM.debug("Attempting to fetch cover at " + url);
			if (typeof(nsMPM.mpd.cachedArt[url]) != 'string') nsMPM.prefetchImageFromURL(url, fallback, item);
			else {
				img.setAttribute("tooltiptext",url);
				img.src = url;
			}
		} else {
			fallback(404, item);
		}
	} catch(e) { nsMPM.debug(e); }
}

mpd.guessPlaylistName = function () {
    var playlists = []
    var aCurPL = []
    var plinfo = nsMPM.mpd.plinfo
    
    for (x=0, l=plinfo.length; x<l; x++) {
        aCurPL.push(plinfo[x].file)
    }
    var currentPL = "file: " + aCurPL.join("\nfile: ") + "\n"
    
    var nextPL = function () {
        pl = playlists.shift().replace(/"/g, '\\"')
        nsMPM.mpd.doCmd('listplaylist "'+pl+'"', function(data){
            if (data==currentPL) {
                nsMPM.mpd.set("playlistname", pl)
            } else {
                if (playlists.length > 0) nextPL()
            }
        }, false)
    }
    
    var q = new nsMPM.dbQuery()
    q.type = "playlist"
    q.query = ""
    q.execute(function(db){
        for (i in db) playlists.push(db[i].Title)
        if (playlists.length > 0) nextPL()
    })
}
    
mpd.searchLyrics = function (q, origCallBack) {
    q = q.replace(/[^A-Za-z0-9]/g, '%')
    var url = "http://lyricsfly.com/api/txt-api.php?i={id}&i=" + q
    url = url.replace("{id}", "14f6b319c854ca8a8-temporary.API.access")
    //url = url.replace("{id}", nsMPM.prefs.get("lyricsfly_id",""))
    //url = url.replace("{amo}", "addons.mozilla.org/en-US/firefox/addon/6324")
    
    var cb = function(data) {
        try {
            var ar = data.getElementsByTagName("ar")
            var tt = data.getElementsByTagName("tt")
            nsMPM.debug(tt)
            var artists = []
            var titles = []
            var cmd = null
            if (tt) {
                cmd = "command_list_begin\n"
                for (i=0;i<tt.length;i++) {
                    titles.push(tt[i].textContent)
                    artists.push(ar[i].textContent)
                    cmd += 'find title "'+titles[i]+'"\n'
                }
                cmd += "command_list_end\n"
            }
        }
        catch (e) {nsMPM.debug(e)}
        if (cmd) {
            nsMPM.debug(cmd)
            var db_cb = function (d) {
                var db = nsMPM.mpd._parseDB(d)
                nsMPM.debug(d)
                for (i=0;i<db.length;i++) {
                    var x = titles.indexOf(db[i].Title)
                    if (x > -1 && db[i].Artist != artists[x]) {
                        db.splice(i,1)
                    }
                }
                origCallBack(db)
            }
            nsMPM.mpd.doCmd(cmd, db_cb)
        }
    }
    nsMPM.debug(url)
    nsMPM.fetch(url, cb, null, true)
}

mpd.getLyrics = function (item, txtLyrics, btnEdit) {
    if (!nsMPM.Nz(item.Artist)) {
        txtLyrics.value = nsMPM.translateService.GetStringFromName("no_lyrics_found");
        btnEdit.edit_link = "http://lyricsfly.com/submit/"
        return
    }
    var cb = function(data) {
        var lyrics = nsMPM.translateService.GetStringFromName("no_lyrics");
        try {
            var tx = data.getElementsByTagName("tx")
            if (nsMPM.Nz(tx[0])) {
                var lyrics = tx[0].textContent.replace(/\[br\]/g,"")
                var cs = data.getElementsByTagName("cs")
                var id = data.getElementsByTagName("id")
                if (nsMPM.Nz(cs[0]) && nsMPM.Nz(id[0]) && nsMPM.Nz(btnEdit)) {
                    var ed = "http://lyricsfly.com/search/correction.php?[CHECKSUM]&id=[SONG ID]"
                    ed = ed.replace("[CHECKSUM]", cs[0].textContent)
                    ed = ed.replace("[SONG ID]", id[0].textContent)
                    btnEdit.edit_link = ed
                }
            }
        }
        catch (e) {nsMPM.debug(e)}
        finally { txtLyrics.value = lyrics }
    }
    var url = "http://lyricsfly.com/api/api.php?i={id}-{amo}&a={Artist}&t={Title}"
    // Please do not attempt to use this user id for api access.
    // It is easy to obtain your own id, please see http://lyricsfly.com/api/
    url = url.replace("{id}", nsMPM.prefs.get("lyricsfly_id",""))
    url = url.replace("{amo}", "addons.mozilla.org/en-US/firefox/addon/6324")
    url = url.replace("{Artist}", nsMPM.Nz(item.Artist, '').replace(/[^A-Za-z0-9]/g, '%'))
    url = url.replace("{Title}", nsMPM.Nz(item.Title, '').replace(/[^A-Za-z0-9]/g, '%'))
    txtLyrics.value = nsMPM.translateService.GetStringFromName("searching_lyrics");
    btnEdit.edit_link = "http://lyricsfly.com/submit/"
    nsMPM.fetch(url, cb, null, true)
}

mpd.getOutputs = function(callBack) {
    var cb = function(data) {
        // Parse the incoming data into an array of output objects
        var obj = []
        data = data.split("\n")
        var dl = data.length - 2
        for (var i = 0; i < dl; i++) {
            var sep = data[i].indexOf(": ")
            if (sep > 0) {
                var idx = data[i].slice(sep + 2)
                var name = "unknown"
                var enabled = false
                sep = data[++i].indexOf(": ")
                if (sep > 0) {
                    name = data[i].slice(sep + 2)
                    sep = data[++i].indexOf(": ")
                    if (sep > 0) {
                        enabled = (data[i].slice(sep + 2) == 1) ? true : false
                    }
                }
                obj[idx] = {
                    id : idx,
                    name : name,
                    enabled : enabled
                }
            }
        }
        callBack(obj)
    }
    nsMPM.mpd.doCmd('outputs', cb)
}

mpd.setServers = function(servers) {
	nsMPM.mpd.set('servers', servers);
	try {
		var file = nsMPM.DirIO.get(nsMPM.pref_dir);
		file.append(nsMPM.pref_file_servers);
		if (!file.exists()) {
			nsMPM.FileIO.create(file);
		}
		var str = nsMPM.JSON.stringify(nsMPM.mpd.servers);
		nsMPM.FileIO.write(file, str);
		file = null;
	} catch(e) { nsMPM.debug(e); }
}

mpd.loadServers = function() {
	var file = nsMPM.DirIO.get(nsMPM.pref_dir);
	file.append(nsMPM.pref_file_servers);
	if (file.exists()) {
		nsMPM.debug("Reading server nsMPM.prefs from: "+file.path);
		var str = nsMPM.FileIO.read(file);
		nsMPM.mpd.servers = nsMPM.JSON.parse(str);
	} else {
		// creating default server
		var s,p;
		if ( nsMPM.env.exists('MPD_HOST') ) {
			s = nsMPM.env.get('MPD_HOST');
			if ( nsMPM.env.exists('MPD_PORT')) {
				p = nsMPM.env.get('MPD_PORT');
			} else {
				p = 6600; // this is the default mpd port
			}
			nsMPM.debug('Found MPD environment settings');
			nsMPM.mpd.servers = [[s, s+':'+p+':']]
			nsMPM.mpd.setServers(nsMPM.mpd.servers);
			nsMPM.prefs.set("server",nsMPM.mpd.servers[0][1]);
		} else {
			nsMPM.debug("Creating default servers.");
			nsMPM.mpd.servers = default_servers;
			nsMPM.mpd.setServers(nsMPM.mpd.servers);
			nsMPM.prefs.set("server",nsMPM.mpd.servers[0][1]);
		}
	}
	file = null;
}

// Any property that may be observed must be set with this method.
mpd.set = function(prop, val) {
    if (val != nsMPM.mpd[prop]) {
        //nsMPM.debug("Notify: nsMPM.mpd."+prop+" = "+val)
        nsMPM.mpd[prop] = val
        nsMPM.observerService.notifyObservers(null, prop, val)
    }
}

mpd.toggleRandom = function() {
    var state = (nsMPM.mpd.random > 0) ? 0 : 1
    nsMPM.mpd.doCmd("random " + state)
}

mpd.toggleRepeat = function() {
    var state = (nsMPM.mpd.repeat > 0) ? 0 : 1
    nsMPM.mpd.doCmd("repeat " + state)
}

mpd.load_pls_stream = function(data, action) {
	try {
		var itemCount=0;
		if (typeof(action) == 'undefined') action = "add";
		var urls = data.match(/(?:File\d+=)(.+)(?:[\n|\r])/ig)
		var cmd = 'command_list_begin'
		if (action == "replace") cmd += "\nclear";
		for (x in urls) {
			var u = urls[x].replace("\n", "").replace(/File\d+=/gi, "")
			if (u.length > 0) {
				cmd += '\nadd ' + u;
				itemCount++;
			}
		}
		cmd += '\ncommand_list_end'
		nsMPM.mpd.doCmd(cmd)
	} catch(e){ nsMPM.debug(e); }
	return itemCount;
}

mpd.load_m3u_stream = function(data, action) {
	try {
		var itemCount=0;
		if (typeof(action) == 'undefined') action = "add"
		urls = data.replace(/^#.+$/mg, "").replace(/\r/mg,'').split("\n")
		var cmd = 'command_list_begin';
		if (action == "replace") cmd += "\nclear";
		for (x in urls) {
			var u = urls[x];
			if (u.length > 0) {
				cmd += '\nadd ' + u;
				itemCount++;
			}
		}
		cmd += '\ncommand_list_end';
		nsMPM.mpd.doCmd(cmd);
	} catch(e){ nsMPM.debug(e); }
	return itemCount;
}

mpd.load_xspf_stream = function(data, action) {
	try {
		var itemCount=0;
		if (typeof(action) == 'undefined') action = "add";
		urls = data.getElementsByTagName("location");
		var cmd = 'command_list_begin';
		if (action == "replace") cmd += "\nclear";
		for (var x=0; x < urls.length; x++) {
			var u = urls.item(x);
			if ( u.textContent.length > 0 ) {
				cmd += '\nadd ' + u.textContent;
				itemCount++;
			}
		}
		cmd += '\ncommand_list_end';
		nsMPM.mpd.doCmd(cmd);
	} catch(e){ nsMPM.debug(e); }
	return itemCount;
}

mpd.prefObserver = {
	obs: null,
	register : function() {
		this.obs = nsMPM.prefs.getObserver("server",nsMPM.mpd.loadSrvPref);
	},
	unregister : function() {
		this.obs.unregister();
	}
}

mpd.loadSrvPref = function() {
	var srv = ''
	if (nsMPM.prefs.isPref("server") == true) {
		var srv = nsMPM.prefs.get("server",default_servers[0]);
	}
	nsMPM.debug('srv = '+srv)
	if (srv > '') {
		srv = srv.split(":", 3);
		var cb = function() {
			nsMPM.mpd._cmdQueue = [];
			if (srv.length == 3) {
				nsMPM.mpd._host = srv[0];
				nsMPM.mpd._port = parseInt(srv[1]);
				nsMPM.mpd._password = srv[2];
				nsMPM.mpd.connect();
				nsMPM.observerService.notifyObservers(null, "new_mpd_server", srv[0] + ":" + srv[1]);
			} else {
				nsMPM.mpd._host = null;
				nsMPM.mpd._port = null;
				nsMPM.observerService.notifyObservers(null, "new_mpd_server", null);
			}
		}
		var timer = Components.classes["@mozilla.org/timer;1"]
					.createInstance(Components.interfaces.nsITimer);
		nsMPM.mpd.disconnect();
		timer.initWithCallback(cb, 100, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
	} else {
		nsMPM.debug("No server, disconnecting.");
		nsMPM.mpd.disconnect();
	}
}

function socketTalker() {
    if (nsMPM.mpd._port <= '' || nsMPM.mpd._host <= '') return null
    nsMPM.debug("enter socketTalker")
    nsMPM.mpd.set('greeting', 'Connecting...');
    var initialized = false
    var regGreet = /OK MPD [0-9\.]+\n/gm
    try {
        var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"]
                .getService(Components.interfaces.nsISocketTransportService);
        var transport = transportService.createTransport(null, 0, nsMPM.mpd._host,
                nsMPM.mpd._port, null);
        var outstream = transport.openOutputStream(0, 0, 0);
        var instream = transport.openInputStream(0, 0, 0);
        const replacementChar = Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
        var utf_instream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                .createInstance(Components.interfaces.nsIConverterInputStream);
        var utf_outstream = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                .createInstance(Components.interfaces.nsIConverterOutputStream)

        utf_instream.init(instream, 'UTF-8', 1024, replacementChar);
        utf_outstream.init(outstream, 'UTF-8', 0, 0x0000)
    } catch (e) {
        nsMPM.mpd._host = null
        nsMPM.mpd._port = null
        nsMPM.mpd._password = null
        nsMPM.mpd.disconnect()
        return null
    }

    var listener = {
        data : "",
        onStartRequest : function(request, context) {
            nsMPM.mpd._idle = false
            nsMPM.mpd.cachedDB = []
            initialized = false
            nsMPM.debug('socketTalker for server ' + nsMPM.mpd._host + ":" + nsMPM.mpd._port
                    + " created.")
            nsMPM.mpd.set('greeting', nsMPM.translateService.GetStringFromName('connecting'));
        },
        onStopRequest : function(request, context, status) {
            this.data = null
            nsMPM.debug('socketTalker for server ' + nsMPM.mpd._host + ":" + nsMPM.mpd._port
                    + " destroyed.")
            nsMPM.debug('close status = ' + status)
            nsMPM.mpd._socket = null
            nsMPM.mpd.set('greeting', nsMPM.translateService.GetStringFromName('not_connected'));
            if (status == NOSRV_STATUS) {
                nsMPM.mpd._host = null
                nsMPM.mpd._port = null
                nsMPM.mpd._password = null
                nsMPM.debug("Killing socket")
            }
        },
        onDataAvailable : function(request, context, inputStream, offset, count) {
            try {
                nsMPM.mpd._idle = false
                var str = {};
                var chunks = []
                var chlen = 0
                var done = false
                while (utf_instream.readString(4096, str) != 0) {
                    chunks[chlen++] = str.value
                }
                this.data += chunks.join("")
                str = null
                if (!initialized) {
                    var greet = this.data.match(regGreet)
                    if (greet) {
                        initialized = true
                        this.data = this.data.replace(regGreet, "")
                        nsMPM.mpd.set('greeting', "MPD@" + nsMPM.mpd._host
                                + ":" + nsMPM.mpd._port)
                        if (nsMPM.mpd._password.length > 0) {
                            nsMPM.mpd._cmdQueue.unshift({
                                outputData : 'password "' + nsMPM.mpd._password
                                        + '"\n',
                                callBack : null,
                                hide : true
                            })
                        }
                        if (nsMPM.mpd._cmdQueue.length > 0) {
                            var snd = nsMPM.mpd._cmdQueue[0].outputData
                            utf_outstream.writeString(snd);
                            if (!nsMPM.mpd._cmdQueue[0].hide) {
                                nsMPM.mpd.set('last_command', snd);
                                nsMPM.mpd.set('lastResponse', nsMPM.translateService.GetStringFromName("working"));
                            } else if (snd.slice(0, 9) == "plchanges") {
                                nsMPM.mpd.set('lastResponse', nsMPM.translateService.GetStringFromName("working"));
                            }
                        } else {
                            done = true
                        }
                        nsMPM.observerService.notifyObservers(null, "new_connection",
                                null)
                    }
                }
                if (this.data.substr(-3) == "OK\n") {
                    var cdata = this.data.split(/^OK\n/gm)
                    this.data = ""
                    while (cdata.length > 1) {
                        var d = cdata.shift()
                        if (nsMPM.mpd._cmdQueue.length > 0) {
                            var snd = nsMPM.mpd._cmdQueue[0].outputData
                            if (!nsMPM.mpd._cmdQueue[0].hide) {
                                nsMPM.mpd.set('lastResponse', "OK");
                            } else if (snd.slice(0, 9) == "plchanges") {
                                nsMPM.mpd.set('lastResponse', "OK");
                            }
                            if (nsMPM.mpd._cmdQueue[0].callBack) {
                                nsMPM.mpd._cmdQueue[0].callBack(d)
                            }
                            nsMPM.mpd._cmdQueue.shift()
                        }
                    }
                    if (nsMPM.mpd._cmdQueue.length > 0) {
                        var snd = nsMPM.mpd._cmdQueue[0].outputData
                        utf_outstream.writeString(snd);
                        if (!nsMPM.mpd._cmdQueue[0].hide) {
                            nsMPM.mpd.set('last_command', snd);
                            nsMPM.mpd.set('lastResponse', nsMPM.translateService.GetStringFromName("working"));
                        } else if (snd.slice(0, 9) == "plchanges") {
                            nsMPM.mpd.set('lastResponse', nsMPM.translateService.GetStringFromName("working"));
                        }
                    } else {
                        done = true
                    }
                } else if (this.data.indexOf('ACK [') != -1) {
                    nsMPM.mpd.set('lastResponse', this.data.replace(/\n/g, ""))
                    nsMPM.mpd._cmdQueue.shift()
                    done = true
                }

                if (done) {
                    if (nsMPM.mpd._doStatus) {
                        nsMPM.mpd._doStatus = false
                        nsMPM.mpd._cmdQueue.push({
                            outputData : "command_list_begin\nstatus\nstats\ncommand_list_end\n",
                            callBack : nsMPM.mpd._update,
                            hide : true,
                            sent : true
                        })
                        utf_outstream.writeString("command_list_begin\nstatus\nstats\ncommand_list_end\n")
                    } else {
                        nsMPM.mpd._idle = true
                    }
                }
            } catch (e) {
                nsMPM.mpd._host = null
                nsMPM.mpd._port = null
                nsMPM.mpd.disconnect()
                nsMPM.debug(e)
            }
        }
    }

    var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"]
            .createInstance(Components.interfaces.nsIInputStreamPump);
    pump.init(instream, -1, -1, 0, 0, false);
    pump.asyncRead(listener, null);

    var con = {
        cancel : function() {
            nsMPM.debug("Cancel socket")
            transport.close(0)
        },
        writeOut : function(str) {
            if (initialized)
                utf_outstream.writeString(str)
        }
    }

    return con
} // end socketTalker()


function dbQuery(cmd, callBack) {
    this.cmd = nsMPM.Nz(cmd);
    this.path = [];
    this.type = 'directory';
    this.scope = null;
    this.query = null;
    this.restrict = null;
    this.filterField = null;
    this.filterQuery = null;
    this.callBack = nsMPM.Nz(callBack);
    this.dbMatches = null;
}

dbQuery.prototype.evaluate = function() {
    if (this.cmd) {
        var cmd = this.cmd
        // Clean up and validate nsMPM.mpd.doCmd lists.
        if (cmd.indexOf('command_list_begin') > -1) {
            if (cmd.indexOf('command_list_end') < 0) {
                cmd += "\ncommand_list_end"
            }
        } else if (cmd.indexOf(';') > -1) {
            cmd = "command_list_begin;" + cmd
            if (cmd.indexOf('command_list_end') < 0) {
                cmd += ";command_list_end"
            }
            cmd = cmd.replace(/;/g, "\n")
        }

        // Check if this nsMPM.mpd.doCmd returns database results.
        // If so, check if it will return multiple sets that
        // will need to be combined.
        var re = /^.*search |^.*find |^.*info|^plchanges |^list.* /gm
        this.dbMatches = cmd.match(re)
        this.cmd = cmd
        return cmd
    }

    switch (this.type) {
        case 'search' :
            this.cmd = "search";
            this.path = [{
                type : "search",
                Title : "Search (" + this.scope + "): " + this.query,
                name : this.query
            }];
            break;
        case 'playlistsearch' :
            this.cmd = "playlistsearch";
            this.path = [{
                type : "playlistsearch",
                Title : "Search Playlist (" + this.scope + "): " + this.query,
                name : this.query
            }];
            break;
        case 'directory' :
            this.cmd = "lsinfo";
            this.path = [{
                type : 'directory',
                Title : "Folders",
                name : ""
            }];
            if (nsMPM.Nz(this.query, "") == "") {
                this.restrict = ["directory", "file"];
            }
            var p = this.query.split("/");
            if (p.length > 0) {
                for (var i = 0; i < p.length; i++) {
                    if (p[i] > "") {
                        this.path.push({
                                    type : 'directory',
                                    Title : p[i],
                                    name : p.slice(0, i + 1).join("/")
                                })
                    }
                }
            }
            break;
        case 'file' :
            this.cmd = "find";
            this.path = [{
                type : this.scope,
                Title : this.scope + "s",
                name : ""
            }, {
                type : this.scope,
                Title : this.query,
                name : this.query
            }];
            break;
        case 'playlist' :
            this.path = [{
                type : "playlist",
                Title : "Playlists",
                name : ""
            }];
            if (nsMPM.Nz(this.query, "") == "") {
                this.cmd = "lsinfo";
                this.restrict = "playlist";
            } else {
                this.cmd = "listplaylistinfo";
                this.path.push({
                            type : "playlist",
                            Title : this.query,
                            name : this.query
                        });
            }
            ;
            break;
        case 'current_playlist' :
            this.path = [{
                type : "playlist",
                Title : "Playlists",
                name : ""
            }];
            break;
        default :
            this.cmd = "list " + this.type;
            this.path = [{
                type : this.type,
                Title : this.type + "s",
                name : ""
            }];
            break;
    }
    if (this.scope)
        this.cmd += " " + this.scope;
    if (this.query)
        this.cmd += " " + nsMPM.Sz(this.query);
    this.dbMatches = 1
    return 'undefined';
}

dbQuery.prototype.execute = function(callBack) {
    if (!nsMPM.mpd._socket) {
        nsMPM.mpd.connect()
        nsMPM.debug("dbQuery forcing connect.")
    }
    callBack = nsMPM.Nz(callBack, this.callBack)
    this.evaluate()
    var cmd = this.cmd
    var path = this.path
    var restrict = this.restrict
    var useCache = !(this.type == 'playlist' || this.restrict)

    if (nsMPM.Nz(nsMPM.mpd.cachedDB[cmd])) {
        nsMPM.debug("cached: " + cmd)
        callBack(nsMPM.mpd.cachedDB[cmd])
        return null
    }

    if (!this.dbMatches) {
        nsMPM.mpd.doCmd(cmd, null, false)
        return null
    } else {
        var chkDupes = (this.dbMatches.length > 1)
    }

    if (this.filterField) useCache = false
    var filterField = this.filterField
    var filterQuery = this.filterQuery
    var isPlaylists = (this.type=='playlist' && this.query=='')
    nsMPM.mpd.doCmd(cmd, function(d) {
        var db = nsMPM.mpd._parseDB(d)
        if (restrict)
            db = dbFilter(db, restrict)
        if (chkDupes)
            db = dbDistinct(db)
        if (nsMPM.prefs.get("linguistic_sort", true) || isPlaylists) db.sort(nsMPM.smartsort)
        if (useCache && db.length > 0)
            nsMPM.mpd.cachedDB[cmd] = db
        if (filterField) {
            db = [x for each  (x in db) if (x[filterField]==filterQuery)]
        }
        callBack(db, path)
    }, false)
    return true
}


function dbDistinct(db) {
    var rdb = []
    var dl = db.length
    if (dl < 1) {
        return db
    }
    var n = dl

    var srt = function(a, b) {
        if (a.name < b.name)
            return -1
        if (a.name > b.name)
            return 1
        return 0
    }

    db.sort(srt)
    do {
        var i = dl - n
        if (n == 1) {
            rdb.push(db[i])
        } else if (db[i].name != db[i + 1].name) {
            rdb.push(db[i])
        }
    } while (--n)
    return rdb
}

function dbFilter(db, restrict) {
    var rdb = []
    var dl = db.length
    if (dl < 1) {
        return db
    }
    if (typeof(restrict) == 'string')
        restrict = [restrict]
    for (var i = 0; i < restrict.length; i++) {
        var n = dl
        var r = restrict[i]
        do {
            if (db[dl - n].type == r) {
                rdb.push(db[dl - n])
            }
        } while (--n)
    }
    return rdb
}


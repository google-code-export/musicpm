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
Components.utils.import("resource://minion/mpmUpgrade.js");
Components.utils.import("resource://minion/io.js");
Components.utils.import("resource://minion/JSON.js");

EXPORTED_SYMBOLS = ["dbQuery", "mpd", "prefBranch", "Sz", "loadSrvPref", "myPrefObserver"]
var prefService = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService);
var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);

var lfId = prefs.get("lyricsfly_id","8890a06f973057f4b")

const NOSRV_STATUS = 2152398861
const LOSTC_STATUS = 2152398868

var default_servers = [["localhost", "localhost:6600:"]];

var pref_dir = "ProfD"; // http://mxr.mozilla.org/seamonkey/source/xpcom/io/nsAppDirectoryServiceDefs.h
var pref_file = "mpm_servers.js";

function smartsort (a,b) {
    if (a.type != b.type) {
        if (a.type>b.type) return 1
        if (a.type<b.type) return -1
    }
    var column = "name"     
    if (isNaN(a[column]+b[column])) {
        var al = a[column].toLowerCase()
        var bl = b[column].toLowerCase()
        if (al>bl) return 1
        if (al<bl) return -1
        return 0
    }
    else { return a[column]-b[column]}
}

function dbQuery(cmd, callBack) {
    this.cmd = Nz(cmd)
    this.path = []
    this.type = 'directory'
    this.scope = null
    this.query = null
    this.restrict = null
    this.filterField = null
    this.filterQuery = null
    this.callBack = Nz(callBack)
    this.dbMatches = null
}

dbQuery.prototype.evaluate = function() {
    if (this.cmd) {
        var cmd = this.cmd
        // Clean up and validate mpd.doCmd lists.
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

        // Check if this mpd.doCmd returns database results.
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
            if (Nz(this.query, "") == "") {
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
            if (Nz(this.query, "") == "") {
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
        this.cmd += " " + Sz(this.query);
    this.dbMatches = 1
}

dbQuery.prototype.execute = function(callBack) {
    if (!mpd._socket) {
        mpd.connect()
        debug("dbQuery forcing connect.")
    }
    callBack = Nz(callBack, this.callBack)
    this.evaluate()
    var cmd = this.cmd
    var path = this.path
    var restrict = this.restrict
    var useCache = !(this.type == 'playlist' || this.restrict)

    if (Nz(mpd.cachedDB[cmd])) {
        debug("cached: " + cmd)
        callBack(mpd.cachedDB[cmd])
        return null
    }

    if (!this.dbMatches) {
        mpd.doCmd(cmd, null, false)
        return null
    } else {
        var chkDupes = (this.dbMatches.length > 1)
    }

    if (this.filterField) useCache = false
    var filterField = this.filterField
    var filterQuery = this.filterQuery
    var isPlaylists = (this.type=='playlist' && this.query=='')
    mpd.doCmd(cmd, function(d) {
        var db = mpd._parseDB(d)
        if (restrict)
            db = dbFilter(db, restrict)
        if (chkDupes)
            db = dbDistinct(db)
        if (prefs.get("linguistic_sort", true) || isPlaylists) db.sort(smartsort)
        if (useCache && db.length > 0)
            mpd.cachedDB[cmd] = db
        if (filterField) {
            db = [x for each  (x in db) if (x[filterField]==filterQuery)]
        }
        callBack(db, path)
    }, false)
    return true
}

function Sz(str) {
    /* Prepare strings for mpd socket communications */
    if (typeof(str) == "string")
        return '"' + str.replace(/\"/g, '\\"') + '"'
    return "''"
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
    update_interval : prefs.get("update_interval", 200),
    adaptive_interval : prefs.get("adaptive_interval", true),
    playlistname : translateService.GetStringFromName("new_playlist"),

    // Playlist contents and total playtime
    plinfo : [],
    pltime : 0,
    prettytime: '',
    pl_lookup : {},

    // Connection state information
    greeting : translateService.GetStringFromName('not_connected'),
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
    mpd._doStatus = true
    var tm = (mpd.state != 'play') ? 1500 : mpd.update_interval
    if (mpd._timer) {
        mpd._timer.cancel()
    }
    if (!mpd._socket) {
        mpd._socket = socketTalker()
    }
    if (mpd._idle) {
        mpd.doCmd("ping", null, true)
    }
    if (mpd._socket) {
        var cb = {
            notify : function(tmr) {
                mpd._checkStatus()
            }
        }
        mpd._timer = Components.classes["@mozilla.org/timer;1"]
                .createInstance(Components.interfaces.nsITimer)
        mpd._timer.initWithCallback(cb, tm,
                Components.interfaces.nsITimer.TYPE_ONE_SHOT)
    }
}

// Parse output from currentsong mpd.doCmd, internal use only.
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
    if (Nz(obj.file)) {
        if (Nz(obj.Title, '') == '') {
            if (prefs.get("guess_tags", false)) obj = guessTags(obj)
            else obj.Title = obj.file.split("/").pop()
        }
        obj.type = 'file'
        obj.name = obj.file
    }

    // set currentsong values
    mpd.set('Time', Nz(obj.Time))
    mpd.set('Artist', Nz(obj.Artist))
    mpd.set('Title', Nz(obj.Title))
    mpd.set('Album', Nz(obj.Album))
    mpd.set('Track', Nz(obj.Track))
    mpd.set('Date', Nz(obj.Date))
    mpd.set('Genre', Nz(obj.Genre))
    mpd.set('Composer', Nz(obj.Composer))
    mpd.set('currentsong', obj)
    mpd.set('file', Nz(obj.file))
}

mpd._parseDB = function(data) {
    data = data.split("\n")
    var db = []
    var dl = data.length
    var guess = prefs.get("guess_tags", false)
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
                        if (guess) song = guessTags(song)
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
        debug("_parsePL: playlist="+mpd.playlist)
        var db = mpd._parseDB(data, false)
        if (db.length == 0) mpd._parseCurrentSong("")
        if (db.length > 0) {
            var i = db.length - 1
            do {
                mpd.plinfo[db[i].Pos] = db[i]
                mpd.pl_lookup[db[i].file] = db[i].Pos
            } while (i--)
        }
        var l = mpd.plinfo.length
        var tm = 0
        if (l > 0) {
            var n = l
            do {
                var item = Nz(mpd.plinfo[l - n])
                if (item)
                    tm += parseInt(mpd.plinfo[l - n].Time)
                else {
                    debug("Missing playlist item " + (l - n)
                            + " when calculating time.")
                    mpd.playlist = 0
                }
            } while (--n)
        }
        mpd.set("pltime", tm)
        observerService.notifyObservers(null, "plinfo", db.length)
        mpd.set("playlistlength", mpd.playlistlength)
        mpd.set("prettytime", prettyTime(tm))
        if (mpd.playlistlength == 0) {
            mpd.set("playlistname", translateService.GetStringFromName("new_playlist"))
        } else {
            if (mpd.playlistname == translateService.GetStringFromName("new_playlist")) mpd.guessPlaylistName()
        }
    } catch (e) {
        debug(e);
        mpd.playlist = 0
    }
}

// Parse output from status mpd.doCmd, internal use only.
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
        var t = Nz(obj.time, '0:0').split(":")
        if (obj.state == 'stop') {
            obj.time = 0
        } else {
            obj.time = t[0]
        }

        // Adaptive update intervals. Run updates at 200 ms until we are
        // updating in sync with the time, then switch to 1000 ms.
        if (mpd.state == 'play' && mpd.adaptive_interval) {
            if (obj.time == mpd.time) {
                mpd.sec_ticks++
            } else {
                if (mpd.update_interval == 1000) {
                    mpd.sec_synced = (mpd.sec_ticks < 2)
                } else {
                    mpd.sec_synced = (mpd.sec_ticks == 4)
                    mpd.sec_ticks = 0
                }
            }
            mpd.update_interval = (mpd.sec_synced) ? 1000 : 200
        }

        if (obj.songid != mpd.songid) {
            mpd.doCmd("currentsong", mpd._parseCurrentSong, true)
        } else {
            CS = false
            if (obj.song <= mpd.plinfo.length) {
                CS = Nz(mpd.plinfo[obj.song])
                if (CS.file.indexOf("://") > 0) {
                    if (CS.Title != mpd.Title){
                        mpd.doCmd("currentsong", mpd._parseCurrentSong, true)
                    }
                }
            }
        }
        mpd.playlist = Nz(mpd.playlist, 0)
        if (obj.playlist != mpd.playlist) {
            var l = parseInt(Nz(obj.playlistlength, 0))
            if (l < mpd.plinfo.length && Nz(mpd.pl_lookup)) {
                var new_lookup = {}
                for (x in mpd.pl_lookup) {
                    if (mpd.pl_lookup[x] < l) new_lookup[x] = mpd.pl_lookup[x]
                }
                mpd.pl_lookup = new_lookup
            }
            mpd.plinfo.length = l
            var cmd = (mpd.playlist > 0)
                    ? "plchanges " + mpd.playlist
                    : "playlistinfo"
            mpd.doCmd(cmd, mpd._parsePL, true)
        }
        mpd.playlist = Nz(obj.playlist)
        if (mpd.updating_db) {
            if (!Nz(obj.updating_db)) {
                mpd.set('updating_db', null)
                mpd.cachedDB = []
            }
        }

        // set status values
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
        mpd.set('db_update', Nz(obj.db_update))

        mpd._doStatus = false
    } catch (e) {
        debug(e)
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
            cmd += '\nadd ' + Sz(item.name)
        } else {
            var q = new dbQuery()
            q.type = 'file'
            q.scope = item.type
            q.query = item.name
            q.callBack = function(db) {
                var dbl = db.length
                var c = "command_list_begin"
                for (var x = 0; x < dbl; x++) {
                    c += '\nadd ' + Sz(db[x].name)
                }
                mpd.doCmd(c + "\ncommand_list_end")
            }
            q.execute()
        }
    }
    if (hasFiles) {
        hasFiles = false
        mpd.doCmd(cmd + "\ncommand_list_end")
        cmd = "command_list_begin"
    }
}
// Connection methods
mpd.connect = function() {
    if (mpd._timer) {
        mpd._timer.cancel()
        mpd._timer = null
    }
    if (mpd._socket) {
        mpd._socket.cancel()
        mpd._socket = null
    }
    if (mpd._host && mpd._port) {
        mpd.set("playlistname", translateService.GetStringFromName("new_playlist"))
        mpd._checkStatus()
    } else
        mpd.set("lastResponse", translateService.GetStringFromName("server_not_selected"))
}

mpd.force_connect = function() { loadSrvPref() }

mpd.disconnect = function() {
    if (mpd._timer) {
        mpd._timer.cancel()
        mpd._timer = null
    }
    if (mpd._socket) {
        mpd._socket.cancel()
        mpd._socket = null
    }
    mpd._host = null
    mpd._port = null
}

// Talk directlty to MPD, outputData must be properly escaped and quoted.
// callBack is optional, if left out or null and no socket is in use,
// a single use connection will be made for this mpd.doCmd.
mpd.doCmd = function(outputData, callBack, hide, priority) {
    
    hide = Nz(hide)
    priority = Nz(priority)
    if (/^rename\ |^rm\ |^save\ /m.test(outputData)) {
        callBack = function(d) {
            observerService.notifyObservers(null, 'playlists', null)
        }
    }
    if (/^\s*load\s/m.test(outputData)) {
        var name = /^\s*load\s+\"(.+)\"\s*$/m.exec(outputData)
        debug(outputData)
        if (name) {
            mpd.set("playlistname", name[1])
        }
    }
    if (priority) {
        debug("priority command: " + outputData)
        mpd._cmdQueue.unshift({
            outputData : outputData + "\n",
            callBack : Nz(callBack),
            hide : hide,
            sent : false
        })
    } else {
        mpd._cmdQueue.push({
            outputData : outputData + "\n",
            callBack : Nz(callBack),
            hide : hide,
            sent : false
        })
    }
    if (mpd._socket) {
        mpd._doStatus = true
        if (mpd._idle) {
            mpd._socket.writeOut(mpd._cmdQueue[0].outputData)
            if (!hide)
                mpd.set('last_command', outputData);
            mpd._idle = false
        }
    } else {
        mpd.connect()
    }
}

mpd.getAllDirs = function(callBack) {    
    if (!mpd._socket)
        mpd.connect()
    var cb = callBack
    mpd.doCmd("listall", function(d) {
        try {
            d = d.replace(/^file: .*\n/gm, "")
            d = d.replace(/^directory: /gm, "")
            d = d.replace(/^\//gm, "")
            dirs = d.split("\n").sort().slice(1)
            var hd = []
            var l = dirs.length
            if (l < 1) {
                debug("EMPTY getAllDirs() CALLBACK!");
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
            debug(e)
        }
    })
}

mpd.getArt = function(item, img) {
	var fallback = function (code, item, url) {
		if ( code == 200 || code == 0 ) {
			mpd.cachedArt[url] = url;
			item.objImg.setAttribute("tooltiptext",url);
			item.objImg.src = url;
			return;
		}
		if (prefs.get("use_amazon_art", 1) >= 1 ) getAmazonArt(mpd, item, item.objImg)
		else {
			img.src = "chrome://minion/content/images/album_blank.png"
			img.removeAttribute("tooltiptext")
		}
	}

	try {
		var strFile = new String(item.file);
		debug(item);
		if ( strFile.indexOf('http://') == 0 || strFile.indexOf('https://') == 0 ) {
			var art =  "chrome://minion/content/images/internet_music.png";
			img.src = art;
			img.setAttribute("tooltiptext",art);
			return;
		}
		img.src = "chrome://minion/content/images/album_loading.png";
		img.setAttribute("tooltiptext","...");
		
		item.objImg = img;
		if (prefs.get("use_custom_art", false)) {
			var url = urlReplace(prefs.get("custom_art_url"), item)
			debug("Attempting to fetch cover at " + url);
			if (typeof(mpd.cachedArt[url]) != 'string') prefetchImageFromURL(url, fallback, item);
			else {
				img.setAttribute("tooltiptext",url);
				img.src = url;
			}
		} else {
			fallback(404, item);
		}
	} catch(e) { debug(e); }
}

mpd.guessPlaylistName = function () {
    var playlists = []
    var aCurPL = []
    var plinfo = mpd.plinfo
    
    for (x=0, l=plinfo.length; x<l; x++) {
        aCurPL.push(plinfo[x].file)
    }
    var currentPL = "file: " + aCurPL.join("\nfile: ") + "\n"
    
    var nextPL = function () {
        pl = playlists.shift().replace(/"/g, '\\"')
        mpd.doCmd('listplaylist "'+pl+'"', function(data){
            if (data==currentPL) {
                mpd.set("playlistname", pl)
            } else {
                if (playlists.length > 0) nextPL()
            }
        }, false)
    }
    
    var q = new dbQuery()
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
    //url = url.replace("{id}", prefs.get("lyricsfly_id",""))
    //url = url.replace("{amo}", "addons.mozilla.org/en-US/firefox/addon/6324")
    
    var cb = function(data) {
        try {
            var ar = data.getElementsByTagName("ar")
            var tt = data.getElementsByTagName("tt")
            debug(tt)
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
        catch (e) {debug(e)}
        if (cmd) {
            debug(cmd)
            var db_cb = function (d) {
                var db = mpd._parseDB(d)
                debug(d)
                for (i=0;i<db.length;i++) {
                    var x = titles.indexOf(db[i].Title)
                    if (x > -1 && db[i].Artist != artists[x]) {
                        db.splice(i,1)
                    }
                }
                origCallBack(db)
            }
            mpd.doCmd(cmd, db_cb)
        }
    }
    debug(url)
    fetch(url, cb, null, true)
}

mpd.getLyrics = function (item, txtLyrics, btnEdit) {
    if (!Nz(item.Artist)) {
        txtLyrics.value = translateService.GetStringFromName("no_lyrics_found");
        btnEdit.edit_link = "http://lyricsfly.com/submit/"
        return null
    }
    var cb = function(data) {
        var lyrics = translateService.GetStringFromName("no_lyrics");
        try {
            var tx = data.getElementsByTagName("tx")
            if (Nz(tx[0])) {
                var lyrics = tx[0].textContent.replace(/\[br\]/g,"")
                var cs = data.getElementsByTagName("cs")
                var id = data.getElementsByTagName("id")
                if (Nz(cs[0]) && Nz(id[0]) && Nz(btnEdit)) {
                    var ed = "http://lyricsfly.com/search/correction.php?[CHECKSUM]&id=[SONG ID]"
                    ed = ed.replace("[CHECKSUM]", cs[0].textContent)
                    ed = ed.replace("[SONG ID]", id[0].textContent)
                    btnEdit.edit_link = ed
                }
            }
        }
        catch (e) {debug(e)}
        finally { txtLyrics.value = lyrics }
    }
    var url = "http://lyricsfly.com/api/api.php?i={id}-{amo}&a={Artist}&t={Title}"
    // Please do not attempt to use this user id for api access.
    // It is easy to obtain your own id, please see http://lyricsfly.com/api/
    url = url.replace("{id}", prefs.get("lyricsfly_id",""))
    url = url.replace("{amo}", "addons.mozilla.org/en-US/firefox/addon/6324")
    url = url.replace("{Artist}", Nz(item.Artist, '').replace(/[^A-Za-z0-9]/g, '%'))
    url = url.replace("{Title}", Nz(item.Title, '').replace(/[^A-Za-z0-9]/g, '%'))
    txtLyrics.value = translateService.GetStringFromName("searching_lyrics");
    btnEdit.edit_link = "http://lyricsfly.com/submit/"
    fetch(url, cb, null, true)
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
    mpd.doCmd('outputs', cb)
}

mpd.setServers = function(servers) {
	mpd.set('servers', servers);
	try {
		var file = DirIO.get(pref_dir);
		file.append(pref_file);
		if (!file.exists()) {
			FileIO.create(file);
		}
		var str = JSON.stringify(mpd.servers);
		FileIO.write(file, str);
		file = null;
	} catch(e) { debug(e); }
}

mpd.loadServers = function() {
	var file = DirIO.get(pref_dir);
	file.append(pref_file);
	if (file.exists()) {
		debug("Reading server prefs from: "+file.path);
		var str = FileIO.read(file);
		mpd.servers = JSON.parse(str);
	} else {
		// creating default server
		debug("Creating default servers.");
		mpd.servers = default_servers;
		mpd.setServers(mpd.servers);
	}
	file = null;
}

// Any property that may be observed must be set with this method.
mpd.set = function(prop, val) {
    if (val != mpd[prop]) {
        //debug("Notify: mpd."+prop+" = "+val)
        mpd[prop] = val
        observerService.notifyObservers(null, prop, val)
    }
}

mpd.toggleRandom = function() {
    var state = (mpd.random > 0) ? 0 : 1
    mpd.doCmd("random " + state)
}

mpd.toggleRepeat = function() {
    var state = (mpd.repeat > 0) ? 0 : 1
    mpd.doCmd("repeat " + state)
}

mpd.load_pls_stream = function(data, action) {
    if (typeof(action) == 'undefined')
        action = "add"
    var urls = data.match(/(?:File\d+=)(.+)(?:[\n|\r])/ig)
    var cmd = 'command_list_begin'
    if (action == "play")
        cmd += "\nclear"
    for (x in urls) {
        var u = urls[x].replace("\n", "").replace(/File\d+=/gi, "")
        if (u.length > 0)
            cmd += '\nadd ' + u
    }
    if (action == "play")
        cmd += "\nplay"
    cmd += '\ncommand_list_end'
    debug(cmd)
    mpd.doCmd(cmd)
}

mpd.load_m3u_stream = function(data, action) {
    if (typeof(action) == 'undefined')
        action = "add"
    urls = data.replace(/#.+\n/g, "").split("\n")
    var cmd = 'command_list_begin'
    if (action == "play")
        cmd += "\nclear"
    for (x in urls) {
        var u = urls[x].replace("\n", "").replace(/File\d+=/gi, "")
        if (u.length > 0)
            cmd += '\nadd ' + u
    }
    if (action == "play")
        cmd += "\nplay"
    cmd += '\ncommand_list_end'
    debug(cmd)
    mpd.doCmd(cmd)
}

mpd.load_xspf_stream = function(data, action) {
    debug(data)
    if (typeof(action) == 'undefined')
        action = "add"
    urls = data.getElementsByTagName("location")
    var cmd = 'command_list_begin'
    if (action == "play")
        cmd += "\nclear"
    for (var x=0; x < urls.length; x++) {
        var u = urls.item(x)
        cmd += '\nadd ' + u.textContent
    }
    if (action == "play")
        cmd += "\nplay"
    cmd += '\ncommand_list_end'
    debug(cmd)
    mpd.doCmd(cmd)
}

mpd.load_unknown_stream = function(data, action, req) {
    var head = req.getAllResponseHeaders()
    var content = head.match(/Content-Type: (.*)\n/)[1]
    debug("content = '"+content+"'")
    switch (content) {
        case "audio/x-scpls" :
            mpd.load_pls_stream(data, action);
            break;
        case "audio/x-mpegurl" :
            mpd.load_m3u_stream(data, action);
            break;
        case "application/xspf+xml" :
            mpd.load_xspf_stream(req.responseXML, action);
            break;
        default :
            mpd.doCmd('add "' + url + '"');
            break;
    }
}
mpd.handleURL = function(url, action) {
    if (typeof(url) != 'string')
        return null
    if (typeof(action) == 'undefined')
        action = "add"
    if (url.length < 4)
        return null
    if (url.indexOf("http://somafm.com/play/") == 0) {
        url = url.replace("/play", "") + ".pls"
    }
    debug(action + ": " + url + ", " + url.substr(-4).toLocaleLowerCase())
    switch (url.substr(-4).toLocaleLowerCase()) {
        case ".pls" :
            fetch(url, mpd.load_pls_stream, action);
            break;
        case ".m3u" :
            fetch(url, mpd.load_m3u_stream, action);
            break;
        case "xspf" :
            fetch(url, mpd.load_xspf_stream, action, true);
            break;
        case ".mp3" :
            mpd.doCmd('add "' + url + '"');
            break;
        case ".ogg" :
            mpd.doCmd('add "' + url + '"');
            break;
        case ".wav" :
            mpd.doCmd('add "' + url + '"');
            break;
        case "flac" :
            mpd.doCmd('add "' + url + '"');
            break;
        case ".acc" :
            mpd.doCmd('add "' + url + '"');
            break;
        case ".mod" :
            mpd.doCmd('add "' + url + '"');
            break;
        default:
            fetch(url, mpd.load_unknown_stream, action);
            break;
    }
}

function loadSrvPref() {
    var srv = ''
    if (prefBranch.getPrefType("extensions.mpm.server") == prefBranch.PREF_STRING) {
        var srv = prefBranch.getCharPref("extensions.mpm.server");
    }
    debug('srv = '+srv)
    if (srv > '') {
        srv = srv.split(":", 3);
        var cb = function() {
            mpd._cmdQueue = []
            if (srv.length == 3) {
                mpd._host = srv[0];
                mpd._port = parseInt(srv[1]);
                mpd._password = srv[2];
                mpd.connect()
                observerService.notifyObservers(null, "new_mpd_server", srv[0]
                        + ":" + srv[1])
            } else {
                mpd._host = null
                mpd._port = null
                observerService.notifyObservers(null, "new_mpd_server", null)
            }
        }
        var timer = Components.classes["@mozilla.org/timer;1"]
                .createInstance(Components.interfaces.nsITimer)
        mpd.disconnect()
        timer.initWithCallback(cb, 100,
                Components.interfaces.nsITimer.TYPE_ONE_SHOT)
    } else {
        debug("No server, disconnecting.")
        mpd.disconnect()
    }
}

function socketTalker() {
    if (mpd._port <= '' || mpd._host <= '') return null
    debug("enter socketTalker")
    mpd.set('greeting', 'Connecting...');
    var initialized = false
    var regGreet = /OK MPD [0-9\.]+\n/gm
    try {
        var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"]
                .getService(Components.interfaces.nsISocketTransportService);
        var transport = transportService.createTransport(null, 0, mpd._host,
                mpd._port, null);
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
        mpd._host = null
        mpd._port = null
        mpd._password = null
        mpd.disconnect()
        return null
    }

    var listener = {
        data : "",
        onStartRequest : function(request, context) {
            mpd._idle = false
            mpd.cachedDB = []
            initialized = false
            debug('socketTalker for server ' + mpd._host + ":" + mpd._port
                    + " created.")
            mpd.set('greeting', translateService.GetStringFromName('connecting'));
        },
        onStopRequest : function(request, context, status) {
            this.data = null
            debug('socketTalker for server ' + mpd._host + ":" + mpd._port
                    + " destroyed.")
            debug('close status = ' + status)
            mpd._socket = null
            mpd.set('greeting', translateService.GetStringFromName('not_connected'));
            if (status == NOSRV_STATUS) {
                mpd._host = null
                mpd._port = null
                mpd._password = null
                debug("Killing socket")
            }
        },
        onDataAvailable : function(request, context, inputStream, offset, count) {
            try {
                mpd._idle = false
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
                        mpd.set('greeting', "MPD@" + mpd._host
                                + ":" + mpd._port)
                        if (mpd._password.length > 0) {
                            mpd._cmdQueue.unshift({
                                outputData : 'password "' + mpd._password
                                        + '"\n',
                                callBack : null,
                                hide : true
                            })
                        }
                        if (mpd._cmdQueue.length > 0) {
                            var snd = mpd._cmdQueue[0].outputData
                            utf_outstream.writeString(snd);
                            if (!mpd._cmdQueue[0].hide) {
                                mpd.set('last_command', snd);
                                mpd.set('lastResponse', translateService.GetStringFromName("working"));
                            } else if (snd.slice(0, 9) == "plchanges") {
                                mpd.set('lastResponse', translateService.GetStringFromName("working"));
                            }
                        } else {
                            done = true
                        }
                        observerService.notifyObservers(null, "new_connection",
                                null)
                    }
                }
                if (this.data.substr(-3) == "OK\n") {
                    var cdata = this.data.split(/^OK\n/gm)
                    this.data = ""
                    while (cdata.length > 1) {
                        var d = cdata.shift()
                        if (mpd._cmdQueue.length > 0) {
                            var snd = mpd._cmdQueue[0].outputData
                            if (!mpd._cmdQueue[0].hide) {
                                mpd.set('lastResponse', "OK");
                            } else if (snd.slice(0, 9) == "plchanges") {
                                mpd.set('lastResponse', "OK");
                            }
                            if (mpd._cmdQueue[0].callBack) {
                                mpd._cmdQueue[0].callBack(d)
                            }
                            mpd._cmdQueue.shift()
                        }
                    }
                    if (mpd._cmdQueue.length > 0) {
                        var snd = mpd._cmdQueue[0].outputData
                        utf_outstream.writeString(snd);
                        if (!mpd._cmdQueue[0].hide) {
                            mpd.set('last_command', snd);
                            mpd.set('lastResponse', translateService.GetStringFromName("working"));
                        } else if (snd.slice(0, 9) == "plchanges") {
                            mpd.set('lastResponse', translateService.GetStringFromName("working"));
                        }
                    } else {
                        done = true
                    }
                } else if (this.data.indexOf('ACK [') != -1) {
                    mpd.set('lastResponse', this.data.replace(/\n/g, ""))
                    mpd._cmdQueue.shift()
                    done = true
                }

                if (done) {
                    if (mpd._doStatus) {
                        mpd._doStatus = false
                        mpd._cmdQueue.push({
                            outputData : "command_list_begin\nstatus\nstats\ncommand_list_end\n",
                            callBack : mpd._update,
                            hide : true,
                            sent : true
                        })
                        utf_outstream.writeString("command_list_begin\nstatus\nstats\ncommand_list_end\n")
                    } else {
                        mpd._idle = true
                    }
                }
            } catch (e) {
                mpd._host = null
                mpd._port = null
                mpd.disconnect()
                debug(e)
            }
        }
    }

    var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"]
            .createInstance(Components.interfaces.nsIInputStreamPump);
    pump.init(instream, -1, -1, 0, 0, false);
    pump.asyncRead(listener, null);

    var con = {
        cancel : function() {
            debug("Cancel socket")
            transport.close(0)
        },
        writeOut : function(str) {
            if (initialized)
                utf_outstream.writeString(str)
        }
    }

    return con
} // end socketTalker()

var myPrefObserver = {
    register : function() {
        this._branch = prefService.getBranch("extensions.mpm.");
        this._branch
                .QueryInterface(Components.interfaces.nsIPrefBranchInternal);
        this._branch.addObserver("", this, false);
    },

    unregister : function() {
        if (!this._branch)
            return;
        this._branch.removeObserver("", this);
    },

    observe : function(aSubject, aTopic, aData) {
        if (aTopic != "nsPref:changed")
            return;
        // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
        // aData is the name of the pref that's been changed (relative to
        // aSubject)
        switch (aData) {
            case "server" :
                loadSrvPref()
                break;
        }
    }
}

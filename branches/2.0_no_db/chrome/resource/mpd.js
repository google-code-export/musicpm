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
Components.utils.import("resource://minion/io.js");
EXPORTED_SYMBOLS = ["dbQuery", "mpd", "prefBranch", "Sz"]
var prefService = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService);
var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);

var lfId = prefs.get("lyricsfly_id","8890a06f973057f4b")
debug("mpd.js load")
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

    mpd.doCmd(cmd, function(d) {
        var db = mpd._parseDB(d)
        if (restrict)
            db = dbFilter(db, restrict)
        if (chkDupes)
            db = dbDistinct(db)
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
        if (a.name.substr(i, 1) < b.name.substr(i, 1))
            return -1
        if (a.name.substr(i, 1) > b.name.substr(i, 1))
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

    // Playlist contents and total playtime
    plinfo : [],
    pltime : 0,
    pl_lookup : {},

    // Connection state information
    greeting : 'Not Connected',
    last_command : '',
    lastResponse : '',
    _idle : false,
    _doStatus : true,
    _timer : null,
    _cmdQueue : [],
    _socket : null,

    cachedArt : [],
    cachedDB : [],
    servers : [["media-server", "192.168.1.2:6600:"],
            ["localhost", "localhost:6600:"]]
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
    if (!Nz(obj.Title) && Nz(obj.file)) {
        obj.Title = obj.file.split("/").slice(-1)
    }
    obj.type = 'file'
    obj.name = obj.file

    // set currentsong values
    mpd.set('file', Nz(obj.file))
    mpd.set('Time', Nz(obj.Time))
    mpd.set('Artist', Nz(obj.Artist))
    mpd.set('Title', Nz(obj.Title))
    mpd.set('Album', Nz(obj.Album))
    mpd.set('Track', Nz(obj.Track))
    mpd.set('Date', Nz(obj.Date))
    mpd.set('Genre', Nz(obj.Genre))
    mpd.set('Composer', Nz(obj.Composer))
    mpd.set('currentsong', obj)
}

mpd._parseDB = function(data) {
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
                        type : 'file',
                        file : val,
                        name : val,
                        Track : '0',
                        Title : null,
                        Artist : '',
                        Album : '',
                        Time : 0,
                        Pos : null
                    };
                    var d = data[i + 1]
                    while (d && d.substr(0, 6) != "file: ") {
                        var sep = d.indexOf(": ")
                        song[d.substr(0, sep)] = d.slice(sep + 2);
                        --n;
                        var d = data[dl - n + 1]
                    };
                    if (!song.Title) song.Title = val.split("/").pop()
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
        var db = mpd._parseDB(data, false)
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

        observerService.notifyObservers(null, "plinfo", db.length)
        observerService.notifyObservers(null, "playlistlength",
                mpd.playlistlength)
        observerService.notifyObservers(null, "pltime", prettyTime(tm))
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
        if (obj.state == 'stop') {
            obj.time = 0
        } else {
            obj.time = Nz(obj.time, '0:0').split(":")[0]
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

        if (obj.song != mpd.song) {
            mpd.doCmd("currentsong", mpd._parseCurrentSong, true)
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
    mpd.disconnect()
    if (mpd._host && mpd._port) {
        mpd._checkStatus()
    } else
        mpd.set("lastResponse", "Server Not Selected")
}

mpd.disconnect = function() {
    if (mpd._timer) {
        mpd._timer.cancel()
        mpd._timer = null
    }
    if (mpd._socket) {
        mpd._socket.cancel()
    }
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
        debug(name)
        callBack = function(d) {
            observerService.notifyObservers(null, 'load_playlist', name[1])
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
    mpd._doStatus = true
    if (mpd._socket) {
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

function getAmazonArt (item, img) {
        var search_url = "http://musicbrainz.org/ws/1/release/?type=xml&artist="
                + encodeURI(item.Artist)
                + "&title="
                + encodeURI(item.Album)
                + "&limit=1"
        var art =  "chrome://minion/content/images/album_blank.png"
        debug("searching Metabrainz...")
        if (typeof(mpd.cachedArt[search_url]) == 'string') {
            img.src = mpd.cachedArt[search_url]
            img.setAttribute("tooltiptext",mpd.cachedArt[search_url])
        } else {
            var cb = function(data) {
                try {
                    var asin = ""
                    if (data != "") {
                        var s = data.indexOf("<asin>") + 6
                        if (s > 6) {
                            var e = data.indexOf("</asin>", s)
                            if (e > 0) {
                                asin = data.slice(s, e)
                            }
                            if (asin.length == 10) {
                                base = "http://images.amazon.com/images/P/"
                                        + asin
                                art = base + ".01.MZZZZZZZ.jpg"
                            }
                        }
                    }
                    mpd.cachedArt[search_url] = art
                    img.src = art
                    img.setAttribute("tooltiptext",art)
                } catch (e) {
                    debug(e)
                }
            }
            fetch(search_url, cb)
        }
}

mpd.getArt = function(item, img) {
    var fallback = function () {
        debug("fallback")
        if (prefs.get("use_amazon_art", true)) getAmazonArt(item, img)
        else {
            img.src = "chrome://minion/content/images/album_blank.png"
            img.removeAttribute("tooltiptext")
        }
    }
    img.src = "chrome://minion/content/images/album_loading.png"
    img.setAttribute("tooltiptext","loading")

    if (prefs.get("use_custom_art", false)) {
        var url = urlReplace(prefs.get("custom_art_url"), item)
        debug("Attempting to fetch cover at " + url)
        img.onerror = fallback
        img.setAttribute("tooltiptext",url)
        img.src = url
    } else {
        fallback()
    }
}

mpd.getLyrics = function (item, txtLyrics, btnEdit) {
    if (!Nz(item.Artist)) {
        txtLyrics.value = "No Lyrics Found."
        btnEdit.edit_link = "http://lyricsfly.com/submit/"
        return null
    }
    var cb = function(data) {
        var lyrics = "No Lyrics Found."
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
    url = url.replace("{Artist}", encodeURI(Nz(item.Artist)))
    url = url.replace("{Title}", encodeURI(Nz(item.Title)))
    txtLyrics.value = "Searching for lyrics on LyricsFly.com..."
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
    mpd.set('servers', servers)
    var file = DirIO.get("Home")
    file.append(".mpm_servers.js")
    if (!file.exists()) {
        FileIO.create(file)
    }
    var str = mpd.servers.toSource()
    FileIO.write(file, str)
    file = null
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
    debug(head)
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
    debug(action + ": " + url)
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
    if (prefBranch.getPrefType("extensions.mpm.server") == prefBranch.PREF_STRING) {
        var srv = prefBranch.getCharPref("extensions.mpm.server");
        mpd.disconnect()
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
                mpd._password = null
                observerService.notifyObservers(null, "new_mpd_server", null)
            }
        }
        var timer = Components.classes["@mozilla.org/timer;1"]
                .createInstance(Components.interfaces.nsITimer)
        timer.initWithCallback(cb, 100,
                Components.interfaces.nsITimer.TYPE_ONE_SHOT)
    } else {
        mpd._host = null;
        mpd._port = null;
        mpd._password = '';
    }
}

function socketTalker() {
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
        debug(e)
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
            mpd.set('greeting', 'Connecting');
        },
        onStopRequest : function(request, context, status) {
            this.data = null
            debug('socketTalker for server ' + mpd._host + ":" + mpd._port
                    + " destroyed.")
            debug('close status = ' + status)
            mpd._socket = null
            mpd.set('greeting', 'Not Connected');
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
                                mpd.set('lastResponse', "Working...");
                            } else if (snd.slice(0, 9) == "plchanges") {
                                mpd.set('lastResponse', "Working...");
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
                            mpd.set('lastResponse', "Working...");
                        } else if (snd.slice(0, 9) == "plchanges") {
                            mpd.set('lastResponse', "Working...");
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
            try {
                utf_outstream.close()
            } catch (e) {
            }
            try {
                utf_instream.close()
            } catch (e) {
            }
            try {
                transport.close(0)
            } catch (e) {
            }
        },
        writeOut : function(str) {
            if (initialized)
                utf_outstream.writeString(str)
        }
    }

    return con
}

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

var file = DirIO.get("Home")
file.append(".mpm_servers.js")
if (file.exists()) {
    var str = FileIO.read(file)
    mpd.servers = eval(str)
} else {
    debug("Creating default servers.")
    mpd.servers = [["localhost", "localhost:6600:"]]
    FileIO.create(file)
    var str = mpd.servers.toSource()
    FileIO.write(file, str)
}
file = null

loadSrvPref()
myPrefObserver.register();
debug("mpd.js finish")

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
EXPORTED_SYMBOLS = ["dbQuery", "mpd", "prefBranch", "Sz"]
debug("mpd loading")

var prefService = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefService);
var prefBranch = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);

function dbQuery (cmd, callBack) {
    this.cmd = Nz(cmd)
    this.path = []
    this.type = 'directory'
    this.scope = null
    this.query = null
    this.restrict = null
    this.callBack = Nz(callBack)
}

dbQuery.prototype.evaluate = function () {
    switch (this.type) {
        case 'search':
            this.cmd = "search";
            this.path = [
                {
                    type: "search",
                    Title: "Search ("+this.scope+"): "+this.query,
                    name: this.query
                }
            ];
            break;
        case 'playlistsearch':
            this.cmd = "playlistsearch";
            this.path = [
                {
                    type: "playlistsearch",
                    Title: "Search Playlist ("+this.scope+"): "+this.query,
                    name: this.query
                }
            ];
            break;
        case 'directory':
            this.cmd = "lsinfo";
            this.path = [
                {
                    type: 'directory',
                    Title: "Folders",
                    name: ""
                }
            ];
            if (Nz(this.query,"")=="") {
                this.restrict = ["directory", "file"];
            }
            var p = this.query.split("/");
            if (p.length > 0) {
                for (var i=0;i<p.length;i++) {
                    if (p[i] > "") {
                        this.path.push(
                            {
                                type: 'directory',
                                Title: p[i],
                                name: p.slice(0,i+1).join("/")
                            }
                        )
                    }
                }
            }
            break;
        case 'file':
            this.cmd = "find";
            this.path = [
                {
                    type: this.scope,
                    Title: this.scope+"s",
                    name: ""
                },
                {
                    type: this.scope,
                    Title: this.query,
                    name: this.query
                }
            ];
            break;
        case 'playlist':
            this.path = [
                {
                    type: "playlist",
                    Title: "Playlists",
                    name: ""
                }
            ];
            if (Nz(this.query,"")=="") {
                this.cmd = "lsinfo";
                this.restrict = "playlist";
            }
            else {
                this.cmd = "listplaylistinfo";
                this.path.push(
                    {
                        type: "playlist",
                        Title: this.query,
                        name: this.query
                    }
                );
            };
            break;
        default:
            this.cmd = "list " + this.type;
            this.path = [
                {
                    type: this.type,
                    Title: this.type+"s",
                    name: ""
                }
            ];
            break;
    }
    if (this.scope) this.cmd += " " + this.scope;
    if (this.query) this.cmd += " " + Sz(this.query);
    debug(this.cmd)
}

dbQuery.prototype.execute = function (callBack){
    callBack = Nz(callBack, this.callBack)
    if (!this.cmd) this.evaluate()
    var cmd = this.cmd
    var path = this.path
    var restrict = this.restrict
    var useCache = !(this.type == 'playlist' || this.restrict)

    if (Nz(mpd.cachedDB[cmd])) {
        debug("cached: "+cmd)
        callBack(mpd.cachedDB[cmd])
        return null
    }

    // Clean up and validate mpd.doCmd lists.
    if (cmd.indexOf('mpd.doCmd_list_begin') > -1) {
        if  (cmd.indexOf('mpd.doCmd_list_end') < 0) {
            cmd += "\nmpd.doCmd_list_end"
        }
    }
    else if (cmd.indexOf(';') > -1) {
        cmd = "mpd.doCmd_list_begin;"+cmd
        if  (cmd.indexOf('mpd.doCmd_list_end') < 0) {
            cmd += ";mpd.doCmd_list_end"
        }
        cmd = cmd.replace(/;/g,"\n")
    }

    // Check if this mpd.doCmd returns database results.
    // If so, check if it will return multiple sets that
    // will need to be combined.
    var re = /^.*search |^.*find |^.*info|^plchanges |^list.* /gm
    var matches = cmd.match(re)
    if (!matches) {
        mpd.doCmd(cmd, null, false)
        return null
    }
    else {
        var chkDupes = (matches.length > 1)
    }
    mpd.doCmd(cmd, function(d){
            var db = mpd._parseDB(d)
            if (restrict) db = dbFilter(db, restrict)
            if (chkDupes) db = dbDistinct(db)
            if (useCache) mpd.cachedDB[cmd] = db
            callBack(db, path)
        }, false)
    return true
}

function Sz (str) {
    /* Prepare strings for mpd socket communications */
    if (typeof(str) == "string") return '"'+str.replace(/\"/g, '\\"')+'"'
    return "''"
}

function dbDistinct(db) {
    var rdb = []
    var dl = db.length
    if (dl < 1) {return db}
    var n = dl

    var srt = function(a,b) {
        if (a.name.substr(i,1)<b.name.substr(i,1)) return -1
        if (a.name.substr(i,1)>b.name.substr(i,1)) return 1
        return 0
    }

    db.sort(srt)
    do {
        var i = dl - n
        if (n==1) {rdb.push(db[i])}
        else if (db[i].name != db[i+1].name) {rdb.push(db[i])}
    } while (--n)
    return rdb
}

function dbFilter(db, restrict) {
    var rdb = []
    var dl = db.length
    if (dl < 1) {return db}
    if (typeof(restrict) == 'string') restrict = [restrict]
    for (var i=0;i<restrict.length;i++) {
        var n = dl
        var r = restrict[i]
        do {
            if (db[dl-n].type == r) {rdb.push(db[dl-n])}
        } while (--n)
    }
    return rdb
}

var mpd = {
    _host: null,
    _port: null,
    _password: null,

    // Output of status
    volume: null,
    repeat: null,
    random: null,
    playlistlength: 0,
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
    currentsong: {}, //All values as object.  Observe this if you need multiple properties.

    db_update: null,

    // Playlist contents and total playtime
    plinfo: [],
    pltime: 0,

    // Connection state information
    greeting: 'Not Connected',
    last_command: '',
    lastResponse: '',
    _idle: false,
    _doStatus: true,
    _timer: null,
    _cmdQueue: [],
    _socket: null,

    cachedArt: [],
    cachedDB: [],
    servers: [ ["media-server","192.168.1.2:6600:"],
                ["localhost","localhost:6600:"],
                ["None",""] ]
}

mpd._checkStatus = function () {
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
}

// Parse output from currentsong mpd.doCmd, internal use only.
mpd._parseCurrentSong = function (data) {
    //parse the incoming data into a status object
    var obj = new Object()
    data = data.split("\n")
    var dl = data.length
    var pair
    do {
        var sep = data[dl - 1].indexOf(": ")
        if (sep > 0) {
            obj[data[dl - 1].substr(0, sep)] = data[dl - 1].slice(sep+2)
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
    mpd.set('currentsong', obj)
}

mpd._parseDB = function(data){
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
                        name: val,
                        Track: '0',
                        Title: val,
                        Artist: 'unknown',
                        Album: 'unknown',
                        Time: 0
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
                        var dir = val.split("/")
                        db.push({
                            type: 'directory',
                            name: val,
                            Title: dir[dir.length - 1],
                        })
                    }
                    else {
                        db.push({
                            type: fld,
                            name: val,
                            Title: val
                        })
                    }
                }
            }
        }
        while (--n)
    }
    return db
}

mpd._parsePL = function (data) {
    try {
        var db = mpd._parseDB(data,false)
        if (db.length > 0) {
            var i = db.length - 1
            do {
                mpd.plinfo[db[i].Pos] = db[i]
            } while (i--)
        }
        var l = mpd.plinfo.length
        var tm = 0
        if (l > 0) {
            var n = l
            do {
                var item  = Nz(mpd.plinfo[l-n])
                if (item) tm += parseInt(mpd.plinfo[l-n].Time)
                else {
                    debug("Missing playlist item "+(l-n)+" when calculating time.")
                    mpd.playlist = 0
                }
            } while (--n)
        }

        observerService.notifyObservers(null, "plinfo", db.length)
        observerService.notifyObservers(null, "playlistlength", mpd.playlistlength)
        observerService.notifyObservers(null, "pltime", prettyTime(tm))
    } catch (e) { debug(e); mpd.playlist = 0 }
}

// Parse output from status mpd.doCmd, internal use only.
mpd._update = function (data) {
    try {
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
            obj.time = Nz(obj.time,'0:0').split(":")[0]
        }
        if (obj.song != mpd.song) {
            mpd.doCmd("currentsong", mpd._parseCurrentSong, true)
        }
        mpd.playlist = Nz(mpd.playlist,0)
        if (obj.playlist != mpd.playlist) {
            mpd.plinfo.length = Nz(obj.playlistlength,0)
            var cmd = (mpd.playlist > 0) ? "plchanges " + mpd.playlist : "playlistinfo"
            mpd.doCmd(cmd, mpd._parsePL, true)
        }
        mpd.playlist = Nz(obj.playlist)
        if (mpd.updating_db) {
            if (!Nz(obj.updating_db)) {
                mpd.set('updating_db', null)
                mpd.cachedDB = []
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
    }
    catch (e) {
        debug(e)
        debug(mpd.db.lastErrorString)
    }
}

mpd.addToPlaylist = function (itemArray) {
    // Input should be an array of db objects or a single db object.
    if (typeof(itemArray[0]) != 'object') itemArray = [itemArray]
    var l = itemArray.length
    var cmd = "command_list_begin"
    var hasFiles = false
    for (var i=0;i<l;i++) {
        var item = itemArray[i]
        if (item.type == 'file' || item.type == 'directory') {
            hasFiles = true
            cmd += '\nadd ' + Sz(item.name)
        }
        else {
            var q = new dbQuery()
            q.type = 'file'
            q.scope = item.type
            q.query = item.name
            q.callBack = function (db) {
                var dbl = db.length
                var c = "command_list_begin"
                for (var x=0;x<dbl;x++) {
                    var loc = item.name
                    c += '\nadd "'+ loc.replace(/"/g, '\\"') + '"'
                }
                mpd.doCmd(c+"\ncommand_list_end")
            }
            q.execute()
        }
    }
    if (hasFiles) {
        hasFiles = false
        mpd.doCmd(cmd+"\ncommand_list_end")
        cmd = "command_list_begin"
    }
}
// Connection methods
mpd.connect = function () {
    if (mpd._timer) {
        mpd._timer.cancel()
        mpd._timer = null;
    }
    if (mpd._socket) {
        mpd._socket.cancel()
    }
    if (mpd._host && mpd._port) {
        mpd._idle = false;
        mpd._doStatus = true
        mpd._socket = socketTalker()
        mpd._checkStatus()
    }
    else mpd.set("lastResponse", "Server Not Selected")
}

mpd.disconnect = function () {
    if (mpd._timer) {
        mpd._timer.cancel()
        mpd._timer = null
    }
    mpd._socket.cancel()
}

// Talk directlty to MPD, outputData must be properly escaped and quoted.
// callBack is optional, if left out or null and no socket is in use,
// a single use connection will be made for this mpd.doCmd.
mpd.doCmd = function (outputData, callBack, hide, priority){
    hide = Nz(hide)
    priority = Nz(priority)
    if (priority) {
        mpd._cmdQueue.unshift({
            outputData: outputData+"\n",
            callBack: Nz(callBack),
            hide: hide
            })
    }
    else {
        mpd._cmdQueue.push({
            outputData: outputData+"\n",
            callBack: Nz(callBack),
            hide: hide
            })
    }
    mpd._doStatus = true
    if (mpd._socket) {
        if (mpd._idle) {
            mpd._socket.writeOut(mpd._cmdQueue[0].outputData)
            if (!hide) mpd.set('last_command', shorten(outputData+"\n"));
            mpd._idle = false
        }
    }
    else  {mpd.connect()}
}

mpd.getAllDirs = function (callBack) {
    var cb = callBack
    mpd.doCmd("listall",
        function (d) {
            d = d.replace(/^file: .*\n/gm,"")
            d = d.replace(/^directory: /gm,"")
            dirs = d.split("\n").sort().slice(1)
            var hd = []
            var l = dirs.length
            if (l < 1) return []
            var n = l
            do {
                var name = dirs[l-n]
                var path = name.split("/")
                var obj =
                    {
                        Title: path.pop(),
                        level: path.length,
                        parent: path.join("/"),
                        name: name,
                        type: 'directory',
                        children: 0
                    }
                if (obj.level > 0) {
                    for (var pi=hd.length-1;pi > -1;pi--) {
                        if (hd[pi].name == obj.parent) {
                            hd[pi].children += 1
                            break
                        }
                    }
                }
                hd.push (obj)
            } while (--n)
            cb(hd)
        }
    )
}

mpd.getArt = function (artist, album, callBack) {
    var clean = function (item) {
        if (!Nz(item)) return ''
        var s = item.indexOf("(",0)
        if (s > 0) {
            e = item.indexOf(")", s)
            if (e < 0) {
                e = s
            }
            item = item.slice(0, s-1) + item.slice(e+1)
        }
        item = item.replace(/&/g,"and").replace(/!/g,"").replace(/\?/g,"")
        item = item.replace(/\./g,"").replace(/:/g,"").replace(/;/g,"").replace(/'/g,"")
        item = item.replace(/"/g,"").replace(/,/g," ").replace(/ - /g," ")
        item = item.replace(/-/g," ")
        item = encodeURI(item)
        return item
    }

    var search_url = "http://musicbrainz.org/ws/1/release/?type=xml&artist=" +
        clean(artist) + "&title=" + clean(album) + "&limit=1"

    if (typeof(mpd.cachedArt[search_url]) == 'string') {
        callBack(mpd.cachedArt[search_url])
    }
    else {
        var cb = function(data){
            try {
                var asin = ""
                var art = "chrome://miniondev/content/images/album_blank.png"
                if (data != "") {
                    var s = data.indexOf("<asin>") + 6
                    if (s > 6) {
                        var e = data.indexOf("</asin>", s)
                        if (e > 0) {
                            asin = data.slice(s, e)
                        }
                        if (asin.length == 10) {
                            base = "http://images.amazon.com/images/P/" + asin
                            art = base + ".01.MZZZZZZZ.jpg"
                        }
                    }
                }
                mpd.cachedArt[search_url] = art
                callBack(art)
            }
            catch (e) { debug(e) }
        }
        fetch(search_url, cb)
    }
}

mpd.getOutputs = function (callBack) {
    var cb = function (data) {
        // Parse the incoming data into an array of output objects
        debug(data)
        var obj = []
        data = data.split("\n")
        var dl = data.length - 2
        for (var i=0;i<dl;i++) {
            var sep = data[i].indexOf(": ")
            if (sep > 0) {
                var idx = data[i].slice(sep+2)
                var name = "unknown"
                var enabled = false
                sep = data[++i].indexOf(": ")
                if (sep > 0) {
                    name = data[i].slice(sep+2)
                    sep = data[++i].indexOf(": ")
                    if (sep > 0) {
                        enabled = (data[i].slice(sep+2) == 1) ? true : false
                    }
                }
                obj[idx] = {id: idx, name: name, enabled: enabled}
            }
        }
        debug(obj)
        callBack(obj)
    }
    mpd.doCmd('outputs', cb)
}

// Any property that may be observed must be set with this method.
mpd.set = function (prop, val) {
    if (val != mpd[prop]) {
        //debug("Notify: mpd."+prop+" = "+val)
        mpd[prop] = val
        observerService.notifyObservers(null, prop, val)
    }
}

function loadSrvPref () {
    if (prefBranch.getPrefType("extensions.mpm.server") == prefBranch.PREF_STRING) {
        var srv = prefBranch.getCharPref("extensions.mpm.server");
        srv = srv.split(":", 3);
        if (srv.length == 3) {
            if (mpd._socket) mpd.disconnect()
            mpd._host = srv[0];
            mpd._port = parseInt(srv[1]);
            mpd._password = srv[2];
            mpd.connect()
        }
    }
    else {
        mpd._host = null;
        mpd._port = null;
        mpd._password = '';
    }
}

function shorten(cmd){
    // Convert mpd.doCmd_list to single line
    cmd = cmd.replace(/mpd.doCmd_list.+?\n/g,"").replace(/\n/g,"; ")
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
            debug('socketTalker for server '+mpd._host+":"+mpd._port+" destroyed.")
            mpd.set('greeting','Not Connected');
        },
        onDataAvailable: function(request, context, inputStream, offset, count){
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
                            mpd.set('last_command', shorten(snd));
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
                        mpd.set('greeting', this.data.slice(3)+"@"+mpd._host+":"+mpd._port)
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
                                mpd.set('last_command', shorten(snd));
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
                                "Click Cancel to continue sending mpd.doCmds, or\n" +
                                "Click OK to prevent further attempts.\n\n\n" +
                                "mpd.doCmd:\n" +
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
                if (mpd._socket) mpd.disconnect()
                mpd.playlist = 0
                mpd.dbupdate = null
                mpd.cachedDB = []
                loadSrvPref()
                observerService.notifyObservers(null, "new_mpd_server", null)
                break;
        }
    }
}

loadSrvPref()
myPrefObserver.register();

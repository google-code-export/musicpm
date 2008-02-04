//      Music Player Minion  Copyright 2008, Chris Seickel
//
//      This program is free software; you can redistribute it and/or modify
//      it under the terms of the GNU General Public License as published by
//      the Free Software Foundation; either version 2 of the License, or
//      (at your option) any later version.
//
//      This program is distributed in the hope that it will be useful,
//      but WITHOUT ANY WARRANTY; without even the implied warranty of
//      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//      GNU General Public License for more details.
//
//      You should have received a copy of the GNU General Public License
//      along with this program; if not, write to the Free Software
//      Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
//      MA 02110-1301, USA.

var host = "localhost"  //about:config --> extensions.mpm.mpd_host, string type
var port = 6600         //about:config --> extensions.mpm.mpd_port, integer type
var pass = ""           //about:config --> extensions.mpm.mpd_password, string type
var PLmode = "extended" //about:config --> extensions.mpm.playlist_mode, string type
var home = [            //about:config --> extensions.mpm.home, string type
    {
        'type': 'directory',
        'Name': '',
        'Title': 'Folders'
    },
    {
        'type': 'Artist',
        'Name': '',
        'Title': 'Artists'
    },
    {
        'type': 'Album',
        'Name': '',
        'Title': 'Albums'
    },
    {
        'type': 'playlist',
        'Name': '',
        'Title': 'Playlists'
    },
]

var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);
if (prefs.getPrefType("extensions.mpm.mpd_host") == prefs.PREF_STRING){
    host = prefs.getCharPref("extensions.mpm.mpd_host");
}
else {
    prefs.setCharPref("extensions.mpm.mpd_host", host)
}
if (prefs.getPrefType("extensions.mpm.mpd_port") == prefs.PREF_INT){
    port = prefs.getIntPref("extensions.mpm.mpd_port");
}
else {
    prefs.setIntPref("extensions.mpm.mpd_port", port)
}
if (prefs.getPrefType("extensions.mpm.mpd_password") == prefs.PREF_STRING){
    pass = prefs.getCharPref("extensions.mpm.mpd_password");
}
else {
    prefs.setCharPref("extensions.mpm.mpd_password", pass)
}
if (prefs.getPrefType("extensions.mpm.home") == prefs.PREF_STRING){
    try {
        var _home = eval(prefs.getCharPref("extensions.mpm.home"))
        if (typeof(_home) == 'object') {home = _home}
        else {prefs.setCharPref("extensions.mpm.home", home.toSource())}
    }
    catch (e) {
        prefs.setCharPref("extensions.mpm.home", home.toSource())
        debug(e)
    }
}
else {
    prefs.setCharPref("extensions.mpm.home", home.toSource())
}
prefs = null

var mpd
var mpd_stop = false
var status_command = "command_list_begin\nstatus\nstats\ncommand_list_end\n"
var notify = {}
var talker_active = false
var talker_cancel = false
var doStatus = false
var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                        .getService(Components.interfaces.nsIConsoleService);
var art = []
var volTmr = false
var seekTmr = false
var seekMax = 0
var noEchoVol = 0
var noEchoSeek = 0
var convertPercent = true
var infoBrowser


function $(e) {return document.getElementById(e)}
function debug(s) {
    return null
    var str = s
    if (typeof(s) == 'object') {
        var str = ""
        for (x in s) {str += x + ": " + s[x] + "\n"}
    }
    else {var str = s}
    consoleService.logStringMessage(str)
}
function show_config() {
    var cb = function (w) {try{w.close()}catch(e){}; mpd = 'reload'; init_mpd()}
    window.openDialog("chrome://minion/content/settings.xul","showmore",
                  "chrome", cb);
}

function init_mpd () {
    if (typeof(mpd) != 'object') {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);
        if (prefs.getPrefType("extensions.mpm.mpd_host") == prefs.PREF_STRING){
            host = prefs.getCharPref("extensions.mpm.mpd_host");
        }
        else {
            prefs.setCharPref("extensions.mpm.mpd_host", host)
        }
        if (prefs.getPrefType("extensions.mpm.mpd_port") == prefs.PREF_INT){
            port = prefs.getIntPref("extensions.mpm.mpd_port");
        }
        else {
            prefs.setIntPref("extensions.mpm.mpd_port", port)
        }
        if (prefs.getPrefType("extensions.mpm.mpd_password") == prefs.PREF_STRING){
            pass = prefs.getCharPref("extensions.mpm.mpd_password");
        }
        else {
            prefs.setCharPref("extensions.mpm.mpd_password", pass)
        }
        if (prefs.getPrefType("extensions.mpm.playlist_mode") == prefs.PREF_STRING){
            PLmode = prefs.getCharPref("extensions.mpm.playlist_mode");
        }
        else {
            prefs.setCharPref("extensions.mpm.playlist_mode", PLmode)
        }
        prefs = null
        mpd = {
            'volume': '-1',
            'repeat': '-1',
            'random': '-1',
            'playlist': '-1',
            'playlistlength': '-1',
            'xfade': '0',
            'state': 'none',
            'song': '-1',
            'songid': '-1',
            'time': '0:0',
            'bitrate': '0',
            'audio': '0:0:0',
            'artists': '0',
            'albums': '0',
            'songs': '0',
            'uptime': '0',
            'playtime': '0',
            'db_playtime': '0',
            'db_update': '0'
        }
        queue.length = 0
        doStatus = true
        if (typeof(transport) == 'object') {
            talker_cancel = true
            if (mpd_stop) {
                mpd_stop = false
                checkStatus()
            }
        }
        else {checkStatus()}
        // init is used by collection.xul
        if (typeof(notify['init']) == 'function') {
            notify['init']()
            $('mpd_hostport').value = host+":"+port
            $('mpd_status').value = "Not Connected"
        }

    }
}
const replacementChar = Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"]
.getService(Components.interfaces.nsISocketTransportService);
var transport
var outstream
var instream
var utf_instream
var utf_outstream
var idle = false
var dataListener  = {
      data : "",
      onStartRequest: function(request, context){
                    talker_active = true
                    idle = false
                },
      onStopRequest: function(request, context, status){
                    try { utf_outstream.close() } catch (e) {}
                    try { utf_instream.close() } catch (e) {}
                    try { transport.close(0) } catch (e) {}
                    talker_active = false
                    idle = false
                },
      onDataAvailable: function(request, context, inputStream, offset, count){
        try {
            idle = false
            if (talker_cancel) {talker_cancel = false;request.cancel(0); return null}
            var str = {};
            var done = false
            while (utf_instream.readString(4096, str) != 0) {
                this.data += str.value
            }
            str = null
            if (this.data.slice(-3) == "OK\n") {
                try {
                    var snd = queue[0].outputData
                    if(snd != status_command && snd.substr(0,9) != "plchanges") {
                        $('mpd_response').value = "OK"
                    }
                } catch (e) {}

                if (queue.length > 0 && typeof(queue[0].callBack) == 'function') {
                    queue[0].callBack(this.data)
                }
                queue.shift()
                this.data = ""
                if (queue.length > 0) {
                    utf_outstream.writeString(queue[0].outputData);
                    try {
                        var snd = queue[0].outputData
                        if(snd != status_command && snd.substr(0,9) != "plchanges") {
                            $('mpd_sent').value = snd;
                            $('mpd_response').value = "Working...";
                        }
                    } catch (e) {}
                    debug("OK..."+queue[0].outputData)
                }
                else { done = true }
            }
            else if (this.data.substr(0,6) == "OK MPD"){
                try {
                    $('mpd_status').value = this.data.substr(3)
                } catch (e) {debug(e)}
                this.data = ""
                if (pass.length > 0) {
                    queue.unshift({'outputData':'password '+pass+'\n',
                                   'callBack': null})
                }
                if (queue.length > 0) {
                    utf_outstream.writeString(queue[0].outputData);
                    try {
                        var snd = queue[0].outputData
                        if(snd != status_command && snd.substr(0,9) != "plchanges") {
                            $('mpd_sent').value = snd;
                            $('mpd_response').value = "Working...";
                        }
                    } catch (e) {}
                    debug("OK MPD..."+queue[0].outputData)
                }
                else {done = true}
            }
            else if (this.data.indexOf('ACK [') != -1) {
                try {
                    $('mpd_response').value = this.data
                } catch (e) {}
                var msg = "An error has occured when communicating with MPD.\n" +
                        "Click Cancel to continue sending commands, or\n" +
                        "Click OK to prevent further attempts.\n\n\n" +
                        "Command:\n" + queue[0].outputData + "\n\n" +
                        "Response:\n"+ this.data
                //mpd_stop = confirm(msg)
                queue.shift()
                doStatus = false
                done = true
            }
            if (done) {
                this.data = ""
                if (doStatus) {
                    doStatus = false
                    queue.push({'outputData':status_command,
                                'callBack': statusCallBack})
                    utf_outstream.writeString(status_command)
                }
                else {
                    idle = true
                }
            }
        } catch (e) {
            debug(e)
        }
    },
};

function checkStatus() {
    doStatus = true
    var tm = 200
    if (!talker_active) {talker()}
    if (typeof(utf_outstream) != 'undefined') {
        if (idle) {utf_outstream.writeString("\n")}
    }
    try {
        if (mpd.state != "play") {
            tm = 800
        }
    }
    catch (e) {
    }
    if (!mpd_stop) {setTimeout("checkStatus()", tm)}
}
function statusCallBack (data) {
    var pair, fld, val, dl
    data = data.split("\n")
    var dl = data.length
    do {
        pair = data[dl - 1].split(": ", 2)
        if (pair.length == 2) {
            fld = pair[0]
            val = pair[1]
            try {
                if (val != mpd[fld]) {
                    mpd[fld] = val
                    if (typeof(notify[fld]) == 'function') {
                        notify[fld](val)
                    }
                }
            } catch (e) {debug(e)}
        }
    } while (--dl)
    doStatus = false
}

function simple_cmd (cmd) {
    if (talker_active) {
        debug("simple_cmd: '"+cmd+"' passed to existing transport")
        command(cmd,null)}
    else {
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
                    if (pass.length > 0) {
                        pw = "password " + pass + "\n"
                        smpl_outstream.write(pw, pw.length)
                    }
                    else {
                        smpl_outstream.write(cmd, cmd.length)
                    }
                }
                else if (this.data.slice(-3) == "OK\n") {
                    if (pass.length > 0) {
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
}

var queue = new Array()
function command(outputData, callBack){
    queue.push({'outputData':outputData+"\n", 'callBack':callBack})
    doStatus = true
    if (typeof(utf_outstream) != 'undefined') {
        if (idle) {
            utf_outstream.writeString(queue[0].outputData)
            try {
                $('mpd_sent').value = queue[0].outputData
                $('mpd_response').value = "Working..."
            } catch (e) {}
            idle = false
        }
    }
    else  {talker()}
}
function talker(){
    if (talker_active) { return null }
    transport = transportService.createTransport(null,0,host,port,null);
    outstream = transport.openOutputStream(0,0,0);
    instream = transport.openInputStream(0,0,0);
    utf_instream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                   .createInstance(Components.interfaces.nsIConverterInputStream);
    utf_instream.init(instream, 'UTF-8', 1024, replacementChar);
    utf_outstream = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                   .createInstance(Components.interfaces.nsIConverterOutputStream)
    utf_outstream.init(outstream, 'UTF-8', 0, 0x0000)
    var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].
            createInstance(Components.interfaces.nsIInputStreamPump);
    pump.init(instream, -1, -1, 0, 0, false);
    pump.asyncRead(dataListener,null);
    return null
}

function clean(str){
    try {
        for (var i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) < 32) {
                str = str.slice(0, i) + str.slice(i + 1)
            }
        }
    } catch (e) {return ""}
    return str
}
function parse_db (data) {
    data = data.split("\n")
    var db = []
    var dl = data.length
    if (dl < 1) {return db}
    var n = dl
    do {
        var i = dl - n
        var sep = data[i].indexOf(": ")
        if (sep > -1) {
            var fld = data[i].substr(0, sep)
            var val = clean(data[i].slice(sep+2))
            if (fld == 'file') {
                var song = {
                    'type': 'file',
                    'Name': val,
                    'Track': '0',
                    'Title': val,
                    'Artist': 'unknown',
                    'Album': 'unknown',
                    'Time' : 0
                };
                var d = data[i+1]
                while (d && d.substr(0,6) != "file: ") {
                    var sep = d.indexOf(": ")
                    song[d.substr(0, sep)] = d.slice(sep+2);
                    --n;
                    var d = data[dl - n + 1]
                };
                db.push(song);
            }
            else if (fld == 'directory') {
                var dir = val.split("/")
                db.push({
                        'type': 'directory',
                        'Name': val,
                        'Title': dir[dir.length-1]
                        })
            }
            else if (fld != "OK") {
                db.push({
                        'type': fld,
                        'Name': val,
                        'Title': val
                        })
            }
        }
    } while (--n)
    return db
}

function doPrev() {simple_cmd("previous", null)}
function doStop() {simple_cmd("stop", null)}
function doPlay() {
    if (typeof(mpd) != 'undefined') {
        if (mpd.state == "play") {
            simple_cmd("pause")
        }
        else {
            simple_cmd("play")
        }
    }
    else { simple_cmd("play") }
}
function doPause() {
    if (typeof(mpd) != 'undefined') {
        if (mpd.state == "pause") {
            simple_cmd("play")
        }
        else {
            simple_cmd("pause")
        }
    }
    else { simple_cmd("pause") }
}
function doNext() {simple_cmd("next")}


function openURL(url, attrName) {
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
           .getService(Components.interfaces.nsIWindowMediator);
  for (var found = false, index = 0, browserInstance = wm.getEnumerator('navigator:browser').getNext().getBrowser();
       index < browserInstance.mTabContainer.childNodes.length && !found;
       index++) {
    // Get the next tab
    var currentTab = browserInstance.mTabContainer.childNodes[index];
    // Does this tab contain our custom attribute?
    if (currentTab.hasAttribute(attrName)) {
      // Yes--select and focus it.
      browserInstance.selectedTab = currentTab;
      // Focus *this* browser in case another one is currently focused
      browserInstance.focus();
      browserInstance.loadURI(url)
      found = true;
    }
  }

  if (!found) {
    // Our tab isn't open. Open it now.
    var browserEnumerator = wm.getEnumerator("navigator:browser");
    var browserInstance = browserEnumerator.getNext().getBrowser();
    // Create tab
    var newTab = browserInstance.addTab(url);
    newTab.setAttribute(attrName, "xyz");
    // Focus tab
    browserInstance.selectedTab = newTab;
    // Focus *this* browser in case another one is currently focused
    browserInstance.focus();
  }
}

//send a command with callback on completion
function sendCB(url, callBack){
    var send = new XMLHttpRequest()
    send.open("GET", url, true)
    send.onreadystatechange = function() {
        if (send.readyState == 4) {
            if (send.status == 200) {
                callBack(send.responseText)
                send.onreadystatechange = null
                send = null
            }
            else {
                debug("Error in GET to "+base+url)
                send.onreadystatechange = null
                send = null
            }
        }
    }
    send.send("")
}

function google(item){
    var id = item.Artist
    if (id != 'unknown' && id != "") {id += " "}
    else {id = ""}
    id += item.Title
    id = encodeURI(id)
    var url = "http://www.google.com/musicsearch?q="+id+"&ie=UTF-8&oe=UTF-8"
    openURL(url, "mpm_infoBrowser")
}

function lyricsfreak(id, type){
    id = encodeURI(id)
    switch (type){
        case "Album": var url = "http://www.lyricsfreak.com/search.php?type=album&q="+id;break
        case "Artist": var url = "http://www.lyricsfreak.com/search.php?type=artist&q="+id;break
        default: var url = "http://www.lyricsfreak.com/search.php?type=title&q="+id;break
    }
    openURL(url, "mpm_infoBrowser")
}

function _clean (item) {
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
function getCover(elem, song) {
    elem.src = ""
    var data = ""
    var asin = ""
    if (typeof(song['Artist']) != 'undefined') {
        var artist = _clean(song['Artist'])
    }
    else {
        var artist = ""
    }
    if (typeof(song['Album']) != 'undefined') {
        var album = _clean(song['Album'])
    }
    else {
        var album = ""
    }
    var search_url = "http://musicbrainz.org/ws/1/release/?type=xml&artist="+artist+"&title="+album+"&limit=1"

    if (typeof(art[search_url]) == 'string') {
        elem.src = art[search_url]
    }
    else {
        var cb = function(data){
            art[search_url] = "chrome://minion/content/album_blank.png"
            if (data != "") {
                var s = data.indexOf("<asin>") + 6
                if (s > 6) {
                    var e = data.indexOf("</asin>", s)
                    if (e > 0) {
                        asin = data.slice(s, e)
                    }
                    if (asin.length == 10) {
                        base = "http://images.amazon.com/images/P/" + asin
                        art[search_url] = base + ".01.MZZZZZZZ.jpg"
                    }
                }
            }
            elem.src = art[search_url]
        }
        sendCB(search_url, cb)
    }
}
function mpdOpenURL() {
    simple_cmd('add '+gContextMenu.linkURL)
}

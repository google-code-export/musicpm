/**
 * @author cseickel
 */
var host = "localhost"  //about:config --> extensions.mpm.mpd_host, string type
var port = 6600         //about:config --> extensions.mpm.mpd_port, integer type
var PLmode = "extended" //about:config --> extensions.mpm.playlist_mode, string type
var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);
if (prefs.getPrefType("extensions.mpm.mpd_host") == prefs.PREF_STRING){
    host = prefs.getCharPref("extensions.mpm.mpd_host");
} else {
    prefs.setCharPref("extensions.mpm.mpd_host", host)
}
if (prefs.getPrefType("extensions.mpm.mpd_port") == prefs.PREF_INT){
    port = prefs.getIntPref("extensions.mpm.mpd_port");
} else {
    prefs.setIntPref("extensions.mpm.mpd_port", port)
}
if (prefs.getPrefType("extensions.mpm.playlist_mode") == prefs.PREF_STRING){
    PLmode = prefs.getCharPref("extensions.mpm.playlist_mode");
} else {
    prefs.setCharPref("extensions.mpm.playlist_mode", PLmode)
}
prefs = null

var mpd
var status_command = "command_list_begin\nstatus\nstats\ncommand_list_end\n"
var notify = {}
var talker_active = false
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
        doStatus = true
        checkStatus()
        if (typeof(notify['init']) == 'function') {
            notify['init']()
        }

    }
}
function checkStatus() {
    doStatus = true
    var tm = 200
    if (!talker_active) {talker()}
    try {
        if (mpd.state != "play") {
            tm = 800
        }
    }
    catch (e) {
    }
    setTimeout("checkStatus()", tm)
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



function command(outputData, callback){
    if (typeof(queue) == 'undefined') {var queue = new Array()}
    if (typeof(outputData) == 'string') {
        queue.push({'outputData':outputData+"\n", 'callBack':callBack})
        doStatus = true        
    }
    if (talker_active) { return null }
    var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"]
    .getService(Components.interfaces.nsISocketTransportService);
    var transport = transportService.createTransport(null,0,host,port,null);
    var stream_out = transport.openOutputStream(0,0,0);
    var stream_in = transport.openInputStream(0,0,0);
    const replacementChar = Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
    var instream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                   .createInstance(Components.interfaces.nsIConverterInputStream);
    instream.init(stream_in, 'UTF-8', 1024, replacementChar);
    var outstream = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                   .createInstance(Components.interfaces.nsIConverterOutputStream)
    outstream.init(stream_out, 'UTF-8', 0, 0x0000)

    var dataListener  = {
          data : "",
          onStartRequest: function(request, context){
                    talker_active = true
                    },
          onStopRequest: function(request, context, status){
                    talker_active = false
                    this.data = null
                    instream.close()
                    outstream.close()
                    transport.close(0)
                    },
          onDataAvailable: function(request, context, inputStream, offset, count){
            try {
                var str = {};
                var done = false
                while (instream.readString(1024, str) != 0) {
                    this.data += str.value
                }
                str = null
                if (this.data.substr(0,6) == "OK MPD"){
                    if (queue.length > 0) {
                        this.data = ""
                        outstream.writeString(queue[0].outputData);
                    } else {done = true}
                }
                else if (this.data.slice(-3) == "OK\n") {
                    if (queue.length > 0 && typeof(queue[0].callBack) == 'function') {
                        queue[0].callBack(this.data.slice(0,this.data.length-3))
                    }
                    done = true
                }
                else if (this.data.indexOf('ACK [') != -1) {
                    alert(queue[0].outputData+"\n"+this.data)
                    done = true
                }
                if (done) {
                    queue.shift()
                    this.data = ""
                    if (doStatus) {
                        doStatus = false
                        queue.push({'outputData':status_command,
                                    'callBack': statusCallBack})
                        outstream.writeString(status_command)
                    }
                    else {
                        request.cancel(0)
                    }
                }
            } catch (e) {
                debug(e)
                request.cancel(0)
            }
        },
    };
    var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].
                createInstance(Components.interfaces.nsIInputStreamPump);
    pump.init(stream_in, -1, -1, 0, 0, false);
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
            db.push({'type': 'directory', 'Name': val, 'Title': dir[dir.length-1]})
        }
        else if (fld != "OK") {
            db.push({'type': fld, 'Name': val, 'Title': val})
        }
    } while (--n)
    return db
}

function doPrev() {command("previous", null)}
function doStop() {command("stop", null)}
function doPlay() {
    if (mpd) {
        if (mpd.state == "play") {
            command("pause", null)
        }
        else {
            command("play", null)
        }
    }
    else { command("play", null) }
}
function doPause() {
    if (mpd) {
        if (mpd.state == "pause") {
            command("play", null)
        }
        else {
            command("pause", null)
        }
    }
    else { command("pause", null) }
}
function doNext() {command("next", null)}


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
    if (song['Artist']) {
        var artist = _clean(song['Artist'])
    }
    else {
        var artist = ""
    }
    if (song['Album']) {
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

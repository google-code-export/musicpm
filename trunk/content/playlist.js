var volTmr = false
var seekTmr = false
var seekMax = 0
var noEchoVol = 0
var noEchoSeek = 0
var convertPercent = true
var isLoaded = false
var curSong = 0
var State = "stop"
var PL = []


function hmsFromSec(sec) {
  var hms = "0:00"
  try {sec = parseInt(sec)}
  catch (err) {alert("hmsFromSec: "+err.description);sec = 0}
  if (sec > 0) {
    var h = 0
    if (sec >= 3600) {
      h = Math.floor(sec/3600)
      sec = sec % 3600
      }
    var m = Math.floor(sec/60)
    var s = sec % 60
    if (h > 0){
      h = h + ":"
      if (m.toString().length == 1) {m = "0" + m}
      }
    else {h = ""}
    m = m + ":"
    if (s.toString().length == 1) {s = "0" + s}
    hms = h+m+s
    }
  return hms
  }
function prettyTime(sec) {
  var tm = ""
  try {sec = parseInt(sec)}
  catch (err) {debug("prettyTime: "+err.description);sec = 0}
  if (sec > 0) {
    var d = Math.floor(sec / 86400)
    sec = sec % 86400
    var h = Math.floor(sec / 3600)
    sec = sec % 3600
    var m = Math.floor(sec / 60)
    var s = sec % 60

    if (d > 0) {
        tm = d + " day"
        if (d > 1){tm +="s"}
        var hs = " hr"
        var ms = " min"
        var ss = " sec"
    }
    else {
        var hs = " hour"
        var ms = " minute"
        var ss = " second"
    }
    if (h > 0) {
        if (tm.length > 0) {
            tm += ", "
        }
        tm += h + hs
        if (h > 1){tm +="s"}
    }
    if (m > 0) {
        if (tm.length > 0) {
            tm += ", "
        }
        tm += m + ms
        if (m > 1){tm +="s"}
    }
    if (s > 0) {
        if (tm.length > 0) {
            tm += ", "
        }
        tm += s + ss
        if (s > 1){tm +="s"}
    }
  }
  return tm
}
function toPercent (val, max) {
  return Math.round((val / max) * 100 )
  }
function fromPercent (val, max) {
  r = (val/100)*max
  return Math.round(r)
  }

function init(){
  if (!isLoaded){
      var port = 8008
      var success = false
      do {
        try {
            serverSocket.init(port, false, -1)
            var con = new XMLHttpRequest()
            con.open("GET", base+"/connect?port="+port, false)
            con.send("")
            if (con.responseText == "OK") {
                success = true
                }
            else {
                serverSocket.close()
                port++
                }
        }
        catch (err) {
            port++
        }
    } while (port < 8012 && !success)
    serverSocket.asyncListen(listener);
    isLoaded = true
    send("/connect?port="+port)
    }
  }
function cleanup(){
  if (isLoaded){
    var die = new XMLHttpRequest()
    die.open("GET", base+"/disconnect?port="+serverSocket.port, false)
    die.send("")
    if (serverSocket) serverSocket.close();
    isLoaded = false
    }
  }

var dataListener = {
    data: "",
    onStartRequest: function(request, context){},
    onStopRequest: function(request, context, status){
        },
    onDataAvailable: function(request, context, inputStream, offset, count){
        this.data += instream.read(count);
        var s = 0
        var e = 0
        do {
            s = this.data.indexOf("START::")
            e = this.data.indexOf("::END")
            if (s >= 0 && e > 0) {
                listener.finished(this.data.slice(s+7, e))
                this.data = this.data.substr(e+5)
                }
            } while (s >= 0 && e > 0)
        }
    }
var listener = {
    onSocketAccepted : function(serverSocket, transport){
                var stream = transport.openInputStream(0,0,0);
                instream.init(stream);
                pump.init(stream, -1, -1, 0, 0, true);
                pump.asyncRead(dataListener, null);
                },
    finished: function(data){
        if (data.length > 0) {
            var regexp = /^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/
            var script = data.split(";")
            for (item in script){
            var s = script[item]
            try {
                var s_test = s.replace(/\\./g, '@')
                             .replace(/"[^"\\\n\r]*"/g, '')
                             .replace(/'[^'\\\n\r]*'/g, '')
                if (regexp.test(s_test)) {
                    try {
                        s = eval(s)
                        switch (s[0]) {
                            case "setCurSong": setCurSong(s[1]); break;
                            case "setState": setState(s[1]); break;
                            case "setTime": setTime(s[1], s[2]); break;
                            case "setVol": setVol(s[1], s[2]); break;
                            case "setDB": setDB(s[1]); break;
                            case "setRandom": setRandom(s[1]); break;
                            case "setRepeat": setRepeat(s[1]); break;
                            case "setPlaylist": setPlaylist(s[1], s[2], s[3]); break;
                            default: alert("'"+s[0]+"' is an unrecognized command."); break;
                            }
                        }
                    catch(err){
                        //alert("Error evaluating script: "+script[item])
                        }
                    }
                else {alert("FAILED EVAL SAFETY TEST: "+s)}
                }
            catch(err){
                alert(s+" ERROR: "+err.description)
                }
            }
        }
        },
    onStopListening : function(serverSocket, status){}
    };
var observer = {
  onBeginLoad : function(sink){},
  onInterrupt : function(sink){},
  onResume : function(sink){},
  onError : function(sink,status,msg){},

  onEndLoad : function(sink){
    sink.removeXMLSinkObserver(this);
    sink.QueryInterface(Components.interfaces.nsIRDFDataSource);
    var boxobject = $('playlist').boxObject;
    boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
    boxobject.invalidate();
    setCurSong(curSong);
  }
};
var observer_2 = {
  onBeginLoad : function(sink){},
  onInterrupt : function(sink){},
  onResume : function(sink){},
  onError : function(sink,status,msg){},

  onEndLoad : function(sink){
    sink.removeXMLSinkObserver(this);
    sink.QueryInterface(Components.interfaces.nsIRDFDataSource);
    setCurSong(curSong);
  }
};
function scaleChange(elem, val) {
  if (elem.id == "vol_slider") {
    if(elem.value != noEchoVol) {
      if (volTmr) {clearTimeout(volTmr)}
      noEchoVol = elem.value
      volTmr = setTimeout('volChange()', 200)
      }
    }
  if (elem.id == "progress") {
    if (mpd.state == 'stop') {
        elem.value = 0
    }
    else {
    if(elem.value != noEchoSeek) {
      if (seekTmr) {clearTimeout(seekTmr)}
      noEchoSeek = elem.value
      seekTmr = setTimeout('seekChange()', 500)
      }
    }
  }
}

//Proxy function for progressmeter in < firefox 3
function prgmtrChange(event) {
  var element = event.target;
  var elementX = event.clientX - element.boxObject.x;
  var elementW = element.boxObject.lastChild.boxObject.width + element.boxObject.firstChild.boxObject.width
  var val = Math.round(elementX/elementW*100)
  element.value = val
  scaleChange(element)
  }

function volChange(){
  var e = $('vol_slider')
  command('setvol '+e.value, null)
  volTmr = false
  }

function seekChange(){
  var e = $('progress')
  if (mpd.state != 'stop') {command('seek '+mpd.song+' '+fromPercent(e.value, seekMax), null)}
  seekTmr = false
  }

function setVol(val) {
  if (!volTmr) {
    noEchoVol = val
    $('vol_slider').value=val
    }
  }

function setTime(val) {
    var t = val.split(":")
    var val = parseInt(t[0])
    var max = parseInt(t[1])
    if (!seekTmr) {
        if (max) {
            $('totalTm').value = hmsFromSec(max)
            seekMax = max
        }
        $('elapsedTm').value = hmsFromSec(val)
        val = toPercent(val, seekMax)
        noEchoSeek = val
        $('progress').value=val
    }
}

function mute(e) {
  vs = $('vol_slider')
  if (vs.value == 0) {
    vs.value = e.value
    }
  else {
    e.value = vs.value
    vs.value = 0
    }
  scaleChange(vs)
  }

function setDB(db) {
    dbVersion = db
    try {
        setColDB(db)
        files_ds.QueryInterface(Components.interfaces.nsIRDFXMLSink);
        files_ds.addXMLSinkObserver(observer);
        albums_ds.QueryInterface(Components.interfaces.nsIRDFXMLSink);
        albums_ds.addXMLSinkObserver(observer2);
    }
    catch(err){
        files_ds = rdfService.GetDataSource(base+"/static/rdf/songs-"+db+".xml")
        files_ds.QueryInterface(Components.interfaces.nsIRDFXMLSink);
        files_ds.addXMLSinkObserver(observer);
        }
    }

function setState(state) {
    State = state
    $('playpause').className = state
    $('lbl_title').className = state
    if (state == 'stop') {
        setCurSong(-1)
        setTime("0:0")
    }
    else {setCurSong(mpd.song)}
}

function setRandom(val) {
    if (val == "1" || val == 1) {
        $('playlist_random').className = "on"
        }
    else {
        $('playlist_random').className = ""
        }
    }

function setRepeat(val) {
    if (val == "1" || val == 1) {
        $('playlist_repeat').className = "on"
        }
    else {
        $('playlist_repeat').className = ""
        }
    }


function parseRDFString(str, url){
    var memoryDS = Components.classes["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"]
                     .createInstance(Components.interfaces.nsIRDFDataSource);
    var ios=Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService);
    baseUri=ios.newURI(url,null,null);
    var parser=Components.classes["@mozilla.org/rdf/xml-parser;1"]
                         .createInstance(Components.interfaces.nsIRDFXMLParser);
    parser.parseString(memoryDS,baseUri,str);
    return memoryDS;
    }

function setCurSong(id) {
    try {
        var t = $('lbl_title')
        var a = $('lbl_artist')
        var b = $('lbl_album')
        var art = $("cur_album_art")
        if (id == -1){
            if (t) {t.value = "Not Playing"}
            if (a) {a.value = "Nobody"}
            if (b) {b.value = "Nowhere"}
            if (art) {art.src = "", art.value = ""}
            $('progress').value = '0'
            }
        else {
            $('progress').mode = 'determined'
            centerPL()
            song = PL[parseInt(id)]
            if (typeof(song) == 'object') {
                if (t) {t.value = song['Title']}
                if (a) {a.value = song['Artist']}
                if (b) {b.value = song['Album']}
                if (art) {
                    art.value = song.Album
                    getCover(art, song)
                }
            }
            else {
                setTimeout("setCurSong("+id+")", 222)
            }
        }
    }
    catch (e) {
        debug("setCurSong: "+e.description)
    }
}


function assignPLview() {
    var tree = $('playlist')
    if (PLmode=="extended"){
        tree.view = {
            rowCount : PL.length*3,
            getCellText : function (R, C) {
                var pos = Math.floor(R/3)
                var r = R - (pos*3)
                var item = PL[pos]

                if (typeof(item) != 'object') {
                    return null
                    }
                if (C.id=="Position"){
                    if (r==0) {return (pos+1)+"."}
                    else {return ""}
                    }
                if (C.id=="PLtime" && r > 0){return ""}
                var field
                if (C.id=="PLtime"){return hmsFromSec(item["Time"])}
                else {
                    switch (r) {
                        case 0: field = "Title";break;
                        case 1: field = "Artist";break;
                        case 2: field = "Album";break;
                        }
                    }
                return item[field]
                },
            setTree: function(treebox){ this.treebox = treebox; },
            isContainer: function(row){ return false; },
            isSeparator: function(row){ return false; },
            isSorted: function(){ return false; },
            getLevel: function(row){ return 0; },
            getImageSrc: function(row,col){ return null; },
            getRowProperties: function(row,props){
                var pos = Math.floor(row/3)
                var r = row - (pos*3)
                var eo1 = row % 2
                var eo3 = pos % 2
                if ( eo3 != eo1 ) {
                    if (eo3 == 0) {
                        props.RemoveElement( aserv.getAtom("odd") )
                        props.AppendElement( aserv.getAtom("even") )
                    }
                    else {
                        props.RemoveElement( aserv.getAtom("even") )
                        props.AppendElement( aserv.getAtom("odd") )
                    }
                }
                if (r==0){props.AppendElement( aserv.getAtom("Title") )}
                if (r==1){props.AppendElement( aserv.getAtom("Artist") )}
                if (r==2){props.AppendElement( aserv.getAtom("Album") )}
                },
            getCellProperties: function(row,col,props){
                if (col.id=="PLsong") {
                var pos = Math.floor(row/3)
                var r = row - (pos*3)
                if (r==0){props.AppendElement( aserv.getAtom("Title") )}
                if (r==1){props.AppendElement( aserv.getAtom("Artist") )}
                if (r==2){props.AppendElement( aserv.getAtom("Album") )}
                }
                },
            getColumnProperties: function(colid,col,props){}
            };
        }
    else {
        tree.view = {
            rowCount : PL.length,
            getCellText : function (R, C) {
                if (typeof(PL[R]) != 'object') {
                    return null
                    }
                if (C.id=="Position"){
                    return (R+1)+"."
                    }
                var field = "Title"
                if (C.id=="PLtime"){return hmsFromSec(PL[R]["Time"])}
                return PL[R][field]
                },
            setTree: function(treebox){ this.treebox = treebox; },
            isContainer: function(row){ return false; },
            isSeparator: function(row){ return false; },
            isSorted: function(){ return false; },
            getLevel: function(row){ return 0; },
            getImageSrc: function(row,col){ return null; },
            getRowProperties: function(row,props){
                props.AppendElement( aserv.getAtom("Title") )
                },
            getCellProperties: function(row,col,props){
                if (col.id=="PLsong") {
                    props.AppendElement( aserv.getAtom("Title") )
                    }
                },
            getColumnProperties: function(colid,col,props){}
            };
        }
  }

function playlist_view(mode){
    var cur = 0
    var boxobject = $('playlist').boxObject;
    boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
    cur = boxobject.getFirstVisibleRow()
    if (PLmode == "extended" && cur > 0) {cur = Math.floor(cur/3)}
    PLmode = mode
    assignPLview()
    if (PLmode == "extended" && cur > 0) {cur = cur * 3}
    boxobject.scrollToRow(cur)
    }

function setPlaylist(ver) {
    var cb = function(data){
        data = data.split("\n")
        PL = []
        var tm = 0
        var dl = data.length
        if (dl > 1) {
            var n = dl
            do {
                var i = dl - n
                var sep = data[i].indexOf(": ")
                if (data[i].substr(0, sep) == 'file') {
                    var song = {
                        'Title': data[i].slice(sep+2),
                        'Artist': 'unknown',
                        'Album': 'unknown',
                        'Time': 0
                    };
                    var d = data[i + 1]
                    while (d && d.substr(0, 6) != "file: ") {
                        var sep = d.indexOf(": ")
                        song[d.substr(0, sep)] = d.slice(sep+2);
                        --n;
                        var d = data[dl - n + 1]
                    };
                    PL.push(song);
                    tm += parseInt(song['Time'])
                }
            }
            while (--n)
        }
        playlist_view(PLmode)
        $("pl_stats").value = prettyTime(tm)
    }
    command("playlistinfo", cb)
}

function playlist_dblclick() {
    if (PLmode == "extended") {
        var id = Math.floor($('playlist').currentIndex / 3)
    }
    else {
        var id = $('playlist').currentIndex
    }
  command('play '+id,null)
  }

function playlist_googleIt() {
    if (PLmode == "extended") {
        var id = Math.floor($('playlist').currentIndex / 3)
    }
    else {
        var id = $('playlist').currentIndex
    }
    google(PL[id])
}

function playlist_lyricsfreak()  {
    if (PLmode == "extended") {
        var id = Math.floor($('playlist').currentIndex / 3)
        var r = $('playlist').currentIndex - (id*3)
        switch (r) {
            case 0: lyricsfreak(PL[id]['Title'], "file"); break;
            case 1: lyricsfreak(PL[id]['Artist'], "Artist"); break;
            case 2: lyricsfreak(PL[id]['Album'], "Album"); break;
            }
    }
    else {
        var id = $('playlist').currentIndex
        lyricsfreak(PL[id]['Title'], "file")
    }
  }

function load_playlist(id){
    command("clear", null)
    command('load "'+id+'"', null)
}
function playlist_save(){
    var val = prompt("Please enter a name for this playlist", "NewPlaylist")
    if (val != null) {
        command('save "'+val+'"', null)
    }
}
function playlist_shuffle() {
  command("shuffle", null)
  }
function playlist_random() {
  var val = 1
  if (mpd.random == '1') {val = 0}
  command("random "+val, null)
  }
function playlist_repeat() {
  var val = 1
  if (mpd.repeat == '1') {val = 0}
  command("repeat "+val, null)
  }

function selectItem(pos) {
    var tree = $('playlist')
    var pstart = pos*3
    var pend = pstart+2
    for (var i=pstart;i<=pend;i++) {
        if (!tree.view.selection.isSelected(i)) {
            tree.view.selection.rangedSelect(i,i,true);
            }
        }
    }
function playlist_select(R) {
    if (PLmode=="extended"){
        var tree = $('playlist')
        var pos = Math.floor(R/3)
        selectItem(pos)
        //The first and last items tend to deselect during shift select.
        var start = new Object();
        var end = new Object();
        var numRanges = tree.view.selection.getRangeCount()
        tree.view.selection.getRangeAt(0,start,end)
        pos = Math.floor(start.value/3)
        selectItem(pos)
        if (numRanges > 1) {tree.view.selection.getRangeAt(numRanges-1,start,end)}
        pos = Math.floor(end.value/3)
        selectItem(pos)
        $('playlist').currentIndex = R
        }
    }

function remove() {
    var tree=$("playlist")
    var start = new Object();
    var end = new Object();
    var numRanges = tree.view.selection.getRangeCount();
    var pos
    var offset = 0
    var pstart
    var cmd = "command_list_begin"

    if (PLmode == 'extended') {
        for (var t=0; t<numRanges; t++){
            tree.view.selection.getRangeAt(t,start,end);
            for (var v=start.value; v<=end.value; v++){
                pos = Math.floor(v/3)
                pstart = pos*3
                if (v==pstart){
                    cmd += "\ndelete "+ (pos-offset)
                    offset++
                }
            }
        }
    }
    else {
        for (var t=0; t<numRanges; t++){
            tree.view.selection.getRangeAt(t,start,end);
            for (var v=start.value; v<=end.value; v++){
                cmd += "\ndelete "+ (v-offset)
                offset++
            }
        }
    }

    cmd += "\ncommand_list_end"
    command(cmd, null)
}

function clear() {
  command("clear", null)
  }

function centerPL() {
    var row = (mpd.song)
    if (PLmode == "extended") {row = row*3}
    var boxobject = $('playlist').boxObject;
    boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
    boxobject.scrollToRow(row)
    boxobject.ensureRowIsVisible(row)
    }

function parseRDFString(str, url){
    var memoryDS = Components.classes["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"]
                     .createInstance(Components.interfaces.nsIRDFDataSource);
    var ios=Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService);
    baseUri=ios.newURI(url,null,null);
    var parser=Components.classes["@mozilla.org/rdf/xml-parser;1"]
                         .createInstance(Components.interfaces.nsIRDFXMLParser);
    parser.parseString(memoryDS,baseUri,str);
    return memoryDS;
    }

function xmlEscape (s) {
    if (!s) {return ''}
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g,"&quot;")
}
function dbRDF(items, about, filter){
    var name = ""
    var rdfString ='<RDF:RDF xmlns:RDF="http://www.w3.org/1999/02/22-rdf-syntax-ns#" \n' +
                    '    xmlns:s="mpd_"\n' +
                    '    xmlns:nc="http://home.netscape.com/NC-rdf#">\n\n'
    var rdfSeq = ' <RDF:Seq about="'+about+'">\n'
    for (x in items){
        try {
            var item = items[x]
            if (filter[item.type]) {
                rdfString += ' <RDF:Description about="mpd://'+item.type+'/'+x+'">\n'
                for (p in items[x]) {
                    rdfString += '   <s:'+p+'>'+xmlEscape(item[p])+'</s:'+p+'>\n'
                }
                rdfString += ' </RDF:Description>\n'
                rdfSeq += '  <RDF:li resource="mpd://'+item.type+'/'+x+'"/>\n'
            }
        } catch(e) {debug("dbRDF item "+x+": "+e.description)}
    }
    var rdf = rdfString + rdfSeq + '</RDF:Seq></RDF:RDF>'
    return parseRDFString(rdf, about+"/temp")
}


function playlist_openPopup(){
    var cb = function(data) {
        playlists_ds = dbRDF(parse_db(data), "mpd://playlists", {'playlist': true})
        $('playlist_open_popup').database.AddDataSource(playlists_ds)
        $('playlist_open_popup').ref="mpd://playlists"
    }
    command('lsinfo', cb)
}
function playlist_contextShowing () {
    if (typeof(active_item) != 'undefined') {
        if (PLmode == "extended") {
            active_item = PL[Math.floor($('playlist').currentIndex / 3)]
        }
        else {
            active_item = PL[$('playlist').currentIndex]
        }
        $('playlist_context_album').hidden = false;
        $('playlist_context_artist_songs').hidden = false;
        $('playlist_context_artist_albums').hidden = false;
    }
    else {
        $('playlist_context_album').hidden = true;
        $('playlist_context_artist_songs').hidden = true;
        $('playlist_context_artist_albums').hidden = true;
    }
}

notify['song'] = setCurSong
notify['state'] = setState
notify['time'] = setTime
notify['volume'] = setVol
notify['random'] = setRandom
notify['repeat'] = setRepeat
notify['playlist'] = setPlaylist


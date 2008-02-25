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

var PL = new Array()
var PLver = 0
var pds
var lastPlaylistName = "NewPlaylist"
var plDrag = false
var plObserver = {
    onDragStart: function (event, transferData, action) {
        var row = { }
        var col = { }
        var child = { }
        $('playlist').treeBoxObject.getCellAt(event.pageX, event.pageY, row, col, child)
        if (!col.value) {  return }
        plDrag = true
        var pos = $('playlist').currentIndex
        if (PLmode == 'extended') { pos = Math.floor(pos/3) }
        var song = PL[pos]
        var plainText = song.Artist + " - " + song.Album + " - " + song.Title;
        transferData.data = new TransferData();
        transferData.data.addDataForFlavour("text/unicode",plainText);
        transferData.data.addDataForFlavour("mpm/playlist",pos);
    },
    onDragOver: function (event, flavour, session) {
    },
    onDragExit: function (event, session) {
        plDrag = false
    },
    getSupportedFlavours : function () {
        var flavours = new FlavourSet();
        flavours.appendFlavour("mpm/filename");
        flavours.appendFlavour("application/x-moz-url");
        flavours.appendFlavour("application/x-moz-file");
        flavours.appendFlavour("text/unicode");
        return flavours;
    },
    onDrop: function (event, dropData, session) {
        if (dropData.flavour.contentType == "mpm/filename") {
            add()
        }
        else {
            try {
                var s = dropData.data.replace(/"/g, "")
                var v = new RegExp();
                v.compile(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/);
                if (v.test(s)) {
                    mpm_handleURL(s)
                }
            } catch (e) {debug(e)}
        }
        event.stopPropagation()
    }
}
var csObserver = {
    onDragStart: function (event, transferData, action) {
        var song = PL[mpd.song]
        var plainText = song.Artist + " - " + song.Album + " - " + song.Title;
        transferData.data = new TransferData();
        transferData.data.addDataForFlavour("text/unicode",plainText);
    },
    onDragOver: function (event, flavour, session) {
    },
    onDragExit: function (event, session) {
    },
    getSupportedFlavours : function () {
        var flavours = new FlavourSet();
        flavours.appendFlavour("mpm/filename");
        return flavours;
    },
    onDrop: function (event, dropData, session) {
        if (dropData.flavour.contentType == "mpm/filename") {
            var l = mpd.playlistlength
            add()
            command('play '+l,null)
        }
        event.stopPropagation()
    }
}

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
  return Math.round((val/100)*max)
  }

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
    command('setvol '+$('vol_slider').value, null)
    volTmr = false
}

function seekChange(){
    if (mpd.state != 'stop') {
        command('seek '+mpd.song+' '+fromPercent($('progress').value, seekMax), null)
    }
    seekTmr = false
}

function setVol(val) {
    if (!volTmr) {
        noEchoVol = val
        $('vol_slider').value=val
    }
}
function upVol() {
    var v = $('vol_slider')
    v.value = parseInt(v.value) + 5
    scaleChange(v)
}
function downVol() {
    var v = $('vol_slider')
    v.value -= 5
    scaleChange(v)
}

function songScroll(event) {
    var t = mpd.time.split(":")
    var e = parseInt(t[0]) + (event.detail * -2)
    mpd.time = e+":"+t[1]
    $('elapsedTm').value = hmsFromSec(e)
    simple_cmd("seek " + mpd.song + " " + e)
}
function volScroll(event) {
    var v = $('vol_slider')
    v.value = parseInt(v.value) + (event.detail * -2)
    if (v.value < 0) v.value = 0
    if (v.value > 100) v.value = 100
    scaleChange(v)
}
function setTime(val) {
    if (!seekTmr) {
        var t = val.split(":")
        var val = parseInt(t[0])
        var max = parseInt(t[1])
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
    var vs = $('vol_slider')
    if (vs.value == 0) {
        vs.value = e.value
    }
    else {
        e.value = vs.value
        vs.value = 0
    }
    scaleChange(vs)
}

function setState(state) {
    $('playpause').className = state
    $('lbl_title').className = state
    if (state == 'stop') {
        setCurSong(-1)
        setTime("0:0")
        mpd.currentsong = ""
        var tree = $('files')
        if (tree) {
            var boxobject = tree.boxObject;
            boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
            boxobject.invalidate()
        }
        var tree = $('playlist')
        if (tree) {
            var boxobject = tree.boxObject;
            boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
            boxobject.invalidate()
        }
    }
    else {setCurSong(mpd.song)}
}

function setRandom(val) {
    if (val == "1" || val == 1) {
        $('mpm_random').setAttribute('checked','true')
    }
    else {
        $('mpm_random').setAttribute('checked','false')
    }
}

function setRepeat(val) {
    if (val == "1" || val == 1) {
        $('mpm_repeat').setAttribute('checked','true')
    }
    else {
        $('mpm_repeat').setAttribute('checked','false')
    }
}

function setCurSong(id) {
    try {
        if (id == -1){
            $('progress').value = '0'
            var tree = $('files')
            if (tree) {
                var boxobject = tree.boxObject;
                boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
                boxobject.invalidate()
            }
            var tree = $('playlist')
            if (tree) {
                if (!tree.collpased) {
                    var boxobject = tree.boxObject;
                    boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
                    boxobject.invalidate()
                }
            }
        }
        else {
            var t = $('lbl_title')
            var a = $('lbl_artist')
            var b = $('lbl_album')
            var art = $("cur_album_art")
            var cb = function(data){
                song = parse_db(data)[0]
                if (t) {
                    t.value = song['Title']
                }
                if (a) {
                    a.value = song['Artist']
                }
                if (b) {
                    b.value = song['Album']
                }
                if (art) {
                    art.value = song.Album
                    getCover(art, song)
                }
                if (mpd.state == 'play') {
                    centerPL()
                }
                mpd.currentsong = song.Name
                var tree = $('files')
                if (tree) {
                    var boxobject = tree.boxObject;
                    boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
                    boxobject.invalidate()
                }
                var tree = $('playlist')
                if (tree) {
                    if (!tree.collpased) {
                        var boxobject = tree.boxObject;
                        boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
                        boxobject.invalidate()
                    }
                }
            }
            command('currentsong', cb)
        }
    }
    catch (e) {
        debug("setCurSong: "+e.description)
    }
}


function assignPLview() {
    var tree = $('playlist')
    tree.view = null
    if (typeof(PL) != 'undefined') {var l = PL.length}
    else {var l = 0; PL = new Array();}
    if (PLmode=="extended"){
        tree.view = {
            rowCount : l*3,
            getCellText : function (R, C) {
                if (typeof(PL) == 'undefined') {return ''}
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
                try {
                var pos = Math.floor(row/3)
                var r = row - (pos*3)
                var eo1 = row % 2
                var eo3 = pos % 2
                var aserv = Components.classes["@mozilla.org/atom-service;1"]
                            .getService(Components.interfaces.nsIAtomService);
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
                pos = null; r = null; eo1 = null; eo3 = null; aserv = null
                } catch(e) {}
                },
            getCellProperties: function(row,col,props){
                var pos = Math.floor(row/3)
                var r = row % 3
                if (col.id=="PLsong") {
                    try {
                    var aserv = Components.classes["@mozilla.org/atom-service;1"]
                            .getService(Components.interfaces.nsIAtomService);
                    if (r==0){
                        props.AppendElement( aserv.getAtom("Title") )
                        props.AppendElement( aserv.getAtom("Title_song") )
                        if (PL[pos].Name == mpd.currentsong) {
                            props.AppendElement(aserv.getAtom(mpd.state+"_currentsong"))
                            props.AppendElement(aserv.getAtom("currentsong"))
                        }
                    }
                    if (r==1){props.AppendElement( aserv.getAtom("Artist") )}
                    if (r==2){props.AppendElement( aserv.getAtom("Album") )}
                    pos = null; r = null; aserv = null
                    } catch(e) {}
                }
            },
            getParentIndex: function(idx) {return -1},
            getColumnProperties: function(colid,col,props){},
            canDrop: function(row, orient) {
                    return plDrag
                },
            drop: function(row, orient){
                    if(plDrag){
                        var offset = row % 3
                        var moveto = Math.floor((row)/3)
                        if (row < tree.currentIndex){
                            if (offset > 1) {moveto++}
                        }
                        else {
                            if (offset < 1) {moveto--}
                        }
                        playlist_move(moveto)
                    }
                    else {}
                }
            };
        }
    else {
        tree.view = {
            rowCount : l,
            getCellText : function (R, C) {
                if (typeof(PL) == 'undefined') {return ''}
                if (typeof(PL[R]) != 'object') {
                    return ''
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
                try {
                    var aserv = Components.classes["@mozilla.org/atom-service;1"]
                            .getService(Components.interfaces.nsIAtomService);
                    props.AppendElement( aserv.getAtom("Title") )
                } catch(e) {debug(e)}
                },
            getCellProperties: function(row,col,props){
                if (col.id == "PLsong") {
                    try {
                        var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
                        props.AppendElement(aserv.getAtom("Title"))
                        props.AppendElement(aserv.getAtom("Title_song"))
                        if (PL[row].Name == mpd.currentsong) {
                            props.AppendElement(aserv.getAtom(mpd.state + "_currentsong"))
                            props.AppendElement(aserv.getAtom("currentsong"))
                        }
                    }
                    catch (e) {
                        debug(e)
                    }
                }
                },
            getParentIndex: function(idx) {return -1},
            getColumnProperties: function(colid,col,props){},
            canDrop: function(index, orient) {return plDrag},
            drop: function(row,orient){
                if(plDrag){
                    if (tree.currentIndex < row) {
                        if (orient == -1) {row--}
                    }
                    else {
                        if (orient == 1) {row++}
                    }
                    playlist_move(row)}
                }
            };
        }
        l = null
  }

function playlist_view(mode){
    if ($('playlist').collapsed) {
        assignPLview()
        return null
    }
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

function setPlaylist(data) {
    data = data.split("\n")
    var tm = 0
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
                    var fld = d.substr(0, sep)
                    if (typeof(song[fld]) != 'undefined') {
                        song[fld] = d.slice(sep+2);
                    }
                    --n;
                    var d = data[dl - n + 1]
                };
                tm += parseInt(song['Time'])
                PL[parseInt(song.Pos)] = song
            }
        }
        while (--n)
        playlist_view(PLmode)
    }
    else {
        if (PL.length != $('playlist').view.rowCount) {playlist_view(PLmode)}
    }
    var tm = 0
    var l = PL.length
    if (l > 0) {
        var tm = 0
        do {
            try {tm += parseInt(PL[l-1]['Time'])}
            catch (e) {debug(e)}
        } while (--l)
    }
    $("pl_stats").value = prettyTime(tm)
    data = null
    mpd.song = -1
    if (typeof(table) != 'undefined') {
        if (mpm_history[0][0]=='playlist' && mpm_history[0][1]=='[current]') {
            setTable(cpyArray(PL))
        }
    }
}
function getPlaylist(ver) {
    if (isNaN(PLver)) {
        command("playlistinfo", setPlaylist)
    }
    else if (PLver < 0) {
        command("playlistinfo", setPlaylist)
    }
    else {
        command("plchanges " + PLver, setPlaylist)
    }
    PLver = ver
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

function playlist_keydown(event) {
    switch (event.which){
        case 13: playlist_dblclick(); break;
        case 38:
            if (PLmode=="extended") {
                var tree = $('playlist')
                tree.currentIndex = (Math.floor(tree.currentIndex/3)*3)-2
                event.stopPropagation()
            };
            break;
        case 40:
            if (PLmode=="extended") {
                var tree = $('playlist')
                tree.currentIndex = (Math.floor(tree.currentIndex/3)*3)+4
                event.stopPropagation()
            };
            break;
        case 65:
            if (event.ctrlKey) {
                $('playlist').view.selection.selectAll()
                event.stopPropagation()
            }; break;
        case 46: remove(); break
        default: //alert(event.which);
            break;
    }
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
    lastPlaylistName = id
    command('command_list_begin\nclear\nload "'+id+'"\ncommand_list_end\n', null)
}

function playlist_save(){
    var val = prompt("Please enter a name for this playlist", lastPlaylistName)
    if (val != null) {
        lastPlaylistName = val
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
function playlist_select(event, R) {
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
        tree.currentIndex = R
        event.stopPropagation()
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

function playlist_move_next() {
    var moveto = parseInt(mpd.song)
    var pos = $('playlist').currentIndex
    if (PLmode == 'extended') {pos = Math.floor(pos/3)}
    if (moveto < pos) { moveto++}
    playlist_move(moveto)
}
function playlist_move(moveto) {
    var tree=$("playlist")
    var start = new Object();
    var end = new Object();
    var numRanges = tree.view.selection.getRangeCount();
    var offset = 0
    var cmd = "command_list_begin"
    var back = false
    moveto = parseInt(moveto)
    if (moveto < 0 ) {moveto = 0}
    else if (moveto >= mpd.playlistlength) {moveto = mpd.playlistlength - 1}

    if (PLmode == 'extended') {
        var pstart
        var pos
        for (var t=0; t<numRanges; t++){
            tree.view.selection.getRangeAt(t,start,end);
            for (var v=start.value; v<=end.value; v++){
                pos = Math.floor(v/3)
                pstart = pos*3
                if (v==pstart){
                    if (pos < moveto) {
                        cmd += "\nmove " + (pos-offset) + " " + moveto
                        offset++
                    }
                    else {
                        cmd += "\nmove " + pos + " " + (moveto + offset)
                        offset++
                    }
                }
            }
        }
    }
    else {
        for (var t=0; t<numRanges; t++){
            tree.view.selection.getRangeAt(t,start,end);
            for (var v=start.value; v<=end.value; v++){
                if (v < moveto) {
                    cmd += "\nmove "+ (v-offset) + " " + moveto
                    offset++
                }
                else {
                    cmd += "\nmove "+ v + " " + (moveto + offset)
                    offset++
                }
            }
        }
    }

    cmd += "\ncommand_list_end"
    command(cmd, null)
}

function clear(){
    lastPlaylistName = "NewPlaylist"
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

function dbRDF(items, about, filter){
    var name = ""
    var rdfString ='<RDF:RDF xmlns:RDF="http://www.w3.org/1999/02/22-rdf-syntax-ns#" \n' +
                    '    xmlns:s="mpd_"\n' +
                    '    xmlns:nc="http://home.netscape.com/NC-rdf#">\n\n'
    var rdfSeq = ' <RDF:Seq about="'+about+'">\n'

    function xmlEscape (s) {
        if (!s) {return ''}
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g,"&quot;")
    }

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

    var memoryDS = Components.classes["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"]
                     .createInstance(Components.interfaces.nsIRDFDataSource);
    var ios=Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService);
    var baseUri=ios.newURI(about+"/temp",null,null);
    var parser=Components.classes["@mozilla.org/rdf/xml-parser;1"]
                         .createInstance(Components.interfaces.nsIRDFXMLParser);
    parser.parseString(memoryDS,baseUri,rdfString + rdfSeq + '</RDF:Seq></RDF:RDF>');
    return memoryDS;
}


function playlist_openPopup(){
    var cb = function(data) {
        var p = $('playlist_open_popup')
        if (pds) {p.database.RemoveDataSource(pds)}
        pds = dbRDF(parse_db(data), "mpd://playlists", {'playlist': true})
        $('playlist_open_popup').database.AddDataSource(pds)
        $('playlist_open_popup').ref="mpd://playlists"
    }
    command('lsinfo', cb)
}
function playlist_contextShowing () {
    if (PLmode == "extended") {
        var pos = Math.floor($('playlist').currentIndex / 3)
    }
    else {
        var pos = $('playlist').currentIndex
    }
    if (typeof(active_item) != 'undefined') {
        active_item = PL[pos]
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
notify['playlist'] = getPlaylist
notify['playlistlength'] = function (l) {PL.length = l}



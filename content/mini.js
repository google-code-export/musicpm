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

function mini_init() {
    $('vol_slider').addEventListener("DOMMouseScroll", volScroll, false)
    $('mini_song').addEventListener("DOMMouseScroll", songScroll, false)
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
function toPercent (val, max) {
  return Math.round((val / max) * 100 )
}
function fromPercent (val, max) {
  r = (val/100)*max
  return Math.round(r)
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
function songScroll(event) {
    var t = mpd.time.split(":")
    var e = parseInt(t[0]) + (event.detail * -2)
    mpd.time = e+":"+t[1]
    $('elapsedTm').value = hmsFromSec(e)
    simple_cmd("seek " + mpd.song + " " + e)
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
            var t = $('lbl_title')
            t.value = 'Not Playing'
            t.setAttribute('tooltiptext', 'Not Playing')
            $('totalTm').value = '0:00'
        }
        else {
            var cb = function(data){
                var t = $('lbl_title')
                song = parse_db(data)[0]
                t.value = song['Title']
                var ttt =  song['Title'] +
                            " by " + song['Artist'] +
                            " from " + song['Album']
                t.setAttribute('tooltiptext', ttt)
            }
            command('currentsong', cb)
        }
    }
    catch (e) {
        debug("setCurSong: "+e.description)
    }
}

function clear(){
    lastPlaylistName = "NewPlaylist"
    command("clear", null)
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
var pds
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

/* windowMove method inspired by Alex Eng's <ateng@users.sourceforge.net>
 * implimentation in his Clippings extension:
 * clippings-2.99.3+_20071215.xpi, content/hostappToolbar.js,
 * released under MPL 1.1, http://www.mozilla.org/MPL/ for original license.
 * This version has been adapted to fit MPM and improved.
*/
var windowMove = {
  isMoving: false,
  x: null,
  y: null,

  start: function (aEvent)
  {
    this.isMoving = true;
    this.x = aEvent.clientX;
    this.y = aEvent.clientY;
    // MPD polling loop interferes with smooth movement of window.
    mpd_stop = true
  },

  stop: function (aEvent)
  {
    this.isMoving = false;
    // Restore MPD polling loop.
    mpd_stop = false
    checkStatus()
  },

  move: function (aEvent)
  {
    if (this.isMoving) {
        var dx = aEvent.clientX - this.x
        var dy = aEvent.clientY - this.y
        window.moveBy(dx, dy)
        event.stopPropagation()
        return false
    }
  }
};

window.addEventListener('mousedown', windowMove.start, true)
window.addEventListener('mouseup', windowMove.stop, true)
window.addEventListener('mousemove', windowMove.move, true)
window.addEventListener('mouseout', windowMove.move, true)
window.addEventListener('mouseover', windowMove.move, true)

window.restore = function () {
    var flags = 'chrome,resizable=yes,screenX=' +
                    window.screenX+",screenY="+window.screenY
    var main = window.open('chrome://minion/content/minion.xul','mpm_main',flags);
    window.close()
}
notify['song'] = setCurSong
notify['state'] = setState
notify['time'] = setTime
notify['volume'] = setVol
notify['random'] = setRandom
notify['repeat'] = setRepeat



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
var windowMove = {
  isMoving: false,
  x: null,
  y: null,

  start: function (aEvent)
  {
    this.isMoving = true;
    this.x = aEvent.clientX;
    this.y = aEvent.clientY;
    mpd_stop = true
  },

  stop: function (aEvent)
  {
    this.isMoving = false;
    mpd_stop = false
    checkStatus()
  },

  moveBy: function (aEvent)
  {
    if (this.isMoving) {
        var dx = aEvent.clientX - this.x
        var dy = aEvent.clientY - this.y
        window.moveBy(dx, dy)
    }
  },

  moveTo: function (aEvent)
  {
    if (this.isMoving) {
        var dx = aEvent.screenX - this.x
        var dy = aEvent.screenY - this.y
        window.moveTo(dx, dy)
    }
  }
};

window.addEventListener('mousedown', windowMove.start, true)
window.addEventListener('mouseup', windowMove.stop, true)
window.addEventListener('mousemove', windowMove.moveTo, true)
window.addEventListener('mouseout', windowMove.moveTo, true)
window.addEventListener('mouseover', windowMove.moveTo, true)

window.restore = function () {
    var flags = 'chrome,resizable=yes'
    var main = window.open('chrome://minion/content/minion.xul','mpm_main',flags);
    main.moveTo(window.screenX, window.screenY)
    window.close()
}
notify['song'] = setCurSong
notify['state'] = setState
notify['time'] = setTime
notify['volume'] = setVol
notify['random'] = setRandom
notify['repeat'] = setRepeat



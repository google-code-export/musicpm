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

EXPORTED_SYMBOLS = ["Nz", "debug", "hmsFromSec", "prettyTime", "getPlaylistView", "prefBranch", "prefService", "observerService"]

// Use this line to import: 
// Components.utils.import("resource://minion/mpmUtils.js");

var observerService = Components.classes["@mozilla.org/observer-service;1"]
                        .getService(Components.interfaces.nsIObserverService);
var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                        .getService(Components.interfaces.nsIConsoleService);
var prefService = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefService);
var prefBranch = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);

				
function debug(s) {
    //return null
    if (typeof(s) == 'object') {
        var str = ""
        for (x in s) {str += x + ": " + s[x] + "\n"}
    }
    else {var str = s}
    consoleService.logStringMessage(str)
}

function Nz(obj, def){
	if (typeof(obj) == 'undefined') {
		return (typeof(def) == 'undefined') ? null : def
	}
	return obj
}

function hmsFromSec(sec){
	var hms = "0:00"
	try {
		sec = parseInt(sec)
	} 
	catch (err) {
		return "0:00"
	}
	if (sec > 0) {
		var h = 0
		if (sec >= 3600) {
			h = Math.floor(sec / 3600)
			sec = sec % 3600
		}
		var m = Math.floor(sec / 60)
		var s = sec % 60
		if (h > 0) {
			h = h + ":"
			if (m.toString().length == 1) {
				m = "0" + m
			}
		}
		else {
			h = ""
		}
		m = m + ":"
		if (s.toString().length == 1) {
			s = "0" + s
		}
		hms = h + m + s
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

function customView (db, tree) {
	this.rowCount = db.length
	this.getCellText = function(R, C){
		if (C.id == "Time") return Nz(db[R]) ? hmsFromSec(db[R][C.id]) : ""
		return Nz(db[R]) ? db[R][C.id] : ""
	}
	this.setTree = function(treebox){
		this.treebox = treebox;
	}
	this.isContainer = function(row){
		return false;
	}
	this.isSeparator = function(row){
		return false;
	}
	this.isSorted = function(){
		return false;
	}
	this.cycleHeader = function(col, elem){
		return null;
	}
	this.getLevel = function(row){
		return 0;
	}
	this.getImageSrc = function(row, col){
		return null;
	}
	this.getRowProperties = function(row, props){
        try {
			var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
			props.AppendElement(aserv.getAtom(db[row].type))
			aserv = null
		} 
		catch (e) {
		}
	}
	this.getCellProperties = function(row, col, props){
        try {
			var t = db[row].type
			var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
			props.AppendElement(aserv.getAtom(col.id + "_" + t))
			if (t == 'file' && db[row].Name == mpd.song) {
				if (col.id == 'Title' && mpd.state != 'stop') {
					props.AppendElement(aserv.getAtom(mpd.state + "_currentsong"))
				}
				props.AppendElement(aserv.getAtom("currentsong"))
			}
			props.AppendElement(aserv.getAtom(col.id))
			if (t != 'file' && t != 'playlist' && mpd.updating_db) {
				props.AppendElement(aserv.getAtom(col.id + "_updating"))
			}
			aserv = null
		} 
		catch (e) {
		}
	}
	this.getParentIndex = function(idx){
		return -1
	}
	this.getColumnProperties = function(colid, col, props){
	}
	this.canDrop = function(index, orient){
		return false
	}
	this.drop = function(row, orient){
	}
}

function getPlaylistView(db, tree) {
	var view = new customView(db, tree)
	view.getCellText = function(R, C){
		var P = Math.floor(R / 2)
		if (!Nz(db[P])) return "";
		if (R % 2 == 0) {
			switch (C.id) {
				case "Time":
					return hmsFromSec(db[P][C.id]);
					break;
				case "Pos":
					return (parseInt(P) + 1) + ".";
					break;
				default:
					return db[P][C.id];
					break;
			}
		}
		else if (C.id == "Title") {
			return db[P].Album+" ("+db[P].Artist+")"
		}
	}
	view.getCellProperties = function(row, col, props){
        try {
			var t = db[Math.floor(row/2)].type
			var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
			props.AppendElement(aserv.getAtom(col.id + "_" + t))
			if (t == 'file' && db[row].Name == mpd.song) {
				if (col.id == 'Title' && mpd.state != 'stop') {
					props.AppendElement(aserv.getAtom(mpd.state + "_currentsong"))
				}
				props.AppendElement(aserv.getAtom("currentsong"))
			}
			props.AppendElement(aserv.getAtom(col.id))
			if (t != 'file' && t != 'playlist' && mpd.updating_db) {
				props.AppendElement(aserv.getAtom(col.id + "_updating"))
			}
			aserv = null
		} 
		catch (e) {
		}
	}
	view.getRowProperties = function(row, props){
        try {
			var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
			var pos = Math.floor(row / 2)
			var Peo = (pos % 2) ? "odd" : "even"
			var Reo = (row % 2) ? "odd" : "even"
			if (Reo != Peo) {
				props.RemoveElement(aserv.getAtom(Reo))
				props.AppendElement(aserv.getAtom(Peo))
			}
			if (Reo == 'odd') props.AppendElement(aserv.getAtom('bottom'))
			else props.AppendElement(aserv.getAtom('top'))
	
			if (Nz(db[pos])) props.AppendElement(aserv.getAtom(db[pos].type))
			aserv = null
		} 
		catch (e) {
			debug(e)
		}
	}
	return view
}

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

EXPORTED_SYMBOLS = ["Nz", "debug", "hmsFromSec", "prefBranch", "prefService", "observerService"]

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


function customView (db, tree) {
	this.rowCount = db.length
	this.getCellText = function(R, C){
		return db[R][C.id]
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
		return (tree.sortCol) ? true : false;
	}
	this.cycleHeader = function(col, elem){
		tree.doSort(col, elem)
	}
	this.getLevel = function(row){
		return 0;
	}
	this.getImageSrc = function(row, col){
		return null;
	}
	this.getRowProperties = function(row, props){
	}
	this.getCellProperties = function(row, col, props){
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
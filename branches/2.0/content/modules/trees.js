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

Components.utils.import("resource://minion/mpd.js");
EXPORTED_SYMBOLS = ["playlistView", "trees_EXPORTED_SYMBOLS"].concat(mpd_EXPORTED_SYMBOLS)
var trees_EXPORTED_SYMBOLS = copyArray(EXPORTED_SYMBOLS)


function customView () {
	this.load = function (db){
		var rc = db.length
		var rs = new Array()
		rs.length = rc
		if (rc) {
			var n = rc
			do {
				var i = rc - n
				rs[i] = {type: 'pointer', index: i}
			} while (--n)
		}
		this.db = db;
		this.rs = rs
		this.rowCount = rc
	}
	this.emptyRecord = {type: 'unknown', Title: 'Loading...', isOpen: false}
	this.get = function (row) {
		var cur = Nz(this.rs[row], this.emptyRecord)
		if (cur.type == 'pointer') {
			return Nz(this.db[cur.index], this.emptyRecord)
		}
		return cur
	}
    this.getCellText = function(R, C){
		var item = this.get(R)
        if (!Nz(item)) return "";
        switch (C.id) {
            case "Time":
                return (item.Time) ? hmsFromSec(item.Time) : "";
                break;
            case "Pos":
                return (item.Pos) ? (parseInt(item.Pos) + 1) + "." : "";
                break;
            default:
                return item[C.id];
                break;
        }
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
			var item = this.get(R)
            var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
            props.AppendElement(aserv.getAtom(item.type))
            aserv = null
        }
        catch (e) {
        }
    }
    this.getCellProperties = function(row, col, props){
        try {
			var item = this.get(row)
            var t = item.type
            var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
            props.AppendElement(aserv.getAtom(col.id + "_" + t))
            if (t == 'file' && item.file == mpd.file) {
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
			debug(e)
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

function playlistView(){
	this.isContainer = function(row){
		try {
			return (this.rs[row].type == 'pointer')
		} 
		catch (e) {
			return false
		}
	}
	this.getParentIndex = function(idx){
		try {
			return (this.rs[idx].type == 'pointer') ? -1 : 0
		} 
		catch (e) {
			return -1
		}
	}
	this.getLevel = function(row){
		try {
			return (this.rs[row].type == 'pointer') ? 0 : 1
		} 
		catch (e) {
			return 0
		}
	}
	this.hasNextSibling = function(row, afterIndex){
		var item = this.get(row)
		var after = this.get(afterIndex)
		if (item.type == 'pointer') {
			return (after.type == 'pointer')
		}
		return !(after.type == 'pointer')
	}
	this.isContainerEmpty = function(row){
		return false
	}
	this.isContainerOpen = function(row){
		try {
			return this.rs[row].isOpen
		} 
		catch (e) {
			return false
		}
	}
	this.toggleOpenState = function(row){
		try {
			if (this.rs[row].isOpen) {
				this.rs[row].isOpen = false
				this.rs.splice(parseInt(row)+1, 2)
				this.treebox.rowCountChanged(row+1, -2)
			}
			else {
				var item = this.get(row)
				var art = {
					index: item.Pos,
					type: 'Artist',
					Pos: null,
					Title: "by "+Nz(item.Artist, 'unknown'),
					Time: null
				}
				var alb = {
					index: item.Pos,
					type: 'Album',
					Pos: null,
					Title: "from "+Nz(item.Album, 'unknown'),
					Time: null
				}
				this.rs[row].isOpen = true
				this.rs.splice(row+1, 0, alb, art)
				this.treebox.rowCountChanged(row+1, 2)
			}
		} 
		catch (e) {
			debug(e)
		}
	}
	this.getRowProperties = function(row, props){
		try {
			var item = this.rs[row]
			if (item.type != 'unknown') {
				var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
				props.AppendElement(aserv.getAtom(item.type))
				var P = (parseInt(item.index) % 2) ? 'odd' : 'even'
				var R = (row % 2) ? 'odd' : 'even'
				if (P != R) {
					props.RemoveElement(aserv.getAtom(R))
					props.AppendElement(aserv.getAtom(P))
				}
				aserv = null
			}
		} 
		catch (e) {
		}
	}
	this.expandCurrent = function (row) {
		if (!this.isContainerOpen(row))this.toggleOpenState(row)
	}
}

playlistView.prototype = new customView
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


function customView (db, tree) {
	this.db = db
	this.tree = tree
    this.rowCount = db.length
    this.getCellText = function(R, C){
        if (!Nz(db[R])) return "";
        switch (C.id) {
            case "Time":
                return hmsFromSec(db[R][C.id]);
                break;
            case "Pos":
                return (parseInt(R) + 1) + ".";
                break;
            default:
                return db[R][C.id];
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

function playlistView(db, tree){
    this.rowCount = db.length
	this.getCellText = function(R, C){
		if (!Nz(db[R])) 
			return "";
		if (db[R].type == 'file') {
			switch (C.id) {
				case "Time":
					return hmsFromSec(db[R][C.id]);
					break;
				case "Pos":
					return (parseInt(R) + 1) + ".";
					break;
				default:
					return db[R][C.id];
					break;
			}
		}
		else 
			if (C.id == 'Title') 
				return db[R].type + ": " + db[R].Title
	}
	this.isContainer = function(row){
		return (db[row].type == 'file')
	}
	this.getParentIndex = function(idx){
		return (db[idx].type == 'file') ? 0 : -1
	}
	this.getLevel = function(row){
		return (db[row].type == 'file') ? 0 : 1
	}
	this.hasNextSibling = function(row, afterIndex){
		return (db[afterIndex].type == db[row].type)
	}
	this.isContainerEmpty = function(row){
		return false
	}
	this.isContainerOpen = function(row){
		return (Nz(db[row + 1])) ? (db[row + 1].type != 'file') : false
	}
	this.toggleOpenState = function(row){
		try {
			var is_open = (db[row + 1].type != 'file')
		} 
		catch (e) {
			var is_open = false
		}
		if (is_open) {
			db.splice(parseInt(row) + 1, 2)
			playlistView.treebox.rowCountChanged(row + 1, -2)
		}
		else {
			var art = {
				type: 'Artist',
				Pos: db[row].Pos,
				Title: Nz(db[row].Artist, 'unknown')
			}
			var alb = {
				type: 'Album',
				Pos: db[row].Pos,
				Title: Nz(db[row].Album, 'unknown')
			}
			db.splice(row + 1, 0, alb, art)
			playlistView.treebox.rowCountChanged(row + 1, 2)
		}
	}
	this.getRowProperties = function(row, props){
		try {
			var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
			props.AppendElement(aserv.getAtom(db[row].type))
			var P = (parseInt(db[row].Pos) % 2) ? 'odd' : 'even'
			var R = (row % 2) ? 'odd' : 'even'
			if (P != R) {
				props.RemoveElement(aserv.getAtom(R))
				props.AppendElement(aserv.getAtom(P))
			}
			aserv = null
		} 
		catch (e) {
			debug(e)
		}
	}
    this.setTree = function(treebox){
        this.treebox = treebox;
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
    this.getImageSrc = function(row, col){
        return null;
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
    this.getColumnProperties = function(colid, col, props){
    }
    this.canDrop = function(index, orient){
        return false
    }
    this.drop = function(row, orient){
	}
}

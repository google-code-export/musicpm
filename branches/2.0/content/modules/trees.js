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
EXPORTED_SYMBOLS = ["playlistView", "browserView", "trees_EXPORTED_SYMBOLS"].concat(mpd_EXPORTED_SYMBOLS)
var trees_EXPORTED_SYMBOLS = copyArray(EXPORTED_SYMBOLS)


function customView () {
	this.getRowCount = function() {return this.rs.length},
	this.rs = []
	this.db = []
	this.treeBox = null
	this.getPointer = function (idx) {
		return {
			type: 'pointer',
			index: idx,
			Title: 'Loading...',
			pointer: "loading...",
			isContainer: false,
			isOpen: false
		}
	}
	this.load = function (db, expanded){
		if (!Nz(expanded)) {
			var rc = db.length
			var rs = new Array()
			rs.length = rc
			if (rc) {
				var n = rc
				do {
					var i = rc - n
					rs[i] = this.getPointer(i)
					
				}
				while (--n)
			}
		}
		else {
			var rc = db.length * 3
			var rs = new Array()
			rs.length = rc
			if (rc) {
				var n = rc
				var idx = 0
				do {
					rs[rc - n] = this.getPointer(idx)
					rs[rc - n].isOpen = true
					--n
					rs[rc - n] = {
						index: idx,
						type: 'Album',
						Prefix: "from ",
						isContainer: false
					}
					--n
					rs[rc - n] = {
						index: idx,
						type: 'Artist',
						Prefix: "by ",
						isContainer: false
					}
					idx++
				}
				while (--n)
			}			
		}
		if (this.treeBox) {
			var chg = rs.length-this.rs.length
			var n = (chg < 0) ? 1 : this.rs.length
			this.treeBox.rowCountChanged(n-1, chg)
			this.treeBox.invalidate()
			this.treeBox.scrollToRow(0)
		}
		this.db = db;
		this.rs = rs;
		this.rowCount = this.rs.length;
	}
	this.addItem = function (idx, expanded) {
		var i = this.rs.length
		var nw = this.getPointer(idx)
		this.rs[i] = nw
		if (expanded) {
			this.rs[i].isOpen = true
			this.rs[i+1] = {
				index: idx,
				type: 'Album',
				Prefix: "from ",
				isContainer: false
			}
			this.rs[i+2] = {
				index: idx,
				type: 'Artist',
				Prefix: "by ",
				isContainer: false
			}
			this.treeBox.rowCountChanged(i-1, 3)
		}
		else {
			this.treeBox.rowCountChanged(i-1, 1)
		}
	}
	this.removeItems = function (count) {
		var n = this.rs.length
		for (var i = 0; i < count; i++) {
			--n
			if (n > 0) {
				if (!this.isContainer(n)) {
					var n = this.getParentIndex(n)
				}
			}
			else {
				n = 0
				i = count
			}
		}
		this.treeBox.rowCountChanged(n-1, n-this.rs.length)
		this.rs.length = n
	}
	this.get = function (row) {
		var cur = Nz(this.rs[row])
		if (!cur) {
			//this.treeBox.rowCountChanged(row, -1)
			return {type: 'unknown', Pos: null, Time: null, Title: 'ERROR!'}
		}
		if (cur.type == 'pointer') {
			return Nz(this.db[cur.index], cur)
		}
		else {
			var item = Nz(this.db[cur.index], cur)
			return {
				type: cur.type,
				index: cur.index,
				Track: null,
				Time: null,
				Pos: null,
				Title: cur.Prefix+item[cur.type]
			}
		}
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
            case "Title":
                return (item.Title) ? item.Title : item.name;
                break;
            default:
                return (item[C.id]);
                break;
        }
    }
	this.isContainer = function(row){
		return (this.rs[row].isContainer)
	}
	this.getParentIndex = function(idx){
		if (this.rs[idx].isContainer) return -1
		do {
			--idx
		} while (!this.rs[idx].isContainer && idx > -1)
		return idx
	}
	this.getLevel = function(row){
		try {
			return (this.rs[row].isContainer) ? 0 : 1
		} 
		catch (e) {
			debug(e)
			return 0
		}
	}
	this.hasNextSibling = function(row, afterIndex){
		var item = this.rs[row]
		var after = this.rs[afterIndex]
		if (item.type == 'pointer') {
			return (after.type == 'pointer')
		}
		return !(after.type == 'pointer')
	}
	this.isContainerEmpty = function(row){
		return false
	}
	this.isContainerOpen = function(row){
		return this.rs[row].isOpen
	}
    this.setTree = function(treeBox){
        this.treeBox = treeBox;
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
            if (t == 'file' && item.value == mpd.file) {
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
    this.getColumnProperties = function(colid, col, props){
    }
    this.canDrop = function(index, orient){
        return false
    }
    this.drop = function(row, orient){
    }
}

function playlistView(){
	this.getPointer = function (idx) {
		return {
			type: 'pointer',
			index: idx,
			Title: 'Loading...',
			pointer: "loading...",
			isContainer: true,
			isOpen: false
		}
	}
	this.toggleOpenState = function(row){
		try {
			if (this.rs[row].isOpen) {
				this.rs[row].isOpen = false
				this.rs.splice(parseInt(row) + 1, 2)
				this.treeBox.rowCountChanged(row + 1, -2)
			}
			else {
				var item = this.get(row)
				var art = {
					index: item.Pos,
					type: 'Artist',
					Prefix: "by ",
					isContainer: false
				}
				var alb = {
					index: item.Pos,
					type: 'Album',
					Prefix: "from ",
					isContainer: false
				}
				this.rs[row].isOpen = true
				this.rs.splice(row+1, 0, alb, art)
				this.treeBox.rowCountChanged(row, 2)
				//this.rowCount = this.rs.length
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
}

playlistView.prototype = new customView

function browserView () {
	this.rowCount = 0
	this.load = function (db, cols){
		var rowCount = db.length
		if (this.treeBox) {
			var chg = rowCount - this.rowCount
			var n = (chg < 0) ? 1 : this.rowCount
			this.treeBox.rowCountChanged(n-1, chg)
			this.treeBox.invalidate()
			this.treeBox.scrollToRow(0)
		}
		this.db = db
		this.rs = []
		this.cols = cols
		this.rs.length = rowCount
		this.rowCount = rowCount;
		this.colCount = cols.length;
	}
	this.get = function (row) {
		if (typeof(this.rs[row])=='object') return this.rs[row]
		var num = this.colCount
		var i = num
		var record = {}
		do {
			var x = num - i
			record[this.cols[x]] = this.db[row][x]
		}
		while (--i)
		this.db[row] = null
		this.rs[row] = record
		return record
	}
	this.isContainer = function(row){
		return false
	}
	this.getParentIndex = function(idx){
		return -1
	}
	this.getLevel = function(row){
		return 0
	}
	this.hasNextSibling = function(row, afterIndex){
		return true
	}
	this.isContainerEmpty = function(row){
		return false
	}
	this.isContainerOpen = function(row){
		return false
	}
}
browserView.prototype = new customView


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
EXPORTED_SYMBOLS = ["playlistView", "treeView", "browserView", "trees_EXPORTED_SYMBOLS"].concat(mpd_EXPORTED_SYMBOLS)
var trees_EXPORTED_SYMBOLS = copyArray(EXPORTED_SYMBOLS)

function customTreeView () {
	this.getRowCount = function() {return this.rs.length},
	this.rs = []
	this.db = []
	this.treeBox = null
	this.rowCount = 0
	this.canDrop = function (index, orientation ) {return false}
	this.cycleCell = function (row, col ) {}
	this.cycleHeader = function (col ) {}
	this.drop = function (row, orientation ) {}
	this.getCellProperties = function (row, col, props ) {
        try {
			var item = this.get(row)
            var t = item.type
            var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
            props.AppendElement(aserv.getAtom(col.id + "_" + t))
            if (item.URI == 'file://'+mpd.file) {
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
	this.getCellValue = function (row, col ) {return ''}
	this.getColumnProperties = function (col, properties ) {}
	this.getImageSrc  = function (row, col ) {return ''}
	this.getLevel = function  (index ) {return 0}
	this.getParentIndex  = function (rowIndex ) {return -1}
	this.getProgressMode  = function (row, col ) {return 3}
	this.getRowProperties = function(index, properties){
		try {
			var item = this.get(index)
			var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
			props.AppendElement(aserv.getAtom(item.type))
			aserv = null
		} 
		catch (e) {
		}
	}
	this.hasNextSibling = function (rowIndex, afterIndex ) {return true}
	this.isContainer  = function (index ) {return false}
	this.isContainerEmpty  = function (index ) {return false}
	this.isContainerOpen  = function (index ) {return false}
	this.isEditable  = function (row, col ) {return false}
	this.isSelectable  = function (row, col ) {return false}
	this.isSeparator  = function (index ) {return false}
	this.isSorted  = function ( ) {return false}
	this.performAction  = function (action ) {}
	this.performActionOnCell  = function (action, row, col ) {}
	this.performActionOnRow  = function (action, row ) {}
	this.selectionChanged  = function ( ) {}
	this.setCellText  = function (row, col, value ) {}
	this.setCellValue  = function (row, col, value ) {}
	this.setTree  = function ( tree ) { this.treeBox = tree}
	this.toggleOpenState  = function (index ) {}
}


function playlistView(){
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
	this.isContainerOpen = function(row){
		return this.rs[row].isOpen
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

playlistView.prototype = new customTreeView


function browserView () {
	var sql = ''
	this.db = null
	this.cols = null
	this.rs = null
	this.treeBox = null
	this.colCount = 0
	this.rowCount = 0
	this.table = "mem.content"
	this.load = function (sqlstr){
		try {
		sql = (sqlstr.slice(-1)==";") ? sqlstr.slice(0,-1) : sqlstr
		mpd.db.executeSimpleSQL("DROP TABLE IF EXISTS "+this.table+
			";CREATE TABLE "+this.table+" AS " + sql)
		} catch (e) {debug(sql+"\n"+mpd.db.lastErrorString)}
		q = mpd.db.createStatement("SELECT count(*) FROM "+this.table)
		q.executeStep()
		var rowCount = q.getInt32(0)
		q.reset()
		this.rs = []
		this.rs.length = rowCount
		var q = mpd.db.createStatement("SELECT * FROM "+this.table+" LIMIT 1")
		if (q.executeStep()) {
			this.cols = []
			this.colCount = q.numEntries
			var i = this.colCount
			var record = {}
			do {
				var idx = this.colCount - i
				this.cols[idx] = q.getColumnName(idx)
				record[this.cols[idx]] = q.getUTF8String(idx)
			}
			while (--i)
			this.rs[0] = record
		}
		q.reset()
		if (this.treeBox) {
			var chg = rowCount - this.rowCount
			var n = (chg < 0) ? 1 : this.rowCount
			this.treeBox.rowCountChanged(n-1, chg)
			this.treeBox.invalidate()
			this.treeBox.scrollToRow(0)
		}
		this.rowCount = rowCount;
		this.sqlORDER = ''
	}
	this.get = function (row) {
		if (typeof(this.rs[row])=='object') return this.rs[row]
		try {
			var record = {}
			var q = mpd.db.createStatement("SELECT * FROM "+this.table+" "+
				this.sqlORDER + " LIMIT 1 OFFSET "+row)
			if (q.executeStep()) {
				var i = this.colCount
				do {
					var x = this.colCount - i
					record[this.cols[x]] = q.getUTF8String(x)
				}
				while (--i)
			}
			q.reset()
			this.rs[row] = record
			return record
		}
		catch(e) {debug(e)}
	}
    this.getCellText = function(R, C){
		var item = this.get(R)
        if (!Nz(item)) return "";
        switch (C.id) {
            case "time":
                return (item.time) ? hmsFromSec(item.time) : "";
                break;
            case "pos":
                return (item.pos) ? (parseInt(item.pos) + 1) + "." : "";
                break;
            case "title":
                return (item.title) ? item.title : item.name;
                break;
            default:
                return (item[C.id]);
                break;
        }
    }
    this.cycleHeader = function(col, elem){
		var ord = ' ORDER BY ' + col.id
		switch (this.sqlORDER) {
			case '':
				this.sqlORDER = ord;
				break;
			case ord:
				this.sqlORDER += ' DESC';
				break;
			default:
				this.sqlORDER = '';
				break;
		}
		this.rs = []
		this.treeBox.invalidate()
    }
	this.isSelectable  = function (row, col ) {return true}
	this.performActionOnCell = function (action, row, col) {
		debug(action)
	}
}
browserView.prototype = new customTreeView

function treeView (heirs) {
	this.heirs = heirs
	this.performActionOnRow = function (action, row) {
		debug(action)
	}
}
treeView.prototype = new browserView
treeView.prototype.table = "mem.tree"

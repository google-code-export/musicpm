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

var mpm_history = []
var mpm_future = []
var table = []
var sort_natural = []
var ftable = []
var fltr = ""
var nav_btns = []
var active_item = null

var fileObserver = {
    onDragStart: function (event, transferData, action) {
        var row = { }
        var col = { }
        var child = { }
        $('files').treeBoxObject.getCellAt(event.pageX, event.pageY, row, col, child)
        if (!col.value) {  return }
        var item = table[$('files').currentIndex]
        var plainText = item.Name
        if (item.type=='file') plainText = item.Artist+" - "+item.Album+" - "+item.Title
        transferData.data = new TransferData();
        transferData.data.addDataForFlavour("text/unicode",plainText);
        transferData.data.addDataForFlavour("mpm/filename",item.Name);
        plDrag = (mpm_history[0][0]=='playlist' && mpm_history[0][1]>'')
    },
    onDragOver: function (event, flavour, session) {
    },
    onDragExit: function (event, session) {
        plDrag = false
    },
    getSupportedFlavours : function () {
        var flavours = new FlavourSet();
        flavours.appendFlavour("mpm/playlist");
        flavours.appendFlavour("text/unicode");
        return flavours;
    },
    onDrop: function (event, dropData, session) {
        if (dropData.flavour.contentType == "mpm/playlist") {
            remove()
        }
        event.stopPropagation()
    }
}
function filter(lst, types){
    var l = lst.length
    if (l < 1) { return lst }
    var n = l
    var r = []
    do {
        if (types[lst[l-n].type]) {r.push(lst[l-n])}
    } while (--n)
    return r
}
function sort(column) {
    var tree = $('files')
    var columnName;
    var sd = tree.getAttribute("sortDirection")
    var order = 1
    if (column) {
        columnName = column.id;
        if (tree.getAttribute("sortResource") == columnName) {
            if (sd == "ascending") {
                order = -1
            }
            else if (sd == "descending") {order = 0}
        }
        else {
        }
    } else {
        columnName = tree.getAttribute("sortResource");
    }
    function columnSort(a, b) {
        if (columnName == 'Track' || columnName == 'Pos' || columnName == 'Time') {
			return (a[columnName] - b[columnName]) * order
		}
        if (prepareForComparison(a[columnName]) > prepareForComparison(b[columnName])) return 1 * order;
        if (prepareForComparison(a[columnName]) < prepareForComparison(b[columnName])) return -1 * order;
        //tie breaker: name is the second level sort
        if (columnName != "Name") {
            if (prepareForComparison(a["Name"]) > prepareForComparison(b["Name"])) return 1 * order;
            if (prepareForComparison(a["Name"]) < prepareForComparison(b["Name"])) return -1 * order;
        }
        return 0;
    }
    if (order != 0) {
        table.sort(columnSort)
        //setting these will make the sort option persist
        tree.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
        tree.setAttribute("sortResource", columnName);
        assignView()
        //set the appropriate attributes to show to indicator
        var cols = tree.getElementsByTagName("treecol");
        for (var i = 0; i < cols.length; i++) {
            cols[i].removeAttribute("sortDirection");
        }
        document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
    }
    else {
        table = []
        var l = sort_natural.length
        var n = l
        if (l > 0) {
            do {
                table.push(sort_natural[l-n])
            } while (--n)
        }
        assignView()
        tree.setAttribute("sortDirection", '');
        tree.setAttribute("sortResource", '');
        $(columnName).setAttribute("sortDirection", '');
    }
}

//prepares an object for easy comparison against another. for strings, lowercases them
function prepareForComparison(o) {
    if (typeof o == "string") {
        return o.toLowerCase();
    }
    return o;
}
function filter_table(chr){
    var tbl = new Array()
    var l = 1
    var columnName = $('files').getAttribute("sortResource")
    if (columnName == '') {columnName = 'Title'}
    if (fltr.length > 0) {
        fltr += chr.toLowerCase()
        l = fltr.length
        nav_btns[nav_btns.length-1].label = "Filter "+columnName+": "+fltr+'*'
    }
    else {
        fltr = chr.toLowerCase()
        addnav("Filter "+columnName+": "+fltr+'*', mpm_history[0][0], mpm_history[0][1])
    }
    if (fltr.substr(0,1) == '*') {
        var s = fltr.substr(1)
        for (x in table) {
            try {
                if (table[x][columnName].toLowerCase().indexOf(s) > -1) {
                    tbl.push(table[x])
                }
            } catch (e) {}
        }
    }
    else {
		if (columnName == 'Pos') {
			for (x in table) {
				try {
					var p = parseInt(table[x][columnName])+1
					if (p.toString().substr(0, l) == fltr) {
						tbl.push(table[x])
					}
				} 
				catch (e) {
				}
			}
		}
		else {
			for (x in table) {
				try {
					if (table[x][columnName].toLowerCase().substr(0, l) == fltr) {
						tbl.push(table[x])
					}
				} 
				catch (e) {
				}
			}
		}
    }
    if (tbl.length > 0) {
        table = null
        setTable(tbl)
        $('files').view.selection.select(0)
        if (columnName != 'Title') $('files').setAttribute("sortResource", columnName);
    }
    else {
        fltr = fltr.substr(0, fltr.length - 1)
        if (fltr.length > 0) {
            nav_btns[nav_btns.length - 1].label = "Filter "+columnName+": " + fltr + '*'
        }
        else {
            var e = nav_btns.pop()
            $('mpm_navbar').removeChild(e)
            e = null
        }
    }
}
function setTable(data){
    table = data
    sort_natural = cpyArray(data)
    var tree = $('files')
    assignView()
    try {
        $(tree.getAttribute("sortResource")).setAttribute("sortDirection", '');
    } catch (e){}
    tree.setAttribute("sortDirection", '');
    tree.setAttribute("sortResource", '');
}
function assignView() {
    var tree = $('files')
    if (table) {
        tree.view = {
            rowCount : table.length,
            getCellText : function (R, C) {
                if (typeof(table) == 'undefined') {return ""}
                if (!table[C.id]){table[C.id] = ""}
                if (C.id=="Time" && table[R].Time > ''){return hmsFromSec(table[R]["Time"])}
                if (C.id=="Pos" && table[R].Pos > ''){return parseInt(table[R].Pos)+1}
                else {return table[R][C.id]}
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
                props.AppendElement( aserv.getAtom(table[row].type) )
                aserv = null
                } catch(e) {}
            },
            getCellProperties: function(row,col,props){
                try {
				var t = table[row].type
                var aserv = Components.classes["@mozilla.org/atom-service;1"]
                            .getService(Components.interfaces.nsIAtomService);
                props.AppendElement( aserv.getAtom(col.id+"_"+table[row].type) )
                if (t == 'file' && table[row].Name == mpd.currentsong) {
					if (col.id == 'Title' && mpd.state != 'stop') {
						props.AppendElement(aserv.getAtom(mpd.state + "_currentsong"))
					}
					props.AppendElement(aserv.getAtom("currentsong"))
				}
                props.AppendElement( aserv.getAtom(col.id) )
				if (t !='file' && t !='playlist' && mpd.updating_db > 0) {
					props.AppendElement(aserv.getAtom(col.id+"_updating"))
				}
                aserv = null
                } catch(e) {}
            },
            getColumnProperties: function(colid,col,props){
            },
            cycleHeader: function(col, elem) {return null},
            getParentIndex: function(idx) {return -1},
            canDrop: function(index, orient) {
                if (table==home) {return true}
                else return (plDrag && mpm_history[0][0]=='playlist' && mpm_history[0][1]>'')
            },
            drop: function(row,orient){
                if (table==home) {
                    if (tree.currentIndex < row) {
                        if (orient == -1) {row--}
                    }
                    else {
                        if (orient == 1) {row++}
                    }
                    var mv = home.splice(tree.currentIndex,1)
                    home.splice(row,0,mv[0])
                    var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                            getService(Components.interfaces.nsIPrefBranch);
                    prefs.setCharPref("extensions.mpm.home", home.toSource())
                    setTable(home)
                }
                else if (plDrag && mpm_history[0][0]=='playlist' && mpm_history[0][1]>'') {
                    if (tree.currentIndex < row) {
                        if (orient == -1) {row--}
                    }
                    else {
                        if (orient == 1) {row++}
                    }
                    files_playlist_move(row, mpm_history[0][1])
                }
            }
        };
    }
}
function files_playlist_move_next() {
    var moveto = parseInt(mpd.song)
    var pos = $('files').currentIndex
    if (moveto < pos) { moveto++}
    files_playlist_move(moveto)
}
function files_playlist_move(moveto, id) {
    var tree=$("files")
    var start = new Object();
    var end = new Object();
    var numRanges = tree.view.selection.getRangeCount();
    var offset = 0
    var cmd = "command_list_begin"
    var back = false
    moveto = parseInt(moveto)
    if (moveto < 0 ) {moveto = 0}
	if (typeof(id) == 'undefined') id = '[current]'
    if (id=='[current]') {
        if (moveto >= mpd.playlistlength) {moveto = mpd.playlistlength - 1}
        var pcmd = '\nmove '
    }
    else {
        var pcmd = '\nplaylistmove "'+id+'" '
    }
    for (var t=0; t<numRanges; t++){
        tree.view.selection.getRangeAt(t,start,end);
        for (var v=start.value; v<=end.value; v++){
            if (v < moveto) {
                cmd += pcmd + (v-offset) + " " + moveto
                offset++
            }
            else {
                cmd += pcmd + v + " " + (moveto + offset)
                offset++
            }
        }
    }
    cmd += "\ncommand_list_end"
    command(cmd, function(){getDir(mpm_history[0][0], mpm_history[0][1])})
}
function files_playlist_openPopup(){
    var cb = function(data) {
        var p = $('files_playlist_add_popup')
        if (pds) {p.database.RemoveDataSource(pds)}
        pds = dbRDF(parse_db(data), "mpd://playlists", {'playlist': true})
        p.database.AddDataSource(pds)
        p.ref="mpd://playlists"
    }
    command('lsinfo', cb)
}
function playlist_resize(event) {
	if ($('main_playlist').collapsed) {
		if ($('playlist_toolbar').firstChild == $("playlist_menu")) {
			var e = $('playlist_toolbar').removeChild($("playlist_menu"))
			$("files_toolbar").insertBefore(e, $("files_settings"))
		}
	}
	else {
		if ($('files_toolbar').firstChild == $("playlist_menu")) {
			var pt = $("playlist_toolbar")
			var e = $('files_toolbar').removeChild($("playlist_menu"))
			pt.insertBefore(e, pt.firstChild)
		}
	}
}
function addnav(lbl, mytype, id) {
    var e = document.createElement("button")
    e.id = 'nav'+ nav_btns.length
    nav_btns.push(e)
    $('mpm_navbar').appendChild(e)
    e.onclick = function(e){getDir(mytype, id)}
    e.label = lbl
}

function getDir(mytype, id, lbl) {
	id = (typeof(id)=='undefined') ? '' : id
    fltr = ""
    var f = $('files')
    f.focus()
	$('Pos').collapsed = (id != '[current]')
    if (mytype=='custom'){
        var dbc = ["search ", "find ", "lsinfo", "plchanges ",
                "list ", "listall", "listallinfo", "listplaylistinfo ",
                "playlistsearch ", "playlistinfo", "playlistfind "]
        var is_dbc = false
        var chkDupes = false
        for (x in dbc) {
            if (id.indexOf(dbc[x]) > -1) {
                is_dbc = true
            }
        }
        if (is_dbc) {
            for (x in dbc) {
                if (id.indexOf(dbc[x]) > -1) {
                    chkDupes = true
                }
            }
        }
        if (!is_dbc) {
            cmd = id.replace(/\\\\n/g, "\n").replace(/\;/g,"\n")
            simple_cmd(cmd)
            return null
        }
    }

    $('mpm_search').value='';
    $('search_deck').selectedIndex=0
    //Add to history only if it is a new location.
    if (mpm_history.length > 0) {
        //comparing array to array doesn't work in javascript...
        if (mpm_history[0][0] != mytype || mpm_history[0][1] != id) {
            mpm_history.unshift([mytype, id])
        }
    }
    else {mpm_history.unshift([mytype, id])}
    $('files_back').disabled=false
    if (mpm_history.length > 9) {mpm_history.length = 10}

    var fb = $('files_bookmark')
    fb.disabled = false
    for (x in home) {
        (home[x].type==mytype && home[x].Name==id)?fb.disabled=true:null
    }

    if (mytype != 'Album'){
        $("album_artBox").collapsed = true
        $('Album').collapsed = false
        $('Track').collapsed = true
    }
    while (nav_btns.length > 0) {
        var e = nav_btns.pop()
        $('mpm_navbar').removeChild(e)
        e = null
    }
    if (mytype == 'home') {setTable(home);fb.disabled=true;return null}

    if (mytype == 'directory') {
        var cb = function (data) {
            setTable(filter(parse_db(data), {'directory':true, 'file':true}))
        }
        var cmd = "lsinfo"
        addnav('Folders', 'directory', '')
        var dirs = id.split("/")
        var cd = []
        while (dirs.length > 0) {
            var cwd = dirs.shift()
            cd.push(cwd)
            if (cwd > "") {
                addnav(cwd, 'directory', cd.join("/"))
            }
        }
    }
    else if (mytype == 'playlist') {
        addnav("Playlists", 'playlist', '')
        if (id == '[current]') {
            addnav('Current Playlist', 'playlist', id)
            id = ""
            cmd = "playlistinfo"
            var cb = function (data) {
                setTable(filter(parse_db(data), {'file':true}))
            }
        }
        else if (id.length > 0) {
            addnav(id, 'playlist', id)
            cmd = "listplaylistinfo"
            var cb = function (data) {
                setTable(filter(parse_db(data), {'file':true}))
            }
        }
        else {
            cmd = 'lsinfo'
            var cb = function (data) {
                var db = filter(parse_db(data), {'playlist':true})
                db.unshift({'type': 'playlist', 'Name': '[current]', 'Title': 'Current Playlist'})
                setTable(db)
            }
        }
    }
    else if (mytype == 'ArtistAlbum') {
        addnav("Artists", 'Artist', '')
        if (id.length > 0) {
            addnav("Albums by "+id, 'ArtistAlbum', id)
            cmd = "list album artist"
            var cb = function (data) {
                setTable(filter(parse_db(data), {'Album':true}))
            }
        }
        else {
            cmd = "list artist"
            var cb = function (data) {
                setTable(filter(parse_db(data), {'Artist':true}))
            }
        }
    }
    else if (mytype == 'Album') {
        addnav("Albums", "Album", '')
        if (id.length > 0) {
            addnav(id, "Album", id)
            cmd = "find " + mytype
            var cb = function(data){
                var db = filter(parse_db(data), {'file':true})
                getCover($("album_art"), db[0])
                $("album_artBox").collapsed = false
                $('Album').collapsed = true
                $('Track').collapsed = false
                setTable(db)
            }
        }
        else {
            $("album_artBox").collapsed = true
            $('Album').collapsed = false
            $('Track').collapsed = true
            cmd = "list album"
            var cb = function (data) {
                setTable(filter(parse_db(data), {'Album':true}))
            }
        }
    }
    else if (mytype == 'custom') {
        if (typeof(lbl) == 'undefined') {lbl = 'Command: '+id}
        addnav(lbl, 'custom', id)
        cmd = id.replace(/\\\\n/g, "\n").replace(/\;/g,"\n")
        id = ""
        if (chkDupes) {
            var cb = function (data) {setTable(dbOR(parse_db(data)))}
        }
        else {
            var cb = function (data) {setTable(parse_db(data))}
        }
    }
    else {
        addnav(mytype+"s", mytype, '')
		if (id.length > 0) {
			addnav(id, mytype, id)
			cmd = "find " + mytype
		}
		else {
			cmd = "list "
			id = mytype
		}
        var cb = function (data) {
            setTable(parse_db(data))
        }
    }

    if (id && id.length > 0) {
        id = ' "'+id.replace(/"/g, '\\"')+'"'
    }
    command(cmd+id, cb)
}
function files_addBookmark() {
    if (mpm_history.length > 0) {
        var loc = mpm_history[0]
        var mytype = loc[0]
        var id = loc[1]
        var ttl = nav_btns[nav_btns.length-1].label
        home.push({'type':mytype, 'Name':id, 'Title':ttl})
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);
        prefs.setCharPref("extensions.mpm.home", home.toSource())
    }
    $('files_bookmark').disabled = true
}
function goBack(){
    if (fltr.length > 0){
        if (mpm_history.length > 0) {
            var loc = mpm_history.shift()
            var mytype = loc[0]
            var id = loc[1]
            getDir(mytype, id)
        }
    }
    else if (mpm_history.length > 1) {
        mpm_future.unshift(mpm_history.shift())
        var loc = mpm_history.shift()
        var mytype = loc[0]
        var id = loc[1]
        getDir(mytype, id)
        $('files_forward').disabled = false
    }
    if (mpm_history.length <= 1) {$('files_back').disabled=true}
}
function goForward(){
    if (mpm_future.length > 0) {
        var loc = mpm_future.shift()
        var mytype = loc[0]
        var id = loc[1]
        getDir(mytype, id)
    }
    if (mpm_future.length == 0) {$('files_forward').disabled=true}
}
function album_art_click(){
    var art = $('album_art')
    var artBox = $('album_artBox')
    if (art.className == "scaled") {
        artBox.style.width = "170px"
        art.className = ""
        }
    else {
        art.className = "scaled"
        artBox.style.width = "85px"
        }
}
function files_dblclick() {
    var tree = $('files')
    var R = tree.currentIndex
    var mytype = table[R].type
    var id = table[R].Name
    var lbl = table[R].Title
    if (mytype == "file") {
        if (mpm_history[0][0]=='playlist' && mpm_history[0][1]=='[current]') {
            simple_cmd('play '+table[R].Pos)
        }
        else {
            var l = mpd.playlistlength
            simple_cmd('add "'+id+'"')
            simple_cmd('play '+l)
        }
    }
    else {getDir(mytype, id, lbl)}
}
function find_album () {
  getDir('Album', active_item.Album)
}
function find_artist_songs () {
    if (active_item.type == "Artist") {var id = active_item.Title}
    else {var id = active_item.Artist}
    getDir('Artist', id)
}
function find_artist_albums () {
    if (active_item.type == "Artist") {var id = active_item.Title}
    else {var id = active_item.Artist}
    getDir('ArtistAlbum', id)
}
function files_googleIt() {
    google(active_item)
}
function files_lyricsfreak() {
  lyricsfreak(active_item.Title, active_item.type)
  }
function add(plname) {
    var tree=$("files")
    var add = (typeof(plname)=='undefined')?'add':'playlistadd "'+plname+'"'
    var start = new Object();
    var end = new Object();
    var numRanges = tree.view.selection.getRangeCount();
    var addCB = function (data){
        var db = filter(parse_db(data), {'file':true})
        var cmd = "command_list_begin\n"
        for (i in db) {cmd += add+' "'+db[i].Name+'"\n'}
        command(cmd+'command_list_end', null)
    }
    var cmd_list = ""

    for (var t = 0; t < numRanges; t++) {
        tree.view.selection.getRangeAt(t, start, end);
        for (var v = start.value; v <= end.value; v++) {
            var id = table[v].Name
            if (id && id.length > 0) {
                var itemtype = table[v].type
                if (itemtype != 'custom') {
                    id = ' "' + id.replace(/"/g, '\\"') + '"'
                }
                switch (itemtype) {
                    case "Artist":
                        command('find artist' + id, addCB);
                        break;
                    case "Album":
                        command('find album' + id, addCB);
                        break;
                    case "directory":
                        cmd_list += add + id +"\n"
                        break;
                    case "file":
                        cmd_list += add + id +"\n"
                        break;
                    case "playlist":
						lastPlaylistName = table[v].Name
                        cmd_list += 'load' + id +"\n"
                        break;
                    case "custom":
                        command(id, addCB);
                        break;

                }
            }
        }
    }
    if (cmd_list.length > 0) {
        simple_cmd("command_list_begin\n"+cmd_list+"command_list_end")
    }
}
function replace(){
    command("clear", null)
    add()
}
function files_update(dir){
	if (typeof(dir)!='undefined') {
		dir = ' "' + dir.replace(/"/g, '\\"') + '"'
	}
	else dir = ' /'
	mpd.updating_db = 1
    command("update"+dir, null)
}
function files_rescan(event){
    var loc = mpm_history[0]
	if (loc[0]=='directory') {
		dir = ' "' + loc[1].replace(/"/g, '\\"') + '"'
	}
	else dir = ' /'
	mpd.updating_db = 1
    command("update"+dir, null)
}
function files_home() {
    getDir('home','')
    }
function show_search(data){
    $("album_artBox").collapsed = true
    $('Album').collapsed = false
    setTable(parse_db(data))
}
function search (what, where){
    if (what.length > 1) {
        command('search ' + where + ' "' + what + '"', show_search)
    }
    else {
        $('files').ref=""
    }
}
function search_clear () {
    var loc = mpm_history.shift()
    var mytype = loc[0]
    var id = loc[1]
    getDir(mytype, id)
}
function files_contextShowing(event){
    active_item = table[$('files').currentIndex]
    if (typeof(active_item) == "undefined") {
        if (notCP) {event.preventDefault(); return false}
        var mytype = ''
        var myname = ''
    }
    else {
        var mytype = active_item.type
        var myname = active_item.Name
    }
    var loc = mpm_history[0]
    var isPL = (loc[0]=='playlist')
    var isCP = (isPL && loc[1]=='[current]')
	var isCPIcon = (myname=='[current]')
    var notPL = !isPL
    var notCP = !isCP
	
    $('files_context_open').label = 'Open'
    switch (mytype) {
        case 'file':
            $('files_context_open').label = 'Play';
			$('files_playlist_move').hidden = (notCP || fltr > '');
            $("files_menu_add").hidden = false;
            $("files_context_update").hidden = true;
            $('files_context_delete').hidden = notPL;
            $('files_context_rename').hidden = true;
            $('files_context_lyricsfreak').hidden = false;
            $('files_context_album').hidden = false;
            $('files_context_artist_songs').hidden = false;
            $('files_context_artist_albums').hidden = false;
            break;
        case 'directory':
            $("files_menu_add").hidden = false;
			$('files_playlist_move').hidden = true;
            $("files_context_update").hidden = false;
            $("files_context_update").value = myname;
            $('files_context_delete').hidden = true;
            $('files_context_rename').hidden = true;
            $('files_context_lyricsfreak').hidden = true;
            $('files_context_album').hidden = true;
            $('files_context_artist_songs').hidden = true;
            $('files_context_artist_albums').hidden = true;
            break;
        case 'Artist':
            $("files_menu_add").hidden = false;
			$('files_playlist_move').hidden = true;
            $("files_context_update").hidden = true;
            $('files_context_delete').hidden = true;
            $('files_context_rename').hidden = true;
            $('files_context_lyricsfreak').hidden = true;
            $('files_context_album').hidden = true;
            $('files_context_artist_songs').hidden = false;
            $('files_context_artist_albums').hidden = false;
            break;
        case 'Album':
            $("files_menu_add").hidden = false;
			$('files_playlist_move').hidden = true;
            $("files_context_update").hidden = true;
            $('files_context_delete').hidden = true;
            $('files_context_rename').hidden = true;
            $('files_context_lyricsfreak').hidden = true;
            $('files_context_album').hidden = true;
            $('files_context_artist_songs').hidden = true;
            $('files_context_artist_albums').hidden = true;
            break;
        case 'playlist':
            $("files_menu_add").hidden = true;
			$('files_playlist_move').hidden = true;
            $("files_context_update").hidden = true;
		    $('files_context_add').hidden = isCPIcon;
            $('files_context_delete').hidden = isCPIcon;
            $('files_context_rename').hidden = isCPIcon;
            $('files_context_lyricsfreak').hidden = true;
            $('files_context_album').hidden = true;
            $('files_context_artist_songs').hidden = true;
            $('files_context_artist_albums').hidden = true;
            break;
        case 'custom':
            $("files_menu_add").hidden = false;
			$('files_playlist_move').hidden = true;
            $("files_context_update").hidden = true;
            $('files_context_delete').hidden = false;
            $('files_context_rename').hidden = false;
            $('files_context_selectAll').hidden = true;
            $('files_context_google').hidden = true;
            $('files_context_lyricsfreak').hidden = true;
            $('files_context_album').hidden = true;
            $('files_context_artist_songs').hidden = true;
            $('files_context_artist_albums').hidden = true;
            break;
        case '':
            $("files_menu_add").hidden = true;
			$('files_playlist_move').hidden = true;
            $("files_context_update").hidden = true;
            $('files_context_open').hidden = true;
            $('files_context_delete').hidden = true;
            $('files_context_rename').hidden = true;
            $('files_context_google').hidden = true;
            $('files_context_lyricsfreak').hidden = true;
            $('files_context_album').hidden = true;
            $('files_context_artist_songs').hidden = true;
            $('files_context_artist_albums').hidden = true;
            break;
    }

    if (table==home) {
		var isCat = (myname=='')
	    $("files_menu_add").hidden = true;
	    $('files_context_add').hidden = (mytype=='playlist' && (isCat || isCPIcon));
	    $('files_context_replace').hidden = (mytype=='playlist' && (isCat || isCPIcon));
        $('files_context_delete').hidden = isCat;
        $('files_context_rename').hidden = isCat;
        $('files_context_selectAll').hidden = true;
        $('files_context_google').hidden = true;
        $('files_context_lyricsfreak').hidden = true;
        $('files_context_album').hidden = true;
        $('files_context_artist_songs').hidden = true;
        $('files_context_artist_albums').hidden = true;
    }
	else {
	    $("files_menu_add").hidden = (isCPIcon);
	    $('files_context_add').hidden = (isCP || isCPIcon);
	    $('files_context_replace').hidden = (isCP || isCPIcon);
	    $('files_playlist_sep').hidden = notCP;
	    $('files_context_new').hidden = notCP;
	    $('files_context_save').hidden = notCP;
	    $('files_context_shuffle').hidden = notCP;
	}
}

function delete_item(){
    var tree = $('files')
    var start = new Object();
    var end = new Object();
    var homeDirty = false
    var numRanges = tree.view.selection.getRangeCount();

    var loc = mpm_history[0]
    if (loc[0]=='playlist' && loc[1]>'') {
        var pcmd = (loc[1]=='[current]')?'\ndelete ':'\nplaylistdelete "'+loc[1]+'" '
        var cmd = "command_list_begin"
        for (var t=0; t<numRanges; t++){
            tree.view.selection.getRangeAt(t,start,end);
            for (var v=start.value; v<=end.value; v++){
                table[v].Pos = -1
            }
        }
        var offset = 0
        for (x in sort_natural) {
            if (sort_natural[x].Pos == -1) {
                cmd += pcmd + (x-offset)
                offset++
            }
        }
        cmd += "\ncommand_list_end"
        command(cmd,function(){getDir(loc[0], loc[1])})
    }
    else {
        for (var t = 0; t < numRanges; t++) {
            tree.view.selection.getRangeAt(t, start, end);
            for (var v = start.value; v <= end.value; v++) {
                var myname = table[v].Name
                var mytype = table[v].type
                if (mytype == 'playlist' && myname > '') {
                    var cb = function (data) {
                        getDir('playlist', '')
                    }
                    command('rm "'+myname+'"', cb)
                }
                else if (table == home && myname > '') {
                    homeDirty = true
                    table[v] = "[deleted]"
                }
            }
        }
        if (homeDirty) {
            home = new Array()
            var l = 0
            for (x in table) {
                if (table[x]!="[deleted]" && typeof(table[x])=='object') {
                    home.push(table[x])
                }
            }
            var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                    getService(Components.interfaces.nsIPrefBranch);
            prefs.setCharPref("extensions.mpm.home", home.toSource())
            files_home()
        }
    }
}
 function rename_item(){
    var tree = $('files')
    var v = tree.currentIndex
    var mytype = table[v].type
    var myname = table[v].Name
    if (mytype == 'playlist') {
        var cb = function (data) {
            getDir('playlist', '')
        }
        var val = prompt("Please enter a new name for this playlist", "NewPlaylist")
        if (val != null) {
            command('rename "'+myname+'" "'+val+'"', cb)
        }
    }
    else if (mytype == 'custom') {
        var val = prompt("Please enter a new name for this command", table[v].Title)
        if (val != null) {
            table[v].Title = val
            var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                    getService(Components.interfaces.nsIPrefBranch);
            prefs.setCharPref("extensions.mpm.home", home.toSource())
            files_home()
        }
    }
 }

function files_keypress (event) {
    switch (event.which){
        case 13: files_dblclick(); break;
        default:
            if (!event.ctrlKey && !event.altKey && event.charCode > 0) {
                filter_table(String.fromCharCode(event.charCode))
                event.stopPropagation()
                return false
            }
            break;
    }
}
function files_keydown(event){
    switch (event.which) {
        case 65:
            (event.ctrlKey) ? $('files').view.selection.selectAll() : null;
            break;
        case 27:
            $('playlist').focus();
            break;
        case 45:
            (event.shiftKey) ? replace() : add();
            break;
        case 46:
            delete_item();
            break;
    }
}
function check_cmd_list (e) {
    if (e.value.indexOf('command_list_begin') > -1) {
        if  (e.value.indexOf('command_list_end') < 0) {
            e.value += "\ncommand_list_end"
        }
    }
    else if (e.value.indexOf(';') > -1) {
        e.value = "command_list_begin;"+e.value
        if  (e.value.indexOf('command_list_end') < 0) {
            e.value += ";command_list_end"
        }
    }
}
function mpd_sent_keypress (e, event) {
    if (event.altKey) {
        if (event.keyCode == 13) {
            if (e.value.indexOf('command_list_begin') < 0) {
                e.value = "command_list_begin\n" + e.value
                $('mpd_response').value = "Command List"
            }
            e.value += "\n"
            var l = e.value.length
            e.setSelectionRange(l, l)
        }
    }
    else if (event.ctrlKey) {
            if (event.charCode == 100) {
                check_cmd_list(e)
                cmd_save()
                event.stopPropagation()
                return false
            }
    }
    else if (event.keyCode == 13) {
            check_cmd_list(e)
            getDir('custom',e.value)
        }
    else {

    }
}

function cmd_save () {
    var e = $('mpd_sent')
    check_cmd_list(e)
    var val = prompt("Please enter a name for this command", e.value)
    if (val != null) {
        home.push({'type': 'custom', 'Name': e.value, 'Title': val})
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);
        prefs.setCharPref("extensions.mpm.home", home.toSource())
        files_home()
    }
}
notify['updating_db'] = function(v){
    if (v == 0 && mpm_history.length > 0) {
		var loc = mpm_history.shift()
		var mytype = loc[0]
		var id = loc[1]
		getDir(mytype, id)
	}
	else {
		var tree = $('files')
		if (tree) {
			var boxobject = tree.boxObject;
			boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
			boxobject.invalidate()
		}
	}
}
notify['init'] = function() { getDir('home', '') }


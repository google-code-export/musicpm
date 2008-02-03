var mpm_history = []
var mpm_future = []
var table = []
var sort_natural = []
var nav_btns = []
var active_item = null

var fileObserver = {
    onDragStart: function (event, transferData, action) {
        var row = { }
        var col = { }
        var child = { }
        $('files').treeBoxObject.getCellAt(event.pageX, event.pageY, row, col, child)
        if (!col.value) {  return }
        var plainText = table[$('files').currentIndex].Name
        transferData.data = new TransferData();
        transferData.data.addDataForFlavour("text/unicode",plainText);
        transferData.data.addDataForFlavour("mpm/filename",plainText);
    },
    onDragOver: function (event, flavour, session) {
    },
    onDragExit: function (event, session) {
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
        if (columnName == 'Track') {return (a.Track - b.Track) * order}
        if (prepareForComparison(a[columnName]) > prepareForComparison(b[columnName])) return 1 * order;
        if (prepareForComparison(a[columnName]) < prepareForComparison(b[columnName])) return -1 * order;
        //tie breaker: name ascending is the second level sort
        if (columnName != "Name") {
            if (prepareForComparison(a["Name"]) > prepareForComparison(b["Name"])) return 1;
            if (prepareForComparison(a["Name"]) < prepareForComparison(b["Name"])) return -1;
        }
        return 0;
    }
    if (order != 0) {
        table.sort(columnSort);
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
function setTable(data){
    table = data
    sort_natural = []
    var l = table.length
    var n = l
    if (l > 0) {
        do {
            sort_natural.push(data[l-n])
        } while (--n)
    }
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
                if (typeof(table) == 'undefined') {return null}
                if (!table[C.id]){table[C.id] = ""}
                if (C.id=="Time" && table[R].Time > ''){return hmsFromSec(table[R]["Time"])}
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
                var aserv = Components.classes["@mozilla.org/atom-service;1"]
                            .getService(Components.interfaces.nsIAtomService);
                props.AppendElement( aserv.getAtom(col.id+"_"+table[row].type) )
                props.AppendElement( aserv.getAtom(col.id) )
                aserv = null
                } catch(e) {}
            },
            getColumnProperties: function(colid,col,props){
            },
            cycleHeader: function(col, elem) {return null},
            getParentIndex: function(idx) {return -1},
            canDrop: function(index, orient) {
                return (table==home);
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
            }
        };
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

function getDir(mytype, id) {
    var f = $('files')
    f.focus()
    if (mytype=='custom'){
        var cc = "<"+id.split(" ")[0]+">"
        var vc = "<search><find><lsinfo><plchanges>" +
                "<list><listall><listallinfo><listplaylistinfo>" +
                "<playlistsearch><playlistinfo><playlistfind>"
        if (vc.indexOf(cc) < 0) {simple_cmd(id); return null}
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
    else if (mytype == 'Artist') {
        addnav("Artists", 'Artist', '')
        if (id.length > 0) {
            addnav(id, 'Artist', id)
            cmd = "find artist"
            var cb = function (data) {
                setTable(filter(parse_db(data), {'file':true}))
            }
        }
        else {
            cmd = "list artist"
            var cb = function (data) {
                setTable(filter(parse_db(data), {'Artist':true}))
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
        addnav('Command: '+id, 'custom', id)
        cmd = id
        id = ""
        var cb = function (data) {
            setTable(parse_db(data))
        }
    }
    else {
        addnav(mytype+': '+id, 'custom', id)
        cmd = "find " + mytype
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
    if (mpm_history.length > 1) {
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
    if (mytype == "file") {
        var l = mpd.playlistlength
        simple_cmd('add "'+id+'"')
        simple_cmd('play '+l)
    }
    else {getDir(mytype, id)}
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
function add() {
    var tree=$("files")
    var start = new Object();
    var end = new Object();
    var numRanges = tree.view.selection.getRangeCount();
    var addCB = function (data){
        var db = filter(parse_db(data), {'file':true})
        var cmd = "command_list_begin\n"
        for (i in db) {cmd += 'add "'+db[i].Name+'"\n'}
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
                        cmd_list += 'add' + id +"\n"
                        break;
                    case "file":
                        cmd_list += 'add' + id +"\n"
                        break;
                    case "playlist":
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
function files_rescan(){
    command("update", null)
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
function files_contextShowing(){
    active_item = table[$('files').currentIndex]
    if (active_item.Name > "") {
        var mytype = active_item.type
        switch (mytype) {
            case 'file':
                $('files_context_delete').hidden = true;
                $('files_context_rename').hidden = true;
                $('files_context_lyricsfreak').hidden = false;
                $('files_context_album').hidden = false;
                $('files_context_artist_songs').hidden = false;
                $('files_context_artist_albums').hidden = false;
                break;
            case 'directory':
                $('files_context_delete').hidden = true;
                $('files_context_rename').hidden = true;
                $('files_context_lyricsfreak').hidden = true;
                $('files_context_album').hidden = true;
                $('files_context_artist_songs').hidden = true;
                $('files_context_artist_albums').hidden = true;
                break;
            case 'Artist':
                $('files_context_delete').hidden = true;
                $('files_context_rename').hidden = true;
                $('files_context_lyricsfreak').hidden = true;
                $('files_context_album').hidden = true;
                $('files_context_artist_songs').hidden = false;
                $('files_context_artist_albums').hidden = false;
                break;
            case 'Album':
                $('files_context_delete').hidden = true;
                $('files_context_rename').hidden = true;
                $('files_context_lyricsfreak').hidden = true;
                $('files_context_album').hidden = true;
                $('files_context_artist_songs').hidden = true;
                $('files_context_artist_albums').hidden = true;
                break;
            case 'playlist':
                $('files_context_delete').hidden = false;
                $('files_context_rename').hidden = false;
                $('files_context_lyricsfreak').hidden = true;
                $('files_context_album').hidden = true;
                $('files_context_artist_songs').hidden = true;
                $('files_context_artist_albums').hidden = true;
                break;
            case 'custom':
                $('files_context_delete').hidden = false;
                $('files_context_rename').hidden = false;
                $('files_context_selectAll').hidden = true;
                $('files_context_google').hidden = true;
                $('files_context_lyricsfreak').hidden = true;
                $('files_context_album').hidden = true;
                $('files_context_artist_songs').hidden = true;
                $('files_context_artist_albums').hidden = true;
                break;
        }
    }
    else {
        $('files_context_delete').hidden = true;
        $('files_context_rename').hidden = true;
        $('files_context_google').hidden = true;
        $('files_context_lyricsfreak').hidden = true;
        $('files_context_album').hidden = true;
        $('files_context_artist_songs').hidden = true;
        $('files_context_artist_albums').hidden = true;
    }
    if (table==home) {
        $('files_context_delete').hidden = false;
    }

}
 function delete_item(){
    var tree = $('files')
    var start = new Object();
    var end = new Object();
    var homeDirty = false
    var numRanges = tree.view.selection.getRangeCount();

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
            else if (myname > '') {
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
        case 65:
            if (event.ctrlKey) {
                $('files').view.selection.selectAll()
            }; break;
        case 45: add(); break;
        default: //alert(event.which);
            break;
    }
}
notify['db_update'] = function(v){
    if (mpm_history.length > 0) {
        var loc = mpm_history.shift()
        var mytype = loc[0]
        var id = loc[1]
        getDir(mytype, id)
    }
}
notify['init'] = function() {getDir('home', '')}


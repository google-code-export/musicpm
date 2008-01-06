var mpm_history = []
var mpm_future = []
var table = []
var sort_natural = []
var db = []
var nav_btns = []
var home = [
    {
        'type': 'directory',
        'Name': '/',
        'Title': 'Folders'
    },
    {
        'type': 'Artist',
        'Name': '',
        'Title': 'Artists'
    },
    {
        'type': 'Album',
        'Name': '',
        'Title': 'Albums'
    },
    {
        'type': 'playlist',
        'Name': '',
        'Title': 'Playlists'
    },
]
function clearDS(elem){
    var list = elem.database.GetDataSources();
    while (list.hasMoreElements()){
        var ds = list.getNext();
        if (ds instanceof Components.interfaces.nsIRDFDataSource){
            elem.database.RemoveDataSource(ds)
        }
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
    $(tree.getAttribute("sortResource")).setAttribute("sortDirection", '');
    tree.setAttribute("sortDirection", '');
    tree.setAttribute("sortResource", '');
}
function assignView() {
    var tree = $('files')
    tree.view = {
        rowCount : table.length,
        getCellText : function (R, C) {
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
            props.AppendElement( aserv.getAtom(table[row].type) )
        },
        getCellProperties: function(row,col,props){
            props.AppendElement( aserv.getAtom(col.id+"_"+table[row].type) )
            props.AppendElement( aserv.getAtom(col.id) )
        },
        getColumnProperties: function(colid,col,props){
        },
        cycleHeader: function(col, elem) {return null}
    };
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
    if (mytype == 'home') {setTable(home);return null}
    var cb = function (data) {
        setTable(filter(parse_db(data), {'directory':true, 'file':true}))
    }
    var cmd = "lsinfo"

    if (mytype == 'directory') {
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
    if (mytype == 'playlist') {
        addnav("Playlists", 'playlist', '')
        if (id.length > 0) {
            addnav(id, 'playlist', id)
            cmd = "listplaylistinfo"
            var cb = function (data) {
                setTable(filter(parse_db(data), {'file':true}))
            }
        }
        else {
            var cb = function (data) {
                setTable(filter(parse_db(data), {'playlist':true}))
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
    if (id && id.length > 0) {
        id = ' "'+id.replace(/"/g, '\\"')+'"'
    }
    command(cmd+id, cb)
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
  if (mytype == "file") {command('add "'+id+'"', null)}
  else {getDir(mytype, id)}
  }


function files_googleIt() {
  var tree = $('files')
  var v = tree.currentIndex
  var id = table[v].Name
  var mytype = table[v].type
  google(id, mytype)
  }
function files_lyricsfreak() {
  var tree = $('files')
  var v = tree.currentIndex
  var id = table[v].Name
  var mytype = table[v].type
  lyricsfreak(id, mytype)
  }

function add() {
    var tree=$("files")
    var start = new Object();
    var end = new Object();
    var numRanges = tree.view.selection.getRangeCount();
    var addCB = function (data){
        var db = filter(parse_db(data), {'files':true})
        var cmd = "command_list_begin\n"
        for (i in db) {cmd += 'add "'+db[i].file+'"\n'}
        command(cmd+'command_list_end', null)
    }

    for (var t = 0; t < numRanges; t++) {
        tree.view.selection.getRangeAt(t, start, end);
        for (var v = start.value; v <= end.value; v++) {
            var id = table[v].Name
            if (id && id.length > 0) {
                id = ' "' + id.replace(/"/g, '\\"') + '"'
                var itemtype = table[v].type
                switch (itemtype) {
                    case "Artist":
                        command('find artist' + id, addCB);
                        break;
                    case "Album":
                        command('find album' + id, addCB);
                        break;
                    case "directory":
                        command('add' + id, null);
                        break;
                    case "file":
                        command('add' + id, null)
                        break;
                    case "playlist":
                        command('load' + id, null)
                        break;
                }
            }
        }
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
    var tree = $('files')
    var mytype = table[tree.currentIndex].type
    if (mytype == 'playlist') {
        $('files_context_delete').hidden = false
        $('files_context_rename').hidden = false
    }
    else {
        $('files_context_delete').hidden = true
        $('files_context_rename').hidden = true
    }
    if (mytype == 'file') {
        $('files_context_lyricsfreak').hidden = false
    }
    else {
        $('files_context_lyricsfreak').hidden = true
    }
 }
 function delete_playlist(){
    var tree = $('files')
    var start = new Object();
    var end = new Object();
    var numRanges = tree.view.selection.getRangeCount();

    for (var t = 0; t < numRanges; t++) {
        tree.view.selection.getRangeAt(t, start, end);
        for (var v = start.value; v <= end.value; v++) {
            var myname = table[v].Name
            var mytype = table[v].type
            if (mytype == 'playlist') {
                var cb = function (data) {
                    getDir('playlist', '')
                }
                command('rm "'+myname+'"', cb)
            }
        }
    }
 }
 function rename_playlist(){
    var tree = $('files')
    var mytype = table[v].type
    var myname = table[v].Name
    if (mytype == 'playlist') {
        var cb = function (data) {
            getDir('playlist', '')
        }
        var val = prompt("Please enter a new name for this playlist", "NewPlaylist")
        if (val != null) {
            command('rename "'+myname+'" "'+val+'"', null)
        }
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

var wa2_history = new Array()
var wa2_future = new Array()

function clearDS(elem){
	var list = elem.database.GetDataSources();
	while (list.hasMoreElements()){
		var ds = list.getNext();
		if (ds instanceof Components.interfaces.nsIRDFDataSource){
			elem.database.RemoveDataSource(ds)
		}
	}
}
function setColDB(db) {
    dbVersion = db
    var f = $('files')
    var n = $('navtree')
    clearDS(f)
	clearDS(n)
	var root = rdfService.GetDataSource("chrome://webamp2/content/nav_root.xml")
	n.database.AddDataSource(root)
	var com = "command_list_begin\n" +
				"lsinfo\n" +
				"list artist\n" +
				"list album\n" +
				"command_list_end\n"
	var cb = function(data){
		db = parse_db(data)
		
		db_ds['dir'] = dbRDF(db, "mpd://dirs", {'dir': true})
		n.database.AddDataSource(db_ds['dir'])
		
		db_ds['artist'] = dbRDF(db, "mpd://artists", {'artist': true})
		n.database.AddDataSource(db_ds['artist'])
		
		db_ds['album'] = dbRDF(db, "mpd://albums", {'album': true})
		n.database.AddDataSource(db_ds['album'])
		
		playlists_ds = dbRDF(db, "mpd://playlists", {'playlist': true})
		n.database.AddDataSource(playlists_ds)
		
		n.builder.rebuild()
	}
	command(com, cb)
    n.disabled = false
    f.disabled = false
}


function navSelect(e) {
	var tree = $('navtree')
	try {var id = tree.view.getCellValue(tree.currentIndex,tree.columns.getNamedColumn('navname'))}
	catch (err) {var id = ""}
	try {
		var mytype = tree.view.getCellValue(tree.currentIndex,tree.columns.getNamedColumn('navtype'))
		getDir(mytype, id)
	}
	catch (err){}
}
function getDir(mytype, id) {
    $('wa2_search').value='';
    $('search_deck').selectedIndex=0
    //Add to history only if it is a new location.
    if (wa2_history.length > 0) {
        //comparing array to array doesn't work in javascript...
        if (wa2_history[0][0] != mytype || wa2_history[0][1] != id) {
            wa2_history.unshift([mytype, id])
        }
    }
    else {wa2_history.unshift([mytype, id])}
    $('files_back').disabled=false
    if (wa2_history.length > 9) {wa2_history.length = 10}
    var f = $('files')
	clearDS(f)
	
	if (mytype != 'album'){
		$("album_artBox").collapsed = true
		$('album').collapsed = false
	}
	if (id == "" && mytype != 'playlist') {
		f.database.AddDataSource(db_ds[mytype])
		f.ref = "mpd://" + mytype + "s"
		f.builder.rebuild()
	}
	else {
		if (id) {
			id = id.replace(/"/g, '\\"')
		}
		if (mytype == 'dir') {
			var cb = function(data){
				db = parse_db(data)
				contents_ds = dbRDF(db, "mpd://contents", {'dir': true, 'file': true})
				f.database.AddDataSource(contents_ds)
				f.ref = "mpd://contents"
				f.builder.rebuild()
			}
			command('lsinfo "' + id + '"', cb)
		}
		else 
			if (mytype == 'playlist') {
				if (id == '') {
					var cb = function(data){
						$('navtree').database.RemoveDataSource(playlists_ds)
						playlists_ds = dbRDF(parse_db(data), "mpd://playlists", {'playlist': true})
						$('navtree').database.AddDataSource(playlists_ds)
						f.database.AddDataSource(playlists_ds)
						f.ref = "mpd://playlists"
						f.builder.rebuild()
					}
					command('lsinfo', cb)
				}
				else {
					var cb = function(data){
						db = parse_db(data)
						contents_ds = dbRDF(db, "mpd://contents", {'file': true})
						f.database.AddDataSource(contents_ds)
						f.ref = "mpd://contents"
						f.builder.rebuild()
					}
					command('listplaylistinfo "'+id+'"', cb)
					
				}
			}
			else {
				var cb = function(data){
					db = parse_db(data)
					content_ds = dbRDF(db, "mpd://contents", {'file': true})
					var f = $('files')
					f.database.AddDataSource(content_ds)
					f.ref = "mpd://contents"
					f.builder.rebuild()
					if (mytype == 'album') {
						var elem = $("album_artBox")
						var i = 0
						do {
							var song = db[i]
							i++
						} while (song && song.type != 'file')
						getCover($("album_art"), song)
						elem.collapsed = false
						$('album').collapsed = true
					}
				}
				command('find ' + mytype + ' "' + id + '"', cb)
			}
	}
}
function selectNav(mytype, id){
    var tree = $('navtree')
    var tid = -1
    var ttype = -1
    var ci = tree.currentIndex
    if (ci >= 0) {
        if (tree.view.selection.isSelected(ci)) {
            tid = tree.view.getCellValue(ci, tree.columns.getNamedColumn('navname'))
            ttype = tree.view.getCellValue(tree.currentIndex, tree.columns.getNamedColumn('navtype'))
        }
    }
    if (tid != id || ttype != mytype) {
        var builder = tree.builder
        var node = rdfService.GetResource(NS + "/" + mytype + "/" + id)
        var idx = builder.getIndexOfResource(node)
        if (idx != -1) {
            builder.root.view.selection.select(idx);
            var boxobject = tree.boxObject;
            boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
            boxobject.ensureRowIsVisible(idx)
        }
        else {
            tree.view.selection.clearSelection()
            }
    }
}
function goBack(){
    if (wa2_history.length > 1) {
        wa2_future.unshift(wa2_history.shift())
        var loc = wa2_history.shift()
        var mytype = loc[0]
        var id = loc[1]
        getDir(mytype, id)
        $('files_forward').disabled = false
    }
    if (wa2_history.length <= 1) {$('files_back').disabled=true}
}
function goForward(){
    if (wa2_future.length > 0) {
        var loc = wa2_future.shift()
        var mytype = loc[0]
        var id = loc[1]
        getDir(mytype, id)
    }
    if (wa2_future.length == 0) {$('files_forward').disabled=true}
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
  var id = tree.view.getCellValue(tree.currentIndex,tree.columns.getNamedColumn('name'))
  var mytype = tree.view.getCellValue(tree.currentIndex,tree.columns.getNamedColumn('type'))
  if (mytype == "file") {command('add "'+id+'"', null)}
  else {
    var tree = $('navtree')
    if (!tree.view.isContainerOpen(tree.currentIndex)) {
        tree.view.toggleOpenState(tree.currentIndex)
    }
    getDir(mytype, id)
    }
  }


function files_googleIt() {
  var tree = $('files')
  var id = tree.view.getCellText(tree.currentIndex,tree.columns.getNamedColumn('title'))
  var mytype = tree.view.getCellValue(tree.currentIndex,tree.columns.getNamedColumn('type'))
  google(id, mytype)
  }
function files_lyricsfreak() {
  var tree = $('files')
  var id = tree.view.getCellText(tree.currentIndex,tree.columns.getNamedColumn('title'))
  var mytype = tree.view.getCellValue(tree.currentIndex,tree.columns.getNamedColumn('type'))
  lyricsfreak(id, mytype)
  }
function files_info(){
  var tree = $('files')
  var id = tree.view.getCellValue(tree.currentIndex,tree.columns.getNamedColumn('name'))
  openURL(base+"/song_info?id="+id)
}
function nav_googleIt() {
  var tree = $('navtree')
  var id = tree.view.getCellText(tree.currentIndex,tree.columns.getNamedColumn('navname'))
  var mytype = tree.view.getCellValue(tree.currentIndex,tree.columns.getNamedColumn('navtype'))
  google(id, mytype)
  }
function nav_lyricsfreak() {
  var tree = $('navtree')
  var id = tree.view.getCellText(tree.currentIndex,tree.columns.getNamedColumn('navname'))
  var mytype = tree.view.getCellValue(tree.currentIndex,tree.columns.getNamedColumn('navtype'))
  lyricsfreak(id, mytype)
  }


function nav_add() {
	var tree = $('navtree')
	var id = tree.view.getCellValue(tree.currentIndex,tree.columns.getNamedColumn('navname'))
	var mytype = tree.view.getCellValue(tree.currentIndex,tree.columns.getNamedColumn('navtype'))
	var addCB = function (data){
		db = parse_db(data)
		for (i in db.files) {command('add "'+db.files[i].file+'"', null)}
	}
	switch (mytype) {
		case "artist":
			command('search artist "'+id+'"', addCB);
			break;
		case "album":
			command('search album "'+id+'"', addCB);
			break;
		case "dir":
			command('add "'+id+'"',null);
			break;
		case "file":
			command('add "'+id+'"',null)
			break;
		case "playlist":
			command('load "'+id+'"',null)
			break;
	}
}
function nav_replace() {
    command("clear", null)
	nav_add()
  }
function add() {
	var tree=$("files")
	var start = new Object();
	var end = new Object();
	var numRanges = tree.view.selection.getRangeCount();
	var addCB = function (data){
		db = parse_db(data)
		for (i in db.files) {command('add "'+db.files[i].file+'"', null)}
	}
	
	for (var t = 0; t < numRanges; t++) {
		tree.view.selection.getRangeAt(t, start, end);
		for (var v = start.value; v <= end.value; v++) {
			var id = tree.view.getCellValue(v, tree.columns.getNamedColumn('name'))
			var itemtype = tree.view.getCellValue(v, tree.columns.getNamedColumn('type'))
			switch (itemtype) {
				case "artist":
					command('search artist "'+id+'"', addCB);
					break;
				case "album":
					command('search album "'+id+'"', addCB);
					break;
				case "dir":
					command('add "'+id+'"',null);
					break;
				case "file":
					command('add "'+id+'"',null)
					break;
				case "playlist":
					command('load "'+id+'"',null)
					break;
			}
		}
	}
}
function replace(){
    command("clear", null)
	add()
}
function nav_rescan(){
    command("update", null)
}
function nav_collapse() {
    var treeView = $('navtree').view
    for (var i=(treeView.rowCount-1);i>=0;i--) {
        if (i>=treeView.rowCount) {i=treeView.rowCount-1}
           if (treeView.isContainer(i) && treeView.isContainerOpen(i)){
            treeView.toggleOpenState(i);
            }
        }
    }
function show_search(data){
    var f = $('files')
    if (content_ds) {
      f.database.RemoveDataSource(content_ds)
      }
	var db = parse_db(data)
	content_ds = dbRDF(db, "mpd://search_results/contents", {'file': true})
    f.database.AddDataSource(content_ds)
    f.ref="mpd://search_results/contents"
    f.builder.rebuild()
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
    var loc = wa2_history.shift()
    var mytype = loc[0]
    var id = loc[1]
    getDir(mytype, id)
}
function files_contextShowing(){
 	var tree = $('files')
 	var mytype = tree.view.getCellValue(tree.currentIndex, tree.columns.getNamedColumn('type'))
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
			var myname = tree.view.getCellValue(v, tree.columns.getNamedColumn('name'))
			var mytype = tree.view.getCellValue(v, tree.columns.getNamedColumn('type'))
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
 	var mytype = tree.view.getCellValue(tree.currentIndex, tree.columns.getNamedColumn('type'))
	var myname = tree.view.getCellValue(tree.currentIndex, tree.columns.getNamedColumn('name'))
 	if (mytype == 'playlist') {
		var cb = function (data) {
			getDir('playlist', '')
		}
	    var val = prompt("Please enter a name for this playlist", "NewPlaylist")
	    if (val != null) {
	        command('rename "'+myname+'" "'+val+'"', null)
	    }
 	}
 }
notify['db_update'] = setColDB

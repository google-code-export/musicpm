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
	var fdb = {
		'playlists': [],
		'dirs': [],
		'artists': [],
		'albums': [],
		'files': []
	}
	var com = "command_list_begin\n" +
				"lsinfo\n" +
				"list artist\n" +
				"list album\n" +
				"command_list_end\n"
	var cb = function(data){
		db = parse_db(data)
		
		fdb['dirs'] = db['dirs']
		db_ds['dir'] = dbRDF(fdb, "mpd://dirs")
		n.database.AddDataSource(db_ds['dir'])
		fdb['dirs'] = []
		
		fdb['artists'] = db['artists']
		db_ds['artist'] = dbRDF(fdb, "mpd://artists")
		n.database.AddDataSource(db_ds['artist'])
		fdb['artists'] = []
		
		fdb['albums'] = db['albums']
		db_ds['album'] = dbRDF(fdb, "mpd://albums")
		n.database.AddDataSource(db_ds['album'])
		fdb['albums'] = []
		
		fdb['playlists'] = db['playlists']
		playlists_ds = dbRDF(fdb, "mpd://playlists")
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
	if (id == "" && mytype != 'playlist') {
		f.database.AddDataSource(db_ds[mytype])
		f.ref = "mpd://" + mytype + "s"
		f.builder.rebuild()
	}
	else {
		id = id.replace(/"/g, '\\"')
		if (mytype == 'dir') {
			var cb = function(data){
				db = parse_db(data)
				contents_ds = dbRDF(db, "mpd://contents")
				f.database.AddDataSource(contents_ds)
				f.ref = "mpd://contents"
				f.builder.rebuild()
			}
			command('lsinfo "' + id + '"', cb)
		}
		else 
			if (mytype == 'playlist') {
				if (id == '') {
					var cb2 = function(data){
						var db = {
							'files': [],
							'dirs': [],
							'artists': [],
							'albums': [],
							'playlists': parse_db(data).playlists
						}
						$('navtree').database.RemoveDataSource(playlists_ds)
						playlists_ds = dbRDF(db, "mpd://playlists")
						$('navtree').database.AddDataSource(playlists_ds)
						f.database.AddDataSource(playlists_ds)
						f.ref = "mpd://playlists"
						f.builder.rebuild()
					}
					command('lsinfo', cb2)
				}
				else {
					var cb2 = function(data){
						db = parse_db(data)
						contents_ds = dbRDF(db, "mpd://contents")
						f.database.AddDataSource(contents_ds)
						f.ref = "mpd://contents"
						f.builder.rebuild()
					}
					command('listplaylistinfo "'+id+'"', cb2)
					
				}
			}
			else {
				var cb = function(data){
					db = parse_db(data)
					content_ds = dbRDF(db, "mpd://contents")
					f.database.AddDataSource(content_ds)
					f.ref = "mpd://contents"
					f.builder.rebuild()
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
        artBox.style.width = "250px"
        art.className = ""
        }
    else {
        art.className = "scaled"
        artBox.style.width = "150px"
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
	content_ds = dbRDF(db, "mpd://search_results/contents")
    f.database.AddDataSource(content_ds)
    f.ref="mpd://search_results/contents"
    f.builder.rebuild()
}
function search (what, where){
	if (what.length > 2) {
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

notify['db_update'] = setColDB

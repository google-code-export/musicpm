Components.utils.import("resource://minion/mpmUtils.js");
Components.utils.import("resource://minion/mpd.js");
Components.utils.import("resource://minion/trees.js");


var observerPlaylists = {
    observe: function(subject,topic,data){
        refreshPlaylists()
    }
};
var observerPlaylistName = {
    observe: function(subject,topic,data){
        document.getElementById("playlistName").value = data
    }
};

function browse_select (item, loc) {
    var browse = document.getElementById('browse')
    if (!item) return null
    debug("select from minion.js: "+item.Title)
    mpmMenu_contextShowing(null,loc,item,'mpmDynamicMenu2', "toolbarbutton")
}

function init () {
    document.getElementById("main").className = (prefs.get("use_theme", true)) ? "mpm_themed" : ""
    var orient = (prefs.get("playlist_bottom", false)) ? "vertical" : "horizontal"
    document.getElementById("main_content").setAttribute("orient", orient)
    document.getElementById("main_content_splitter").setAttribute("orient", orient);
    var prefObserver = {
        register: function(){
            this._branch = prefs.branch;
            this._branch.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
            this._branch.addObserver("", this, false);
        },

        unregister: function(){
            if (!this._branch)
                return;
            this._branch.removeObserver("", this);
        },

        observe: function(aSubject, aTopic, aData){
            if (aTopic != "nsPref:changed")
                return;
            // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
            // aData is the name of the pref that's been changed (relative to aSubject)
            switch (aData) {
                case "use_theme":
                    document.getElementById("main").className = (prefs.get("use_theme", true)) ? "mpm_themed" : ""
                    break;
                case "playlist_bottom":
                    var orient = (prefs.get("playlist_bottom", false)) ? "vertical" : "horizontal";
                    document.getElementById("main_content").setAttribute("orient", orient);
                    document.getElementById("main_content_splitter").setAttribute("orient", orient);
                    break;
                    
            }
        }
    };
    prefObserver.register();
    observerService.addObserver(observerPlaylists,"playlists",false)
    observerService.addObserver(observerPlaylistName,"playlistname",false)
    if(!mpd._socket) mpd.connect()
    window.name = "chrome://minion/content/minion.xul"
    var browse = document.getElementById('browse')
    browse.handle_select = browse_select
	var s = decodeURI(window.location.search)
	debug(s)
	if (s.length != 0) {
		s = s.split("=")
		switch (s[0]) {
			case "?url": mpd.handleURL(s[1]); break;
			case "?play_url":  mpd.handleURL(s[1], "play"); break;
			case "?cmd": 
				var q = new dbQuery((s[1]));
				q.execute();
				break;
		}
	}
	setTimeout("post_init()",1)
    document.getElementById("playlistName").value = mpd.playlistname
}

function post_init () {
	var q = Application.storage.get("doQuery", null)
	var d = Application.storage.get("doDetails", null)
    debug("post_init()");
	debug(q)
	debug(d)
    if (q) {
        document.getElementById("browse").goTo(q)
		Application.storage.set("doQuery", null)
    }
    if (d) {
        document.getElementById("browse").showDetails(d)
		Application.storage.set("doDetails", null)
    }
}

function unload () {
    document.getElementById("browse").saveColumns()
    document.getElementById("playlist").saveColumns()
    document.getElementById("browser_playlist").saveColumns()
    observerService.removeObserver(observerPlaylists,"playlists")
    observerService.removeObserver(observerPlaylistName,"load_playlist")
}

function mpdExecute () {
    var q = new dbQuery()
    q.cmd = prompt(translateService.GetStringFromName('enter_mpd_cmd'))
    q.query = q.cmd
    document.getElementById("browse").goTo(q)
}

function setFavicon (url) {
    try {
    var el = document.getElementById("mpm_favicon")
    var win = document.getElementById("main")
    win.removeChild(el)
    el = null
    var link = document.createElementNS("http://www.w3.org/1999/xhtml","link");
    link.id = "mpm_favicon"
    link.type = "image/x-icon";
    link.rel = "shortcut icon";
    link.href = url;
    win.appendChild(link)
    } catch (e) {debug(e)}
}

function loadCurrentAlbum() {
    var q = new dbQuery()
    q.type = "file"
    q.scope = "Album"
    q.query = mpd.Album
    q.filterField = "Artist"
    q.filterQuery = mpd.Artist
    document.getElementById("browse").goTo(q, mpd.currentsong)
}

function viewCurrentSong() {
    document.getElementById("browse").showDetails(mpd.currentsong)
}
function refreshPlaylists () {
    var list = document.getElementById("savedPlaylists")
    var q = new dbQuery()
    q.type = "playlist"
    q.query = ""
    q.execute(function(db){
        list.view = new arrayView(db)
    })
}

function showPlaylists () {
    var list = document.getElementById("savedPlaylists")
    if (list.collapsed == false) {
        list.collapsed = true
        document.getElementById("playlist_splitter").collapsed = true
        return null
    }
    list.collapsed = false
    document.getElementById("playlist_splitter").collapsed = false
    refreshPlaylists()
}

function loadPlaylist(name) {
    var c = "command_list_begin\n" +
            "clear\n" +
            'load  "' + name.replace(/"/g, '\\"') + '"\n' +
            "command_list_end"
    mpd.doCmd(c)
    document.getElementById("savedPlaylists").collapsed = true
    document.getElementById("playlist_splitter").collapsed = true
}

function savePlaylist () {
    var name = document.getElementById("playlistName").value
    if (name == "") return null
    mpd.doCmd('save "' + name.replace(/"/g, '\\"') + '"')

}

function savedPlaylists_context () {
    var lists = document.getElementById("savedPlaylists")
    var item = {
        type: 'playlist',
        name: lists.view.getCellText(lists.currentIndex, lists.columns[0])
    }
    item.Title = item.name
    mpmMenu_contextShowing(event, 'mpdbrowser', item)
}

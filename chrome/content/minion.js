Components.utils.import("resource://minion/mpmUtils.js");
Components.utils.import("resource://minion/trees.js");

var postinittimer = Components.classes["@mozilla.org/timer;1"]
                .createInstance(Components.interfaces.nsITimer);

var observerPlaylists = {
    observe: function(subject,topic,data){
        refreshPlaylists()
    }
};
var observerPlaylistName = {
    observe: function(subject,topic,data){
        if ( document != null ) document.getElementById("playlistName").value = data
    }
};

function browse_select (item, loc) {
    var browse = document.getElementById('browse')
    if (!item) return
    nsMPM.debug("select from minion.js: "+item.Title)
    mpmMenu_contextShowing(null,loc,item,'mpmDynamicMenu2', "toolbarbutton")
}

function init () {
    document.getElementById("main").className = (nsMPM.prefs.get("use_theme", true)) ? "mpm_themed" : ""
    var orient = (nsMPM.prefs.get("playlist_bottom", false)) ? "vertical" : "horizontal"
    document.getElementById("main_content").setAttribute("orient", orient)
    document.getElementById("main_content_splitter").setAttribute("orient", orient);
    var prefObserver = {
        register: function(){
            this._branch = nsMPM.prefs.branch;
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
                    document.getElementById("main").className = (nsMPM.prefs.get("use_theme", true)) ? "mpm_themed" : ""
                    break;
                case "playlist_bottom":
                    var orient = (nsMPM.prefs.get("playlist_bottom", false)) ? "vertical" : "horizontal";
                    document.getElementById("main_content").setAttribute("orient", orient);
                    document.getElementById("main_content_splitter").setAttribute("orient", orient);
                    break;
                    
            }
        }
    };
    prefObserver.register();
    nsMPM.observerService.addObserver(observerPlaylists,"playlists",false)
    nsMPM.observerService.addObserver(observerPlaylistName,"playlistname",false)
    if(!nsMPM.mpd._socket) nsMPM.mpd.connect()
    window.name = "chrome://minion/content/minion.xul"
    var browse = document.getElementById('browse')
    browse.handle_select = browse_select
	var s = decodeURI(window.location.search)
	nsMPM.debug(s)
	if (s.length != 0) {
		s = s.split("=")
		switch (s[0]) {
			case "?url": nsMPM.mpd.handleURL(s[1]); break;
			case "?play_url":  nsMPM.mpd.handleURL(s[1], "play"); break;
			case "?cmd": 
				var q = new nsMPM.dbQuery((s[1]));
				q.execute();
				break;
		}
	}
    postinittimer.initWithCallback(postinit,100,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    document.getElementById("playlistName").value = nsMPM.mpd.playlistname
}

var postinit = { notify: function(postinittimer) {
	var q = Application.storage.get("doQuery", null)
	var d = Application.storage.get("doDetails", null)
    nsMPM.debug("post_init()");
	nsMPM.debug(q)
	nsMPM.debug(d)
    if (q) {
        document.getElementById("browse").goTo(q)
		Application.storage.set("doQuery", null)
    }
    if (d) {
        document.getElementById("browse").showDetails(d)
		Application.storage.set("doDetails", null)
    }
}}

function unload () {
	try {
		document.getElementById("browse").saveColumns();
		document.getElementById("playlist").saveColumns();
		// FIXME: not working document.getElementById("browser_playlist").saveColumns()
		nsMPM.observerService.removeObserver(observerPlaylists,"playlists");
		nsMPM.observerService.removeObserver(observerPlaylistName,"playlistname");
	} catch(e){ /* we may have an exception when the browser is closed but another window remains */ }
}

function mpdExecute () {
    var q = new nsMPM.dbQuery()
    q.cmd = prompt(nsMPM.translateService.GetStringFromName('enter_mpd_cmd'))
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
    } catch (e) {nsMPM.debug(e)}
}

function loadCurrentAlbum() {
    var q = new nsMPM.dbQuery()
    q.type = "file"
    q.scope = "Album"
    q.query = nsMPM.mpd.Album
    q.filterField = "Artist"
    q.filterQuery = nsMPM.mpd.Artist
    document.getElementById("browse").goTo(q, nsMPM.mpd.currentsong)
}

function viewCurrentSong() {
    document.getElementById("browse").showDetails(nsMPM.mpd.currentsong)
}
function refreshPlaylists () {
    var list = document.getElementById("savedPlaylists")
    var q = new nsMPM.dbQuery()
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
        return
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
    nsMPM.mpd.doCmd(c)
    document.getElementById("savedPlaylists").collapsed = true
    document.getElementById("playlist_splitter").collapsed = true
}

function savePlaylist () {
    var name = document.getElementById("playlistName").value
    if (name == "") return
    nsMPM.mpd.doCmd('save "' + name.replace(/"/g, '\\"') + '"')

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

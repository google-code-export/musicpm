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

function init () {
    document.getElementById("main").className = (prefs.get("use_theme", true)) ? "mpm_themed" : ""
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
            }
        }
    };
    prefObserver.register();
    observerService.addObserver(observerPlaylists,"playlists",false)
    observerService.addObserver(observerPlaylistName,"load_playlist",false)
    if(!mpd._socket) mpd.connect()
    if (Nz(window.doQuery)) {
        document.getElementById("browse").goTo(window.doQuery)
    }
    window.name = "chrome://minion/content/minion.xul"
}

function unload () {
    observerService.removeObserver(observerPlaylists,"playlists")
    observerService.removeObserver(observerPlaylistName,"load_playlist")
}

function mpdExecute () {
    var q = new dbQuery()
    q.cmd = prompt('Enter MPD Command:')
    q.query = q.cmd
    document.getElementById("browse").goTo(q)
}

function setFavicon (url) {
    var link = document.createElementNS("http://www.w3.org/1999/xhtml","link");
    link.id = "mpm_favicon"
    link.type = "image/x-icon";
    link.rel = "shortcut icon";
    link.href = url;
    var el = document.getElementById("mpm_favicon")
    var win = document.getElementById("main")
    win.removeChild(el)
    win.appendChild(link)
    el = null
}

function loadCurrentAlbum() {
    var q = new dbQuery()
    q.type = "file"
    q.scope = "Album"
    q.query = mpd.Album
    q.filterField = "Artist"
    q.filterQuery = mpd.Artist
    document.getElementById("browse").goTo(q)
}
function refreshPlaylists () {
    var list = document.getElementById("savedPlaylists")
    mpd.doCmd('lsinfo', function(data){
        try {
            data = data.replace(/(directory:.+\n|file:.+\n)|(playlist: )/g, "").split("\n")
            var db = []
            for (x in data) {
                if (data[x].length > 0) {
                    db.push({
                        type: 'playlist',
                        Title: data[x],
                        name: data[x]
                    })
                }
            }
            list.view = new arrayView(db)
        }
        catch (e) {
            debug(e)
        }
    }, false)
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

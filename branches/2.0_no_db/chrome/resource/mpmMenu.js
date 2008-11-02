Components.utils.import("resource://minion/mpmUtils.js");
Components.utils.import("resource://minion/io.js");
Components.utils.import("resource://minion/mpd.js");

EXPORTED_SYMBOLS = ["mpmMenu", "mpmMenuItem"]

function loadDefaults () {
	mpmMenu.items = [
        {
            id : "mpm_menu_launch",
            label : "Launch in New Window",
            locations : "statusbar",
            targets : null,
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : 'var w=window.open("chrome://minion/content/minion.xul","chrome://minion/content/minion.xul","chrome");w.focus()'
        }, {
            id : "mpm_menu_toggle_cs",
            label : "Toggle Current Song Display",
            locations : "statusbar",
            targets : null,
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : "prefs.set (\n    'sb_currentsong_hide',\n    !prefs.get('sb_currentsong_hide')\n);"
        }, {
            id : "mpm_menu_add",
            label : "Add to Playlist",
            locations : "mpdbrowser",
            targets : "file directory Artist Album Date Genre Performer Composer",
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : "mpdbrowser.addSelected()"
        }, {
            id : "mpm_menu_replace",
            label : "Replace Playlist",
            locations : "mpdbrowser",
            targets : "file directory Artist Album Date Genre Performer Composer",
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : "clear",
            script : "mpdbrowser.addSelected()"
        }, {
            id : "mpm_menu_viewDetails",
            label : "View Song Details",
            locations : null,
            targets : "file",
            URL : null,
            queryType : null,
            queryScope : null,
	    filterField: null,
            mpdCommand : null,
            script : "mpdbrowser.showDetails(item)"
        }, {
            id : "mpm_menu_setFileAction",
            label : "Set Default Action",
            locations : "mpdbrowser",
            targets : "file",
            URL : null,
            queryType : null,
            queryScope : null,
	    filterField: null,
            mpdCommand : null,
            script : "mpm_openDialog('chrome://minion/content/fileActions.xul', 'mpm_file_actions')"
        }, {
            id : "mpm_menu_update",
            label : "Update this Folder",
            locations : null,
            targets : "directory",
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : "mpdbrowser.doUpdate()"
        }, "separator", {
            id : "mpm_menu_loadPlaylist",
            label : "Load Playlist",
            locations : "mpdbrowser",
            targets : "playlist",
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : "clear; load {Title}",
            script : null
        }, {
            id : "mpm_custom_playlistAppend",
            label : "Append Playlist",
            locations : "mpdbrowser",
            targets : "playlist",
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : "load {Title}",
            script : null
        }, {
            id : "mpm_menu_rmPlaylist",
            label : "Delete Playlist",
            locations : "mpdbrowser",
            targets : "playlist",
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : "rm {Title}",
            script : null
        }, {
            id : "mpm_menu_renPlaylist",
            label : "Rename Playlist",
            locations : "mpdbrowser",
            targets : "playlist",
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : "var name = prompt(\"Please enter a new name:\", item.Title);\nif (name) mpd.doCmd(\"rename \"+Sz(item.Title)+\" \"+Sz(name))"
        }, "separator", {
            id : "mpm_menu_playlistRemove",
            label : "Remove from Playlist",
            locations : "mpdplaylist",
            targets : "file",
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : "mpdplaylist.delete()"
        }, {
            id : "mpm_menu_playlistmvFirst",
            label : "Move To Begining of Playlist",
            locations : "mpdplaylist",
            targets : "file",
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : "mpdplaylist.moveFirst()"
        }, {
            id : "mpm_menu_playlistmvNext",
            label : "Move to Next in Queue",
            locations : "mpdplaylist",
            targets : "file",
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : "mpdplaylist.moveNext()"
        }, {
            id : "mpm_menu_playlistmvLast",
            label : "Move To End of Playlist",
            locations : "mpdplaylist",
            targets : "file",
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : "mpdplaylist.moveLast()"
        }, {
            id : "mpm_menu_addURL",
            label : "Add URL to Playlist",
            locations : "mpdplaylist",
            targets : null,
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : 'var val = prompt("Please enter a URL to add to the playlist.", "http://")\n'+
			    'if (val != null) {\n'+
			    '    var v = new RegExp();\n'+
			    '    v.compile(/(ftp|http|https):\\/\\/(\\w+:{0,1}\\w*@)?(\\S+)(:[0-9]+)?(\\/|\\/([\\w#!:.?+=&%@!\\-\\/]))?/);\n'+
			    '    if (v.test(val)) {\n'+
			    '        mpd.handleURL(val)\n'+
			    '    }\n'+
			    '    else alert("`"+val+"` is not a valid URL.")\n}'
        }, "separator", {
            id : "mpm_menu_google",
            label : "Google It!",
            locations : null,
            targets : "file Artist Album",
            URL : "http://www.google.com/search?q={Artist}+{Title}",
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : null
        }, {
            id : "mpm_menu_viewAlbum",
            label : "View this Album",
            locations : null,
            targets : "file",
            URL : null,
            queryType : "file",
            queryScope : "Album",
            filterField: null,
            mpdCommand : null,
            script : null
        }, {
            id : "mpm_menu_viewArtistAlbum",
            label : "View Albums by this Artist",
            locations : null,
            targets : "file Artist",
            URL : null,
            queryType : "Album",
            queryScope : "Artist",
            filterField: null,
            mpdCommand : null,
            script : null
        }
    ]
}

function loadMenuItems () {
    var file = DirIO.get("Home")
    file.append(".mpm_menus.js")
    if (file.exists()) {
        var str = FileIO.read(file)
        mpmMenu.items = eval(str)
        
        // Handles conversion for < 1.99.4 alpha clients
        var needsUpdate = false
        for (var i=0;i<mpmMenu.items.length;i++) {
            var item = mpmMenu.items[i]
            if (typeof(item.filterField == 'undefined')) {
                item.filterField = null
                if (item.id == "mpm_menu_viewAlbum") item.filterField = 'Artist'
                needsUpdate = true
            }
        }
        if (needsUpdate) {
            var str = mpmMenu.items.toSource()
            FileIO.write(file, str)            
        }
    }
    else {
        debug("Creating default menus.")
        loadDefaults()
        FileIO.create(file)
        var str = mpmMenu.items.toSource()
        FileIO.write(file, str)
    }
    file = null
}

/* "locations" and "targets":
 * Determines when menuitem is shown.  
 * "locations" matches tag names:
 *      mpdbrowser, mpdplaylist, currentsong, etc.
 * "targets" matches type of item clicked on:
 *      file, Artist, Album, playlist, etc.
 * Null values matches any.
 * 
 * "URL", "query*", "mpdCommand":
 * Place item and mpd values in {} to have them replaced
 * at runtime.  URL loads web pages, queries lookup in the
 * database and displays results, mpdCommand uses the MPD protocol.
 * Use ; to seperate multiple commands in mpdCommand.
 * i.e.: mpdCommand = "add {file};play {playlistlength}"
 * 
 * "script" will be evaluated at runtime.
 */
function mpmMenuItem (label, id) {
    this.id = Nz(id, "mpm_custom_menuItem")
    this.label = Nz(label, "New Menu Item")
    
    this.locations = null
    this.targets = null
    
    this.URL = null
    this.queryType = null
    this.queryScope = null
    this.filterField = null
    this.mpdCommand = null
    this.script = null
}

function saveMenuItems () {
    var file = DirIO.get("Home")
    file.append(".mpm_menus.js")
    if (!file.exists()) {
        FileIO.create(file)
    }
    var str = mpmMenu.items.toSource()
    FileIO.write(file, str)
    file = null
}

var mpmMenu = {
    items: [],
    load: loadMenuItems,
    restore: function () { loadDefaults(); saveMenuItems() },
    save: saveMenuItems
}

mpmMenu.load()

Components.utils.import("resource://minion/mpmUtils.js");
Components.utils.import("resource://minion/io.js");
Components.utils.import("resource://minion/JSON.js");

EXPORTED_SYMBOLS = ["mpmMenu", "mpmMenuItem"]

var pref_dir = "ProfD"; // http://mxr.mozilla.org/seamonkey/source/xpcom/io/nsAppDirectoryServiceDefs.h
var pref_file = "mpm_menus.js";

function loadDefaults () {
    mpmMenu.items = [
        {
            id : "mpm_menu_launch",
            label : translateService.GetStringFromName("launch_new_browser"),
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
            label : translateService.GetStringFromName("toggle_song_display"),
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
            label : translateService.GetStringFromName("add_to_playlist"),
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
            label : translateService.GetStringFromName("replace_playlist"),
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
            label : translateService.GetStringFromName("view_song_details"),
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
            label : translateService.GetStringFromName("set_default_action"),
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
            label : translateService.GetStringFromName("update_this_folder"),
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
            label : translateService.GetStringFromName("load_playlist"),
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
            label : translateService.GetStringFromName("append_playlist"),
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
            label : translateService.GetStringFromName("delete_playlist"),
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
            label : translateService.GetStringFromName("rename_playlist"),
            locations : "mpdbrowser",
            targets : "playlist",
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : "var name = prompt(\""+translateService.GetStringFromName("enter_new_name")+"\", item.Title);\nif (name) mpd.doCmd(\"rename \"+Sz(item.Title)+\" \"+Sz(name))"
        }, "separator", {
            id : "mpm_menu_playlistRemove",
            label : translateService.GetStringFromName("remove_from_playlist"),
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
            label : translateService.GetStringFromName("move_to_begining_playlist"),
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
            label : translateService.GetStringFromName("move_to_next_in_queue"),
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
            label : translateService.GetStringFromName("move_to_end_playlist"),
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
            label : translateService.GetStringFromName("add_url_to_playlist"),
            locations : "mpdplaylist",
            targets : null,
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : 'var val = prompt("'+translateService.GetStringFromName("enter_url")+'", "http://")\n'+
                'if (val != null) {\n'+
                '    var v = new RegExp();\n'+
                '    v.compile(/(ftp|http|https):\\/\\/(\\w+:{0,1}\\w*@)?(\\S+)(:[0-9]+)?(\\/|\\/([\\w#!:.?+=&%@!\\-\\/]))?/);\n'+
                '    if (v.test(val)) {\n'+
                '        mpd.handleURL(val)\n'+
                '    }\n'+
                '    else alert("`"+val+"` '+translateService.GetStringFromName("is_not_valid")+'")\n}'
        }, {
            id : "mpm_menu_ClearPlaylist",
            label : translateService.GetStringFromName("clear_playlist"),
            locations : "mpdplaylist",
            targets : null,
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : "clear",
            script : null
        }, {
            id : "mpm_menu_SavePlaylist",
            label : translateService.GetStringFromName("save_playlist_as"),
            locations : "mpdplaylist",
            targets : null,
            URL : null,
            queryType : null,
            queryScope : null,
            filterField: null,
            mpdCommand : null,
            script : "var name = prompt('"+translateService.GetStringFromName("enter_playlist_name")+"');\n"+
                "mpd.doCmd('save \"' + name.replace(/\"/g, '\\\"') + '\"')"
        }, "separator", {
            id : "mpm_menu_google",
            label : translateService.GetStringFromName("google_it"),
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
            label : translateService.GetStringFromName("view_this_album"),
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
            label : translateService.GetStringFromName("view_albums_by_artist"),
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
	var file = DirIO.get(pref_dir);
	file.append(pref_file);
	if (file.exists()) {
		debug("Read menus from "+file.path);
		var str = FileIO.read(file);
		mpmMenu.items = JSON.parse(str);
	} else {
		debug("Creating default menus.")
		loadDefaults();
		saveMenuItems();
	}
	file = null;
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
    this.label = Nz(label, translateService.GetStringFromName("new_menu_item"))
    
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
	var file = DirIO.get(pref_dir);
	file.append(pref_file);
	debug("Saving menus to :"+file.path);
	if (!file.exists()) {
		FileIO.create(file);
	}
	var str = JSON.stringify(mpmMenu.items);
	FileIO.write(file, str);
	file = null;
}

var mpmMenu = {
    items: [],
    load: loadMenuItems,
    restore: function () { loadDefaults(); saveMenuItems() },
    save: saveMenuItems
}

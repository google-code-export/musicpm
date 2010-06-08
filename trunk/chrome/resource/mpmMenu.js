Components.utils.import("resource://minion/mpmUtils.js");

let EXPORTED_SYMBOLS = ["mpmMenu"]

var mpmMenu = {
	items: [],
	_loadDefaults : function () {
		this.items = [
			{
				id : "mpm_menu_toggle_cs",
				label : nsMPM.translateService.GetStringFromName("toggle_song_display"),
				locations : "statusbar",
				targets : null,
				URL : null,
				queryType : null,
				queryScope : null,
				filterField: null,
				mpdCommand : null,
				script : "nsMPM.prefs.set (\n    'sb_currentsong_hide',\n    !nsMPM.prefs.get('sb_currentsong_hide')\n);"
			}, {
				id : "mpm_menu_add",
				label : nsMPM.translateService.GetStringFromName("add_to_playlist"),
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
				label : nsMPM.translateService.GetStringFromName("replace_playlist"),
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
				label : nsMPM.translateService.GetStringFromName("view_song_details"),
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
				label : nsMPM.translateService.GetStringFromName("set_default_action"),
				locations : "mpdbrowser",
				targets : "file",
				URL : null,
				queryType : null,
				queryScope : null,
				filterField: null,
				mpdCommand : null,
				script : "nsMPM.mpm_openDialog('chrome://minion/content/fileActions.xul', 'mpm_file_actions')"
			}, {
				id : "mpm_menu_update",
				label : nsMPM.translateService.GetStringFromName("update_this_folder"),
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
				label : nsMPM.translateService.GetStringFromName("load_playlist"),
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
				label : nsMPM.translateService.GetStringFromName("append_playlist"),
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
				label : nsMPM.translateService.GetStringFromName("delete_playlist"),
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
				label : nsMPM.translateService.GetStringFromName("rename_playlist"),
				locations : "mpdbrowser",
				targets : "playlist",
				URL : null,
				queryType : null,
				queryScope : null,
				filterField: null,
				mpdCommand : null,
				script : "var name = prompt(\""+nsMPM.translateService.GetStringFromName("enter_new_name")+"\", item.Title);\nif (name) nsMPM.mpd.doCmd(\"rename \"+nsMPM.Sz(item.Title)+\" \"+nsMPM.Sz(name))"
			}, "separator", {
				id : "mpm_menu_playlistRemove",
				label : nsMPM.translateService.GetStringFromName("remove_from_playlist"),
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
				label : nsMPM.translateService.GetStringFromName("move_to_begining_playlist"),
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
				label : nsMPM.translateService.GetStringFromName("move_to_next_in_queue"),
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
				label : nsMPM.translateService.GetStringFromName("move_to_end_playlist"),
				locations : "mpdplaylist",
				targets : "file",
				URL : null,
				queryType : null,
				queryScope : null,
				filterField: null,
				mpdCommand : null,
				script : "mpdplaylist.moveLast()"
			}, {
				id : "mpm_menu_ClearPlaylist",
				label : nsMPM.translateService.GetStringFromName("clear_playlist"),
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
				label : nsMPM.translateService.GetStringFromName("save_playlist_as"),
				locations : "mpdplaylist",
				targets : null,
				URL : null,
				queryType : null,
				queryScope : null,
				filterField: null,
				mpdCommand : null,
				script : "var name = prompt('"+nsMPM.translateService.GetStringFromName("enter_playlist_name")+"');\n"+
					"nsMPM.mpd.doCmd('save \"' + name.replace(/\"/g, '\\\"') + '\"')"
			}, "separator", {
				id : "mpm_menu_google",
				label : nsMPM.translateService.GetStringFromName("google_it"),
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
				label : nsMPM.translateService.GetStringFromName("view_this_album"),
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
				label : nsMPM.translateService.GetStringFromName("view_albums_by_artist"),
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
	},
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
	mpmMenuItem : function (label, id) {
		var newItem = {};
		
		newItem.id = nsMPM.Nz(id, "mpm_custom_menuItem")
		newItem.label = nsMPM.Nz(label, nsMPM.translateService.GetStringFromName("new_menu_item"))
		
		newItem.locations = null
		newItem.targets = null
		
		newItem.URL = null
		newItem.queryType = null
		newItem.queryScope = null
		newItem.filterField = null
		newItem.mpdCommand = null
		newItem.script = null
		return newItem;
	},
	_loadMenuItems : function () {
		try {
			let that = this;
			var file = nsMPM.DirIO.get(nsMPM.pref_dir);
			file.append(nsMPM.pref_file_menus);
			if (file.exists()) {
				nsMPM.debug("Read menus from "+file.path);
				var str = nsMPM.FileIO.read(file);
				that.items = nsMPM.JSON.parse(str);
			} else {
				nsMPM.debug("Creating default menus.")
				_loadDefaults();
				_saveMenuItems();
			}
			file = null;
		} catch(e){dump(e+"\n"); dump(this+"\n")}
	},
	_saveMenuItems : function() {
		let that = this;
		var file = nsMPM.DirIO.get(nsMPM.pref_dir);
		file.append(nsMPM.pref_file_menus);
		nsMPM.debug("Saving menus to :"+file.path);
		if (!file.exists()) {
			nsMPM.FileIO.create(file);
		}
		var str = nsMPM.JSON.stringify(that.items);
		nsMPM.FileIO.write(file, str);
		file = null;
	},
	
	load: function() { this._loadMenuItems(); },
	restore: function () { this._loadDefaults(); this._saveMenuItems() },
	save: function() { this._saveMenuItems(); }
}





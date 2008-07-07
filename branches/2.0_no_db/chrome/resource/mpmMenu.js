Components.utils.import("resource://minion/mpmUtils.js");
Components.utils.import("resource://minion/io.js");
Components.utils.import("resource://minion/mpd.js");

EXPORTED_SYMBOLS = ["mpmMenu", "mpmMenuItem"]

function loadDefaults () {
	mpmMenu.items = [
	    {
	        id:"mpm_menu_playNow",
	        label:"Play Now",
	        locations:"mpdbrowser",
	        targets:"file",
	        URL:null,
	        queryType:null,
	        queryScope:null,
	        mpdCommand:"add {file};play {playlistlength}",
	        script:null
	    },
	    {
	        id:"mpm_menu_add",
	        label:"Add to Playlist",
	        locations:"mpdbrowser",
	        targets:"file directory",
	        URL:null,
	        queryType:null,
	        queryScope:null,
	        mpdCommand:"add {name}",
	        script:null
	    },
	    {
	        id:"mpm_menu_replace",
	        label:"Replace Playlist",
	        locations:"mpdbrowser",
	        targets:"file directory",
	        URL:null,
	        queryType:null,
	        queryScope:null,
	        mpdCommand:"clear;add {name}",
	        script:null
	    },
	    "separator",
	    {
	        id:"mpm_menu_loadPlaylist",
	        label:"Load Playlist",
	        locations:"mpdbrowser",
	        targets:"playlist",
	        URL:null,
	        queryType:null,
	        queryScope:null,
	        mpdCommand:"clear;load {Title}",
	        script:null
	    },
	    {
	        id:"mpm_menu_rmPlaylist",
	        label:"Delete Playlist",
	        locations:"mpdbrowser",
	        targets:"playlist",
	        URL:null,
	        queryType:null,
	        queryScope:null,
	        mpdCommand:"rm {Title}",
	        script:null
	    },
	    {
	        id:"mpm_menu_renPlaylist",
	        label:"Rename Playlist",
	        locations:"mpdbrowser",
	        targets:"playlist",
	        URL:null,
	        queryType:null,
	        queryScope:null,
	        mpdCommand:null,
	        script:'var name = prompt("Please enter a new name:", item.Title)\n'+
	            'if (name) mpd.doCmd("rename "+Sz(item.Title)+" "+Sz(name))'
	    },
	    "separator",
	    {
	        id:"mpm_menu_google",
	        label:"Google It!",
	        locations:null,
	        targets:"file Artist Album",
	        URL:"http://www.google.com/search?q={Artist}+{Title}",
	        queryType:null,
	        queryScope:null,
	        mpdCommand:null,
	        script:null
	    },
	    {
	        id:"mpm_menu_artistalbum",
	        label:"Albums by this artist",
	        locations:null,
	        targets:"file Artist",
	        URL:null,
	        queryType:"Album",
	        queryScope:"Artist",
	        mpdCommand:null,
	        script:null
	    }
	]
}

function loadMenuItems () {
    var file = DirIO.get("Home")
    file.append(".mpm_menus.txt")
    if (file.exists()) {
        var str = FileIO.read(file)
        mpmMenu.items = eval(str)
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
    this.mpdCommand = null
    this.script = null
}

function saveMenuItems () {
    var file = DirIO.get("Home")
    file.append(".mpm_menus.txt")
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
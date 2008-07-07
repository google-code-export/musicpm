Components.utils.import("resource://minion/mpmUtils.js");
Components.utils.import("resource://minion/io.js");
Components.utils.import("resource://minion/mpd.js");
var mpmMenuItems = []

EXPORTED_SYMBOLS = ["mpmMenu"]

/* "locations" and "targets":
 * Determines when menuitem is shown.  
 * "locations" matches tag names:
 *      mpdbrowser, mpdplaylist, currentsong, etc.
 * "targets" matches type of item clicked on:
 *      file, Artist, Album, playlist, etc.
 * Null values matches any.
 * 
 * "URL", "query*", "mpdCommand":
 * Command actions, the first non null action type is used.
 * Place item and mpd values in {} to have them replaced
 * at runtime.  URL loads web pages, queries lookup in the
 * database and displays results, mpdCommand just sends command(s).
 * Use ; to seperate multiple commands.
 * i.e.: mpdCommand = "add {file};play {playlistlength}"
 * 
 * Use doCommand = function (item, location, event) {} to override
 * the default onclick handler.
 */
function mpmMenuItem (label, id) {
    this.id = Nz(id, "mpm_custom_menuItem")
    this.label = Nz(label, "New Menu Item")
    
    this.locations = null
    this.targets = null
    
    this.URL = null
    this.queryCommand = null
    this.queryType = null
    this.queryScope = null
    this.mpdCommand = null
    
    this.doCommand = null
}

function isValid (self, item, location) {
    var type = (Nz(item)) ? Nz(item.type, "undefined") : "undefined"
    var location = Nz(location, "undefined")
    var l=(self.locations)?(self.locations.split(" ").indexOf(location) > -1):true
    var t=(self.targets)?(self.targets.split(" ").indexOf(type) > -1):true
    return (t && l)
}

function handleMenuCommand (self, item, location) {
    if (self.URL) {
        var s = self.URL
        for (x in item) {
            s = s.replace("{"+x+"}", encodeURI(item[x]))
        }
        s = s.replace(/{[^}]+}/g,"")
        openReuseByAttribute(s,"mpm_web_query")
    } 
    else if (self.queryType) {
        var q = new dbQuery
        q.cmd = self.queryCommand 
        q.type = self.queryType
        q.scope = self.queryScope
        var criteria = (self.queryScope) ? self.queryScope : self.queryType
        q.query = Nz(item[criteria], item.Title)
        document.getElementsByTagName("mpdbrowser")[0].goTo(q)
    }
    else if (self.mpdCommand) {
        var s = self.mpdCommand
        for (x in item) {
            s = s.replace("{"+x+"}", Sz(item[x]))
        }
        for (x in mpd) {
            s = s.replace("{"+x+"}", mpd[x])
        }
        s = s.replace(/{[^}]+}/g,"")
        var q = new dbQuery(s)
        q.execute()
    }
}

function createMenuNode(menupopup, menuItem, activeItem, location) {
    var NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
    var e = document.createElementNS(NS, "menuitem")
    if (Nz(menuItem.doCommand)) {
	    e.onclick = function (event) {
	        menuItem.doCommand(activeItem, location, event)
	    }
    }
    else {
        e.onclick = function (event) {
            handleMenuCommand(menuItem, activeItem, location)
        }
    }
    for (x in menuItem){
        e.setAttribute(x, menuItem[x])
    }
    if (e.parent) {
        var p = document.getElementById(e.parent)
    }
    else {
        var p = menupopup
    }
    p.appendChild(e)
    return e
}

function mpmMenu_contextShowing (event, location, activeItem) {
    var NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
    var menu = document.getElementById("mpmMenu")
    var elem = event.target
    var activeItem = Nz(activeItem) ? activeItem : Nz(elem.getActiveItem())
    var location = Nz(location) ? location : Nz(elem.tagName)
    while (menu.hasChildNodes()) { menu.removeChild(menu.firstChild) }
    
    var readySep = false
    for (var i=0;i<mpmMenuItems.length;i++) {
        if (mpmMenuItems[i] == "separator") {
            if (readySep) {
			    var e = document.createElementNS(NS, "menuseparator")
	            menu.appendChild(e)
	            readySep = false
            }
        }
        else if (isValid(mpmMenuItems[i], activeItem, location)) {
            var e = createMenuNode(menu, mpmMenuItems[i], activeItem, location)
            readySep = true
        }
    }
    if (menu.lastChild.tagName == "menuseparator") menu.removeChild(menu.lastChild)
}

function saveMenuItems () {
    var file = DirIO.get("Home")
    file.append(".mpm_menus.txt")
    if (!file.exists()) {
        FileIO.create(file)
    }
    var str = mpmMenuItems.toSource()
    FileIO.write(file, str)
    file = null
}

function loadMenuItems () {
	var file = DirIO.get("Home")
	file.append(".mpm_menus.txt")
	if (file.exists()) {
	    var str = FileIO.read(file)
	    mpmMenuItems = eval(str)
	}
	else {
	    debug("Creating default menus.")
	    FileIO.create(file)
	    var str = mpmMenuItems.toSource()
	    FileIO.write(file, str)
	}
	file = null
}

mpmMenuItems = [
    {
        id:"mpm_menu_playNow",
        label:"Play Now",
        locations:"mpdbrowser",
        targets:"file",
        URL:null,
        queryCommand:null,
        queryType:null,
        queryScope:null,
        mpdCommand:"add {file};play {playlistlength}",
        doCommand:null
    },
    {
        id:"mpm_menu_add",
        label:"Add to Playlist",
        locations:"mpdbrowser",
        targets:"file directory",
        URL:null,
        queryCommand:null,
        queryType:null,
        queryScope:null,
        mpdCommand:"add {name}",
        doCommand:null
    },
    {
        id:"mpm_menu_replace",
        label:"Replace Playlist",
        locations:"mpdbrowser",
        targets:"file directory",
        URL:null,
        queryCommand:null,
        queryType:null,
        queryScope:null,
        mpdCommand:"clear;add {name}",
        doCommand:null
    },
    "separator",
    {
        id:"mpm_menu_loadPlaylist",
        label:"Load Playlist",
        locations:"mpdbrowser",
        targets:"playlist",
        URL:null,
        queryCommand:null,
        queryType:null,
        queryScope:null,
        mpdCommand:"clear;load {Title}",
        doCommand:null
    },
    {
        id:"mpm_menu_rmPlaylist",
        label:"Delete Playlist",
        locations:"mpdbrowser",
        targets:"playlist",
        URL:null,
        queryCommand:null,
        queryType:null,
        queryScope:null,
        mpdCommand:"rm {Title}",
        doCommand:null
    },
    {
        id:"mpm_menu_renPlaylist",
        label:"Rename Playlist",
        locations:"mpdbrowser",
        targets:"playlist",
        URL:null,
        queryCommand:null,
        queryType:null,
        queryScope:null,
        mpdCommand:null,
        doCommand:function(item, location, event){
            var name = prompt("Please enter a new name:", item.Title)
            if (name) mpd.doCmd("rename "+Sz(item.Title)+" "+Sz(name))
        }
    },
    "separator",
    {
        id:"mpm_menu_google",
        label:"Google It!",
        locations:null,
        targets:"file Artist Album",
        URL:"http://www.google.com/search?q={Artist}+{Title}",
        queryCommand:null,
        queryType:null,
        queryScope:null,
        mpdCommand:null,
        doCommand:null
    },
    {
        id:"mpm_menu_artistalbum",
        label:"Albums by this artist",
        locations:null,
        targets:"file Artist",
        URL:null,
        queryCommand:null,
        queryType:"Album",
        queryScope:"Artist",
        mpdCommand:null,
        doCommand:null
    }
]

loadMenuItems()

var mpmMenu = {
    createItem: mpmMenuItem,
    items: mpmMenuItems,
    load: loadMenuItems,
    save: saveMenuItems
}
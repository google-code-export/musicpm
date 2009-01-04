Components.utils.import("resource://minion/mpmUtils.js");
Components.utils.import("resource://minion/io.js");
Components.utils.import("resource://minion/mpd.js");
Components.utils.import("resource://minion/mpmMenu.js");

function isValid(self, item, location) {
    var type = (Nz(item)) ? Nz(item.type, "undefined") : "undefined"
    var location = Nz(location, "undefined")
    var l = (self.locations)
            ? (self.locations.split(" ").indexOf(location) > -1)
            : true
    var t = (self.targets)
            ? (self.targets.split(" ").indexOf(type) > -1)
            : true
    return (t && l)
}

function ensureQuery(q) {
    debug("ensureQuery")
    var mpdbrowser = Nz(document.getElementsByTagName("mpdbrowser")[0])
    if (mpdbrowser) {
        mpdbrowser.goTo(q)
    } else {
        try {
            var url = "chrome://minion/content/minion.xul"
            var win = openReuseByURL(url)
            var doc = Nz(win.document)
            if (doc) {
                var mpdbrowser = doc.getElementsByTagName("mpdbrowser")
                if (Nz(mpdbrowser[0])) {
                    mpdbrowser[0].goTo(q)
                } else {
                    win.doQuery = q
                }
            }
        } catch (e) {
            debug(e)
        }
    }
}

function bash_escape (v) {
    if (typeof(v)=='string') {
        var str = v
        var esc = "`~!@#$%^&*()+={}[];:'<>?,|\" "
        esc = esc.split("")
        debug(esc)
        for each (c in esc) {
            var re = new RegExp("\\"+c, "g")
            str = str.replace(re, "\\" + c)
        }
        return str
    } else return v
}

function run (cmd, args) {
    try {
        var f = FileIO.open(cmd)
        var process = Components.classes["@mozilla.org/process/util;1"]
                                .createInstance(Components.interfaces.nsIProcess);
        process.init(f)
        var arrayArgs = Nz(args, [])
        process.run(false, arrayArgs, arrayArgs.length)
    } catch (e) {alert(e.message)}
}

function handleMenuCommand(self, item, location) {
    if (self.URL) {
        var s = self.URL
        for (x in item) {
            s = s.replace("{" + x + "}", encodeURI(item[x]))
        }
        s = s.replace(/{[^}]+}/g, "")
        openReuseByAttribute(s, "mpm_web_query")
    }
    if (self.queryType) {
        var q = new dbQuery
        q.cmd = self.queryCommand
        q.type = self.queryType
        q.scope = self.queryScope
        var criteria = (self.queryScope) ? Nz(item[self.queryScope]) : ""
        if (!criteria && item.type == self.queryScope)
            criteria = item.Title
        q.query = criteria
        if (self.filterField) {
            q.filterField = self.filterField
            q.filterQuery = item[self.filterField]
        }
        ensureQuery(q)
    }
    if (self.mpdCommand) {
        var s = self.mpdCommand
        for (x in item) {
            s = s.replace("{" + x + "}", Sz(item[x]))
        }
        for (x in mpd) {
            s = s.replace("{" + x + "}", mpd[x])
        }
        s = s.replace(/{[^}]+}/g, "")
        var q = new dbQuery(s)
        q.evaluate()
        if (!q.dbMatches) {
            q.execute()
        } else {
            ensureQuery(q)
        }
    }
    if (self.script) {
        var fakebrowser = {
            doUpdate : function() {
                mpd.doCmd("update")
            },
            goTo : ensureQuery,
            getActiveItem : function() {
                return item
            }
        }
                
        var focused = Nz(document.commandDispatcher.focusedElement.parentNode)
        var mpdbrowser = Nz(document.getElementsByTagName("mpdbrowser")[0])
        var mpdplaylist = Nz(document.getElementsByTagName("mpdplaylist")[0])
        if (mpdbrowser) {
            if (mpdbrowser.getActiveLocation() == "mpdplaylist") {
                var bplaylist = mpdbrowser.getActiveBrowser()
                if (bplaylist == focused) mpdplaylist = bplaylist
            }
        } else {
            mpdbrowser = fakebrowser
        }

        try {
            eval(self.script)
        } catch (e) {
            debug(e)
        }
    }
}

function createMenuNode(menupopup, menuItem, activeItem, location, nodeType) {
    var NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
    var e = document.createElementNS(NS, nodeType)
    if (Nz(menuItem.doCommand)) {
        e.onclick = function(event) {
            menuItem.doCommand(activeItem, location, event)
        }
    } else {
        e.onclick = function(event) {
            handleMenuCommand(menuItem, activeItem, location)
        }
    }
    for (x in menuItem) {
        e.setAttribute(x, menuItem[x])
    }
    if (e.parent) {
        var p = document.getElementById(e.parent)
    } else {
        var p = menupopup
    }
    p.appendChild(e)
    return e
}

function mpmMenu_contextShowing(event, location, activeItem, fillNode, nodeType) {
    try {
        var NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
        var menu = document.getElementById(Nz(fillNode, "mpmDynamicMenu"))
        debug(menu.id)
        location = Nz(location)
        activeItem = Nz(activeItem)
        nodeType = Nz(nodeType, "menuitem")
        if ((!location || !activeItem) && event) {
            var elem = event.target
            var activeItem = Nz(activeItem) ? activeItem : Nz(elem.getActiveItem())
            var location = Nz(location) ? location : Nz(elem.tagNameOverride, elem.tagName)
        }
        while (menu.hasChildNodes()) {
            menu.removeChild(menu.firstChild)
        }
        if (location && activeItem) {
            var readySep = false
            for (var i = 0; i < mpmMenu.items.length; i++) {
                if (mpmMenu.items[i] == "separator") {
                    if (readySep) {
                        var e = document.createElementNS(NS, "menuseparator")
                        menu.appendChild(e)
                        readySep = false
                    }
                } else if (isValid(mpmMenu.items[i], activeItem, location)) {
                    var e = createMenuNode(menu, mpmMenu.items[i], activeItem,
                            location, nodeType)
                    readySep = true
                }
            }
            if (menu.lastChild.tagName == "menuseparator")
                menu.removeChild(menu.lastChild)
        }
    } catch (e) {
        debug(e)
    }
}

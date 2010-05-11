Components.utils.import("resource://minion/mpmUtils.js");

function isValid(self, item, loc) {
    var type = (nsMPM.Nz(item)) ? nsMPM.Nz(item.type, "undefined") : "undefined"
    var location = nsMPM.Nz(loc, "undefined")
    var l = (self.locations)
            ? (self.locations.split(" ").indexOf(location) > -1)
            : true
    var t = (self.targets)
            ? (self.targets.split(" ").indexOf(type) > -1)
            : true
    return (t && l)
}

function ensureQuery(q) {
    nsMPM.debug("ensureQuery")
    var mpdbrowser = nsMPM.Nz(document.getElementsByTagName("mpdbrowser")[0])
    if (mpdbrowser) {
        mpdbrowser.goTo(q)
    } else {
        try {
            var url = "chrome://minion/content/minion.xul"
            var win = nsMPM.openReuseByURL(url)
            var doc = nsMPM.Nz(win.document)
            if (doc) {
                var mpdbrowser = doc.getElementsByTagName("mpdbrowser")
                if (nsMPM.Nz(mpdbrowser[0])) {
                    mpdbrowser[0].goTo(q)
                } else {
                    Application.storage.set("doQuery", q)
                }
            }
        } catch (e) {
            nsMPM.debug(e)
        }
    }
}

function ensureDetails(item) {
    nsMPM.debug("ensureDetails")
    var mpdbrowser = nsMPM.Nz(document.getElementsByTagName("mpdbrowser")[0])
    if (mpdbrowser) {
        mpdbrowser.showDetails(item)
    } else {
        try {
            var url = "chrome://minion/content/minion.xul"
            var win = nsMPM.openReuseByURL(url)
			if (win) {
				var doc = nsMPM.Nz(win.document)
				if (doc) {
					var mpdbrowser = doc.getElementsByTagName("mpdbrowser")
					if (nsMPM.Nz(mpdbrowser[0])) {
						mpdbrowser[0].showDetails(item)
					} else {
						Application.storage.set("doDetails", item)
					}
				}
			}
        } catch (e) {
            nsMPM.debug(e)
        }
    }
}

function handleMenuCommand(self, item, location) {
	if (self.URL) {
		var s = self.URL;
		for (x in item) {
			s = s.replace("{" + x + "}", encodeURI(item[x]));
		}
		s = s.replace(/{[^}]+}/g, "");
		nsMPM.openReuseByAttribute(s, "mpm_web_query");
	}
	if (self.queryType) {
		var q = new nsMPM.dbQuery();
		q.cmd = self.queryCommand;
		q.type = self.queryType;
		q.scope = self.queryScope;
		var criteria = (self.queryScope) ? nsMPM.Nz(item[self.queryScope]) : "";
		if (!criteria && item.type == self.queryScope) criteria = item.Title;
		q.query = criteria;
		if (self.filterField) {
			q.filterField = self.filterField;
			q.filterQuery = item[self.filterField];
		}
		ensureQuery(q);
	}
	if (self.mpdCommand) {
		var s = self.mpdCommand;
		for (x in item) {
			s = s.replace("{" + x + "}", nsMPM.Sz(item[x]));
		}
		for (x in nsMPM.mpd) {
			s = s.replace("{" + x + "}", nsMPM.mpd[x]);
		}
		s = s.replace(/{[^}]+}/g, "");
		var q = new nsMPM.dbQuery(s);
		q.evaluate();
		if (!q.dbMatches) {
			q.execute();
		} else {
			ensureQuery(q);
		}
	}
	if (self.script) {
		var fakebrowser = {
			doUpdate : function() {
				nsMPM.mpd.doCmd("update");
			},
			goTo : ensureQuery,
			getActiveItem : function() {
				return item;
			},
			showDetails : ensureDetails
		}

		var focused = null;
		if (document.commandDispatcher.focusedElement != null ) focused = nsMPM.Nz(document.commandDispatcher.focusedElement.parentNode);
		var mpdbrowser = nsMPM.Nz(document.getElementsByTagName("mpdbrowser")[0]);
		var mpdplaylist = nsMPM.Nz(document.getElementsByTagName("mpdplaylist")[0]);
		if (mpdbrowser) {
			if (mpdbrowser.getActiveLocation() == "mpdplaylist") {
				var bplaylist = mpdbrowser.getActiveBrowser();
				if (bplaylist == focused) mpdplaylist = bplaylist;
			}
		} else {
			mpdbrowser = fakebrowser;
		}

		try {
			// self.script is the script supplied by the user in the action config interface.
			// if the AMO reviewer thinks it's too unsafe, please point out a good ressource
			// to fix the problem.
			// these scripts are used to perform customizable actions at various places in the UI
			// They also allow the user to extended the extension by adding other commands.
			// The use of Sandbox has been suggested by Jorge, but feel free to indicate if the
			// implementation has been done properly
			var sbox = Components.utils.Sandbox('chrome://minion/content/minion.xul');
			sbox.nsMPM = nsMPM;
			sbox.mpdbrowser = mpdbrowser;
			sbox.mpdplaylist = mpdplaylist;
			// sbox.mpd = mpd;
			sbox.item = item;
			Components.utils.evalInSandbox(self.script, sbox); // As per comments above
		} catch (e) {
			nsMPM.debug("Error in Sandbox");
			nsMPM.debug(e);
		}
	}
}

function createMenuNode(menupopup, menuItem, activeItem, location, nodeType) {
    var NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
    var e = document.createElementNS(NS, nodeType)
    if (nsMPM.Nz(menuItem.doCommand)) {
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
        var menu = document.getElementById(nsMPM.Nz(fillNode, "mpmDynamicMenu"))
        location = nsMPM.Nz(location)
        activeItem = nsMPM.Nz(activeItem)
        nodeType = nsMPM.Nz(nodeType, "menuitem")
        if ((!location || !activeItem) && event) {
            var elem = event.target;
            activeItem = nsMPM.Nz(activeItem) ? activeItem : nsMPM.Nz(elem.getActiveItem())
            location = nsMPM.Nz(location) ? location : nsMPM.Nz(elem.tagNameOverride, elem.tagName)
        }
        while (menu.hasChildNodes()) {
            menu.removeChild(menu.firstChild)
        }
		nsMPM.debug("location="+location)
        if (location) {
            var readySep = false
            for (var i = 0; i < nsMPM.mpmMenu.items.length; i++) {
                if (nsMPM.mpmMenu.items[i] == "separator") {
                    if (readySep) {
                        var e = document.createElementNS(NS, "menuseparator")
                        menu.appendChild(e)
                        readySep = false
                    }
                } else if (isValid(nsMPM.mpmMenu.items[i], activeItem, location)) {
                    var e = createMenuNode(menu, nsMPM.mpmMenu.items[i], activeItem,
                            location, nodeType)
                    readySep = true
                }
            }
            if (menu.lastChild != null && menu.lastChild.tagName == "menuseparator")
                menu.removeChild(menu.lastChild)
        }
    } catch (e) {
        nsMPM.debug(e)
    }
}

nsMPM.mpmMenu.load();
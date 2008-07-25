/**
 * Music Player Minion Copyright 2008, Chris Seickel
 * 
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation; either version 2 of the License, or (at your option) any later
 * version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 */

EXPORTED_SYMBOLS = ["Nz", "debug", "hmsFromSec", "prettyTime", "copyArray",
		"observerService", "getFileContents", "fetch", "winw",
		"openReuseByURL", "openReuseByAttribute", "mpm_openDialog", "prefs",
		"mpmUtils_EXPORTED_SYMBOLS"]
var mpmUtils_EXPORTED_SYMBOLS = copyArray(EXPORTED_SYMBOLS)

var observerService = Components.classes["@mozilla.org/observer-service;1"]
		.getService(Components.interfaces.nsIObserverService);
var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
		.getService(Components.interfaces.nsIConsoleService);
var prefService = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService);
var branch = prefService.getBranch("extensions.mpm.");

var winw = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
		.getService(Components.interfaces.nsIWindowWatcher);

function debug(s) {
	// return null
	if (typeof(s) == 'object') {
		var str = ""
		for (x in s) {
			try {
				// str += (typeof(s[x]) == 'object') ? s[x].toSource() : x + ":
				// " + s[x]
				str += x + ": " + s[x] + "\n"
			} catch (e) {
				str += x + ": ERROR\n"
			}
		}
	} else {
		var str = s
	}
	dump(str + "\n\n")
	consoleService.logStringMessage(str)
}

function Nz(obj, def) {
	if (typeof(obj) == 'undefined') {
		return (typeof(def) == 'undefined') ? null : def
	}
	return obj
}

function getFileContents(aURL) {
	var ioService = Components.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService);
	var scriptableStream = Components.classes["@mozilla.org/scriptableinputstream;1"]
			.getService(Components.interfaces.nsIScriptableInputStream);

	var channel = ioService.newChannel(aURL, null, null);
	var input = channel.open();
	scriptableStream.init(input);
	var str = scriptableStream.read(input.available());
	scriptableStream.close();
	input.close();
	return str;
}

function hmsFromSec(sec) {
	var hms = "0:00"
	try {
		sec = parseInt(sec)
	} catch (err) {
		return "0:00"
	}
	if (sec > 0) {
		var h = 0
		if (sec >= 3600) {
			h = Math.floor(sec / 3600)
			sec = sec % 3600
		}
		var m = Math.floor(sec / 60)
		var s = sec % 60
		if (h > 0) {
			h = h + ":"
			if (m.toString().length == 1) {
				m = "0" + m
			}
		} else {
			h = ""
		}
		m = m + ":"
		if (s.toString().length == 1) {
			s = "0" + s
		}
		hms = h + m + s
	}
	return hms
}

function prettyTime(sec) {
	var tm = ""
	try {
		sec = parseInt(sec)
	} catch (err) {
		debug("prettyTime: " + err.description);
		sec = 0
	}
	if (sec > 0) {
		var d = Math.floor(sec / 86400)
		sec = sec % 86400
		var h = Math.floor(sec / 3600)
		sec = sec % 3600
		var m = Math.floor(sec / 60)
		var s = sec % 60

		if (d > 0) {
			tm = d + " day"
			if (d > 1) {
				tm += "s"
			}
			var hs = " hr"
			var ms = " min"
			var ss = " sec"
		} else {
			var hs = " hour"
			var ms = " minute"
			var ss = " second"
		}
		if (h > 0) {
			if (tm.length > 0) {
				tm += ", "
			}
			tm += h + hs
			if (h > 1) {
				tm += "s"
			}
		}
		if (m > 0) {
			if (tm.length > 0) {
				tm += ", "
			}
			tm += m + ms
			if (m > 1) {
				tm += "s"
			}
		}
		if (s > 0) {
			if (tm.length > 0) {
				tm += ", "
			}
			tm += s + ss
			if (s > 1) {
				tm += "s"
			}
		}
	}
	return tm
}

function copyArray(oldArray) {
	if (typeof(oldArray) == 'object') {
		var l = oldArray.length
		var n = l
		var newArray = []
		if (l > 0) {
			do {
				newArray.push(oldArray[l - n])
			} while (--n)
		}
		return newArray
	} else
		return oldArray
}

function fetch(url, callBack, arg) {
	try {
		var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
				.createInstance();
		request.QueryInterface(Components.interfaces.nsIDOMEventTarget);
		request.QueryInterface(Components.interfaces.nsIXMLHttpRequest);

		request.open("GET", url, true)
		request.onreadystatechange = function() {
			if (request.readyState == 4) {
				if (request.status == 200) {
					callBack(request.responseText, arg)
					request.onreadystatechange = null
					request = null
				} else {
					request.onreadystatechange = null
					request = null
				}
			}
		}
		request.send("")
	} catch (e) {
		debug(e)
	}
}

function mpm_openDialog(url, id) {
	var win = winw.openWindow(winw.activeWindow, url, Nz(id, url),
			"chrome,dialog=yes,resizable=yes", null);
}

function openReuseByURL(url) {
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
			.getService(Components.interfaces.nsIWindowMediator);
	var browserEnumerator = wm.getEnumerator("navigator:browser");

	// Check each browser instance for our URL
	var found = false;
	try {
		while (!found && browserEnumerator.hasMoreElements()) {
			var browser = browserEnumerator.getNext()
			var browserInstance = browser.getBrowser()

			// Check each tab of this browser instance
			var numTabs = browserInstance.tabContainer.childNodes.length;
			for (var index = 0; index < numTabs; index++) {
				var currentBrowser = browserInstance.getBrowserAtIndex(index);
				if (url == currentBrowser.currentURI.spec) {

					// The URL is already opened. Select this tab.
					browserInstance.selectedTab = browserInstance.tabContainer.childNodes[index];

					// Focus *this* browser
					browser.focus()
					browserInstance.focus();
					debug("in tab")
					var win = currentBrowser.contentWindow.wrappedJSObject
					found = true;
					break;
				}
			}
		}
		if (!found) {
			var recent = wm.getMostRecentWindow("navigator:browser")
			if (recent) {
				recent.focus()
				browserInstance = recent.getBrowser();
				browserInstance.selectedTab = browserInstance.addTab(url)
				browserInstance.focus();
				var currentBrowser = browserInstance
						.getBrowserForTab(browserInstance.selectedTab)
				var win = currentBrowser.contentWindow.wrappedJSObject
			} else {
				var win = winw.getWindowByName(url, null)
				if (!win)
					win = winw.openWindow(null, url, url, null, null)
				win.focus()
			}
		}
		return win

	} catch (e) {
		debug(e)
	}
}

function openReuseByAttribute(url, attrName) {
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
			.getService(Components.interfaces.nsIWindowMediator);
	attrName = Nz(attrName, 'mpm-unknown-tab')
	try {
		for (var found = false, index = 0, browserInstance = wm
				.getEnumerator('navigator:browser').getNext().getBrowser(); index < browserInstance.mTabContainer.childNodes.length
				&& !found; index++) {
			var currentTab = browserInstance.mTabContainer.childNodes[index];
			if (currentTab.hasAttribute(attrName)) {
				browserInstance.selectedTab = currentTab;
				browserInstance.focus();
				found = true;
			}
		}
		if (!found) {
			var browserEnumerator = wm.getEnumerator("navigator:browser");
			var browserInstance = browserEnumerator.getNext().getBrowser();
			var newTab = browserInstance.addTab(url);
			newTab.setAttribute(attrName, "xyz");
			browserInstance.selectedTab = newTab;
			browserInstance.focus();
		}
	} catch (e) {
		winw.openWindow(null, url, attrName, null, null)
	}
}

var prefs = {
	branch : branch,
	service : prefService,
	get : function(strPref, def) {
		switch (branch.getPrefType(strPref)) {
			case branch.PREF_STRING :
				return branch.getCharPref(strPref);
			case branch.PREF_INT :
				return branch.getIntPref(strPref);
			case branch.PREF_BOOL :
				return branch.getBoolPref(strPref);
			default :
				def = Nz(def)
				prefs.set(strPref, def);
				return def;
		}
	},

	set : function(strPref, val) {
		switch (branch.getPrefType(strPref)) {
			case branch.PREF_STRING :
				branch.setCharPref(strPref, val);
				break;
			case branch.PREF_INT :
				branch.setIntPref(strPref, val);
				break;
			case branch.PREF_BOOL :
				branch.setBoolPref(strPref, val);
				break;
			default :
				if (Nz(val)) {
					switch (typeof(val)) {
						case 'string' :
							branch.setCharPref(strPref, val);
							break;
						case 'number' :
							branch.setIntPref(strPref, val);
							break;
						case 'boolean' :
							branch.setBoolPref(strPref, val);
							break;
						default :
							branch.setCharPref(strPref, val.toSource());
							break;
					}
				}
		}
	}
}

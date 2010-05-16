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
var EXPORTED_SYMBOLS = ["nsMPM"];

Components.utils.import("resource://minion/mpmCommon.js");

nsMPM.observerService  = nsMPM.Cc["@mozilla.org/observer-service;1"]
						.getService(nsMPM.Ci.nsIObserverService);
nsMPM.consoleService   = nsMPM.Cc["@mozilla.org/consoleservice;1"]
						.getService(nsMPM.Ci.nsIConsoleService);
nsMPM.winw 			   = nsMPM.Cc["@mozilla.org/embedcomp/window-watcher;1"]
						.getService(nsMPM.Ci.nsIWindowWatcher);
nsMPM.slidetimer 	   = nsMPM.Cc["@mozilla.org/timer;1"]
						.createInstance(nsMPM.Ci.nsITimer);
nsMPM.translateService = nsMPM.Cc["@mozilla.org/intl/stringbundle;1"]
						.getService(nsMPM.Ci.nsIStringBundleService)
						.createBundle("chrome://minion/locale/strings.properties");


nsMPM.getStringTime = function() {
	var today = new Date();
	var strDate = "";
	var t = 0;
	
	t = today.getHours();
	if ( t.toString().length == 1 ) strDate += '0';
	strDate += t +':';
	
	t = today.getMinutes();
	if ( t.toString().length == 1 ) strDate += '0';
	strDate += t +':';

	t = today.getSeconds();
	if ( t.toString().length == 1 ) strDate += '0';
	strDate += t +'.';
	
	t = today.getMilliseconds();
	if ( t.toString().length == 1 ) strDate += '00';
	if ( t.toString().length == 2 ) strDate += '0';
	strDate += t;
	
	return strDate;
}

nsMPM.debug = function (s) {
	let that = this;
	
	if ( typeof(that) == 'undefined' ) dump("that doesn't exists\n");
	if ( typeof(that.prefs) == 'undefined' ) dump("that.prefs doesn't exists\n");
	
	if ( that.prefs.get("debug", false) != true ) return;	
	try {
		var strDate = that.getStringTime();
		var f = 0;
		var str = "";
		if (s == null) s = "null passed to debug";
		if (typeof(s) == 'object') {
			for (x in s) {
				try {
					if ( f != 0 ) str += "\n             ";
					str += x + ': ' + s[x];
				} catch (e) {
					if ( f != 0 ) str += "\n             ";
					str += x + ': ERROR';
				}
				f=1;
			}
		} else if (typeof(str) == 'string') {
			var str = s;
		}
		if (typeof(str) == 'string' && str.length > 0) {
			dump(strDate + ' ' + str + "\n");
			//that.consoleService.logStringMessage(str)
		}
	} catch (e) {
		dump("error in debug!")
		dump(e);
		that.consoleService.logStringMessage("error in debug!")
	}
}

nsMPM.Nz = function(obj, def) {
	if (typeof(obj) == 'undefined') {
		return (typeof(def) == 'undefined') ? null : def
	}
	return obj
}

nsMPM.Sz = function(str) {
    /* Prepare strings for mpd socket communications */
    if (typeof(str) == "string")
        return '"' + str.replace(/\"/g, '\\"') + '"'
    return "''"
}

nsMPM.smartsort = function(a,b) {
    if (a.type != b.type) {
        if (a.type>b.type) return 1
        if (a.type<b.type) return -1
    }
    var column = "name"     
    if (isNaN(a[column]+b[column])) {
        var al = a[column].toLowerCase()
        var bl = b[column].toLowerCase()
        if (al>bl) return 1
        if (al<bl) return -1
        return 0
    }
    else { return a[column]-b[column]}
}

nsMPM.urlReplace = function(s, item) {   
	let that = this;

	if (that.Nz(item.file)) item.Path = item.file.split("/").slice(0,-1).join("/");
	// that.debug(item);
	for (x in item) {
		var re = new RegExp("{"+x+"}","ig");
		s = s.replace(re, that.fixedEncodeURI(item[x]));
	}
	s = s.replace(/{[^}]+}/g,"");
	return s;
}

// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Functions/encodeURIComponent
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Functions/encodeURI
nsMPM.fixedEncodeURI = function(str) {
	return encodeURI(str).replace(/!/g, '%21').replace(/'/g, '%27')
							  .replace(/\(/g, '%28').replace(/\)/g, '%29')
							  .replace(/\*/g, '%2A').replace(/\@/g, '%40')
							  .replace(/&/g, '%26').replace(/#/g, '%23');
}

nsMPM.getFileContents = function(aURL) {
	let that = this;
	var ioService = that.Cc["@mozilla.org/network/io-service;1"].getService(that.Ci.nsIIOService);
	var scriptableStream = that.Cc["@mozilla.org/scriptableinputstream;1"].getService(that.Ci.nsIScriptableInputStream);

	var channel = ioService.newChannel(aURL, null, null);
	var input = channel.open();
	scriptableStream.init(input);
	var str = scriptableStream.read(input.available());
	scriptableStream.close();
	input.close();
	return str;
}

nsMPM.hmsFromSec = function(sec) {
	var hms = "0:00";
	try {
		sec = parseInt(sec);
	} catch (err) {
		return "0:00";
	}
	if (sec > 0) {
		var h = 0;
		if (sec >= 3600) {
			h = Math.floor(sec / 3600);
			sec = sec % 3600;
		}
		var m = Math.floor(sec / 60);
		var s = sec % 60;
		if (h > 0) {
			h = h + ":";
			if (m.toString().length == 1) m = "0" + m;
		} else h = "";

		m = m + ":";
		if (s.toString().length == 1) s = "0" + s;
		hms = h + m + s;
	}
	return hms;
}

nsMPM.prettyTime = function(sec, round) {
	let that = this;
	var tm = ""
	try {
		sec = parseInt(sec)
	} catch (err) {
		that.debug("prettyTime: " + err.description);
		sec = 0
	}
	if (sec > 0) {
		var d = Math.floor(sec / 86400)
		sec = sec % 86400
		var h = Math.floor(sec / 3600)
		sec = sec % 3600
		var m = Math.floor(sec / 60)
		var s = sec % 60
		var sep = ""

		if (d > 0) {
			if (d > 1) tm = d + " " + that.translateService.GetStringFromName("days");
			else tm = d + " " + that.translateService.GetStringFromName("day");
			sep = ", ";
		}

		if (h > 0) {
			tm += sep;
			if ( h > 1 ) {
				if (d > 0) tm += h + " " + that.translateService.GetStringFromName("hrs");
				else tm += h + " " + that.translateService.GetStringFromName("hours");
			} else {
				if (d > 0) tm += h + " " + that.translateService.GetStringFromName("hr");
				else tm += h + " " + that.translateService.GetStringFromName("hour");
			}
			sep = ", ";
		}

		if (m > 0) {
			tm += sep;
			if ( m > 1 ) {
				if (d > 0) tm += m + " " + that.translateService.GetStringFromName("mins");
				else tm += m + " " + that.translateService.GetStringFromName("minutes");
			} else {
				if (d > 0) tm += m + " " + that.translateService.GetStringFromName("min");
				else tm += m + " " + that.translateService.GetStringFromName("minute");
			}
			sep = ", ";
		}

		if (!that.Nz(round) && s > 0) {
			tm += sep;
			if ( s > 1 ) {
			if (d > 0) tm += s + " " + that.translateService.GetStringFromName("secs");
			else tm += s + " " + that.translateService.GetStringFromName("seconds");
			} else {
				if (d > 0) tm += s + " " + that.translateService.GetStringFromName("sec");
				else tm += s + " " + that.translateService.GetStringFromName("second");
			}
		}
	}
	return tm
}

nsMPM.copyArray = function(oldArray) {
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

nsMPM.getAmazonArt = function(mpd, item, img) {
	let that = this;
	
	var art = "chrome://minion/content/images/album_blank.png";
	var search_url = that.urlReplace(
					"http://musicbrainz.org/ws/1/release/?type=xml&artist={Artist}&title={Album}&limit=1",
					item);
	if ( typeof(item.Album) != 'string' || typeof(item.Artist) != 'string' 
			|| item.Album == "" || item.Artist == "") {
		that.debug("Not enough info for search...")
		img.src = 'chrome://minion/content/images/album_blank_no_info.png';
		img.setAttribute("tooltiptext",that.translateService.GetStringFromName("track_no_info"));	
	} else {
		that.debug("searching Metabrainz...")
		if (typeof(nsMPM.mpd.cachedArt[search_url]) == 'string') {
			img.src = nsMPM.mpd.cachedArt[search_url];
			img.setAttribute("tooltiptext",nsMPM.mpd.cachedArt[search_url]);
		} else {
			var cb = function(data) {
				try {
					var asin = "";
					if (data != "") {
						var s = data.indexOf("<asin>") + 6;
						if (s > 6) {
							var e = data.indexOf("</asin>", s);
							if (e > 0) {
								asin = data.slice(s, e);
							}
							if (asin.length == 10 && asin != '          ') {
								base = "http://images.amazon.com/images/P/" + asin;
								art = base + ".01.MZZZZZZZ.jpg";
							}
						}
					}
					that.debug('applying art='+art);
					nsMPM.mpd.cachedArt[search_url] = art;
					img.src = art;
					img.setAttribute("tooltiptext",art);
					that.SaveImageToURL(item,art);
				} catch (e) {
					that.debug(e);
				}
			};
			that.fetch(search_url, cb);
		}
	}
}

nsMPM.SaveImageToURL = function(item,url) {
	let that = this;
	
	try {
		that.debug('SaveImageToURL url=');
		that.debug(url);
		// we want to reject dummy requests
		var txt = new String(url);
		if (txt.indexOf('chrome://') == 0) return;

		// unless specified, we don't save arts
		if ( parseInt(that.prefs.get("use_amazon_art",1)) != 2 ) {
			return;
		}
		
		// the source object we want to download
		var oSourceURL = that.Cc["@mozilla.org/network/io-service;1"]
			.getService(that.Ci.nsIIOService)
			.newURI(url, null, null);
		
		// if file:// we want to probe if it already exists
		var oTargetFile = that.Cc["@mozilla.org/file/local;1"]
			.createInstance(that.Ci.nsILocalFile);
		// use to create the destination object
		var ioService = that.Cc["@mozilla.org/network/io-service;1"]
			.getService(that.Ci.nsIIOService);
		
		var sTargetFile = that.urlReplace(that.prefs.get("save_art_url"), item);
		var oDestination = ioService.newURI(sTargetFile,null,null);

		that.debug("Attempt to download url: "+url);
		that.debug("Attempt to save to file: "+sTargetFile);

		// Probe if the file already exists
		if ( oDestination.scheme == 'file://' ) {		
			oTargetFile.initWithPath(oDestination.path);		
			if(oTargetFile.exists()) {
				that.debug("File already exists");
				return;
			} else {
				oTargetFile.create(0x00,0640);
			}
		}

		// create a persist
		var persist = that.Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].
			createInstance(that.Ci.nsIWebBrowserPersist);

		// with persist flags if desired See nsIWebBrowserPersist page for more PERSIST_FLAGS.
		const nsIWBP = that.Ci.nsIWebBrowserPersist;
		// const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
		const flags = nsIWBP.PERSIST_FLAGS_NONE;
		persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;

		// do the save
		persist.saveURI(oSourceURL, null, null, null, null, oDestination);

	} catch(e) { 
		that.debug(e); 
	}
}

nsMPM.prefetchImageFromURL = function(url, callBack, arg) {
	let that = this;
	try {
		that.debug('Prefetch requested');
		var imgRequest = that.Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
						.createInstance();
		imgRequest.QueryInterface(that.Ci.nsIDOMEventTarget);
		imgRequest.QueryInterface(that.Ci.nsIXMLHttpRequest);

		imgRequest.open("POST", url, true);
		imgRequest.onreadystatechange = function() {
			if (imgRequest.readyState == 4) {
				imgRequest.onreadystatechange = null;
				var status = imgRequest.status;
				imgRequest = null;
				callBack(status, arg, url);
			}
		};
		imgRequest.send("q="+(Math.random()*10000));
	} catch (e) { 
		// exception was raised, so we fallback to amazon if possible
		// that.debug(e);
		callBack(404, arg, url);
	}
}

nsMPM.fetch = function(url, callBack, arg, getXML) {
	let that = this;
	try {
		var request = that.Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
		request.QueryInterface(that.Ci.nsIDOMEventTarget);
		request.QueryInterface(that.Ci.nsIXMLHttpRequest);

		request.open("GET", url, true)
		request.onreadystatechange = function() {
			if (request.readyState == 4) {
				if (request.status == 200 || request.status == 0) {
					if (that.Nz(getXML)) {
						callBack(request.responseXML, arg, request)
					} else {
						callBack(request.responseText, arg, request)
					}
					request.onreadystatechange = null
					request = null
				} else {
					that.debug(request.status+": "+url)
					request.onreadystatechange = null
					request = null
				}
			}
		}
		request.send("")
	} catch (e) { that.debug(e) }
}

nsMPM.mpm_openDialog = function(url, id) {
	let that = this;
	var features = "chrome,dialog=yes,resizable=yes"
	if (id=="settings") features += ",titlebar,toolbar"
	var win = that.winw.openWindow(that.winw.activeWindow, url, that.Nz(id, url),features, null);
}

nsMPM.openReuseByURL = function(url) {
	let that = this;
	var wm = null;
	try {
		wm = that.Cc["@mozilla.org/appshell/window-mediator;1"]
			.getService(that.Ci.nsIWindowMediator);
		
	} catch(e) {
		that.debug(e);
	}
	var browserEnumerator = wm.getEnumerator("navigator:browser");
	// Check each browser instance for our URL
	var found = false;
	try {
		while (!found && browserEnumerator.hasMoreElements()) {
			var browser = browserEnumerator.getNext();
			var browserInstance = browser.getBrowser();

			// Check each tab of this browser instance
			var numTabs = browserInstance.tabContainer.childNodes.length;
			for (var index = 0; index < numTabs; index++) {
				var currentBrowser = browserInstance.getBrowserAtIndex(index);
				if (url == currentBrowser.currentURI.spec) {
					// The URL is already opened. Select this tab.
					browserInstance.selectedTab = browserInstance.tabContainer.childNodes[index];
					// Focus *this* browser
					browser.focus();
					browserInstance.focus();
					that.debug("browser already in tab");
					// wrapped is compulsory otherwise we can't right click on the statusbar
					// to display album details and perform queries.
					var win = currentBrowser.contentWindow.wrappedJSObject;
					found = true;
					break;
				}
			}
		}
		if (!found) {
			var openInTab = that.prefs.get("launch_in_browser", false);
			var recent = (openInTab) ? wm.getMostRecentWindow("navigator:browser") : false;
			if (recent) {
				recent.focus();
				browserInstance = recent.getBrowser();
				browserInstance.selectedTab = browserInstance.addTab(url);
				browserInstance.focus();
				var currentBrowser = browserInstance.getBrowserForTab(browserInstance.selectedTab);
				// wrapped is compulsory otherwise we can't right click on the statusbar
				// to display album details and perform queries.
				var win = currentBrowser.contentWindow.wrappedJSObject;
			} else {
				var win = that.winw.getWindowByName(url, null);
				if (!win) win = that.winw.openWindow(null, url, url, null, null);
				win.focus();
			}
		}
		return win;
	} catch (e) {
		that.debug(e);
	}
	return null;
}

nsMPM.openReuseByAttribute = function(url, attrName) {
	let that = this;

	var wm = that.Cc["@mozilla.org/appshell/window-mediator;1"].getService(that.Ci.nsIWindowMediator);
	attrName = that.Nz(attrName, 'mpm-unknown-tab')
	try {
		for (var found = false, 
			index = 0, 
			browserInstance = wm.getEnumerator('navigator:browser').getNext().getBrowser(); 
			index < browserInstance.mTabContainer.childNodes.length && !found; index++) {
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
		that.winw.openWindow(null, url, attrName, null, null)
	}
}

nsMPM.guessTags = function(song) {
	let that = this;
	
	_artist = ""
	_album = ""
	_title = ""
	_track = ""
	track = that.Nz(song.Track, "")
	title = that.Nz(song.Title, "")
	artist = that.Nz(song.Artist, "")
	album = that.Nz(song.Album, "")
	try {
		myfile = song.file.match(/[^\/]+$/)[0].replace(/\.[a-zA-Z0-9]+$/, "")
		_title = myfile
		myfile = myfile.replace(/\(.*\)/g, "").replace(/_/g, " ")
		s = myfile.split("-")
		l = s.length
		
		for (var i=0;i<l;i++) {
			if (/^[0-9\.\/\s]+$/.test(s[i])) {
				_track = s.splice(i,1)
				if (typeof(_track) == 'string')
					_track = _track.replace(/^\s\s*/, '').replace(/\s\s*$/, '')
				break
			}
		}

		if (s.length > 0) _title = s.pop()
		if (s.length > 0) _artist = s.shift()
		if (s.length > 0) _album = s.join("-")
		
		if (track == "") song.Track = _track
		if (title == "") song.Title = _title.replace(/^\s\s*/, '').replace(/\s\s*$/, '')
		if (artist == "") song.Artist = _artist.replace(/^\s\s*/, '').replace(/\s\s*$/, '')
		if (album == "") song.Album = _album.replace(/^\s\s*/, '').replace(/\s\s*$/, '')
	} catch (e) {that.debug(e)}
	return song
}

nsMPM.updateStatusBarPosition = function(doc) {
	let that = this;
	var index = that.prefs.get("statusbar_position", 0);
	if (index <= 0) return;
	that.debug('status-bar index: '+index);	
	try
	{
		var statusBar = doc.getElementById("status-bar");
		var children = statusBar.childNodes;

		var statusbarItem = doc.getElementById("mpm_status-bar_controls");

		var newStatusbarItem = statusBar.removeChild(statusbarItem);

		if ((children.length == 0) || (index >= children.length)){
			statusBar.appendChild(newStatusbarItem);
		} else {
			statusBar.insertBefore(newStatusbarItem, children[index-1]);
		}
	} catch(e) {
		that.debug(e);
		that.debug('doc/document:');
		that.debug(doc);
	}
}

nsMPM.chooseFolder = function(win, prefName) {
	let that = this;
	try {
		const nsIFilePicker = that.Ci.nsIFilePicker;
		const nsILocalFile = that.Ci.nsILocalFile;

		var fp = that.Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		var dnldMgr = that.Cc["@mozilla.org/download-manager;1"].getService(that.Ci.nsIDownloadManager);

		var title = "My title";
		fp.init(win, title, nsIFilePicker.modeGetFolder);
		fp.appendFilters(nsIFilePicker.filterAll);

		fp.displayDirectory = dnldMgr.defaultDownloadsDirectory;

		if (fp.show() == nsIFilePicker.returnOK) {
			if ( typeof(prefName) != 'string' ) { that.debug('invalid prefName'); return; }
			if ( prefName.length < 1 ) { that.debug('invalid prefName'); return; }
			var forderPref = win.document.getElementById(prefName);
			var file = fp.fileURL;
			forderPref.value = file.spec;
		}
	} catch(e) { that.debug(e); }
}

// update the UI from the prefs at load time
nsMPM.updateCustomArtInterfacePref = function(doc) {
	let that = this;

	try {
		var use_customPref = doc.getElementById("use_custom");
		var tbCoverUrl = doc.getElementById("tbCoverUrl");
		var btnBrowse = doc.getElementById("btnCustomBrowseLocalFile");
		
		if ( use_customPref.value == true ) {
			tbCoverUrl.disabled = false;
			btnBrowse.disabled = false;
		} else {
			tbCoverUrl.disabled = true;
			btnBrowse.disabled = true;
		}
	} catch(e) { that.debug(e); }
}

// update the UI on user click
nsMPM.updateCustomArtInterface = function(doc) {
	let that = this;
	try {
		var cbUseCustom = doc.getElementById("cbUseCustom");
		var tbCoverUrl = doc.getElementById("tbCoverUrl");
		var btnBrowse = doc.getElementById("btnCustomBrowseLocalFile");

		if ( cbUseCustom.checked == true ) {
			tbCoverUrl.disabled = false;
			btnBrowse.disabled = false;
		} else {
			tbCoverUrl.disabled = true;
			btnBrowse.disabled = true;
		}
	} catch(e) { that.debug(e); }
}

nsMPM.updateAmazonInterfacePref = function(doc) {
	let that = this;
	try {
		var use_amazonPref = doc.getElementById("use_amazon");
		var tbSaveCoverUrl = doc.getElementById("tbSaveCoverUrl");
		var btnBrowse = doc.getElementById("btnAmazonBrowseLocalFile");

		if ( use_amazonPref.value == 2 ) {
			tbSaveCoverUrl.disabled = false;
			btnBrowse.disabled = false;
		} else {
			tbSaveCoverUrl.disabled = true;
			btnBrowse.disabled = true;
		}
	} catch(e) { that.debug(e); }
}

nsMPM.updateAmazonInterface = function(doc) {
	let that = this;
	try {
		var rgUseAmazon = doc.getElementById("rgUseAmazon");
		var tbSaveCoverUrl = doc.getElementById("tbSaveCoverUrl");
		var btnBrowse = doc.getElementById("btnAmazonBrowseLocalFile");

		if ( rgUseAmazon.value == 2 ) {
			tbSaveCoverUrl.disabled = false;
			btnBrowse.disabled = false;
		} else {
			tbSaveCoverUrl.disabled = true;
			btnBrowse.disabled = true;
		}
	} catch(e) { that.debug(e); }
}

nsMPM.togglePlaylistBar = function(doc) {
	let that = this;

	var b = doc.getElementById("mpm_playlist_sb");
	var pl = doc.getElementById("mpm_mw_playlist_box");
	var s = doc.getElementById("mpm_playlist_splitter");
	if (!b.collapsed) pl.saveColumns();
	else pl.showCurrent();
	
	if (parseInt(b.height) < 1) {
		s.collapsed = !s.collapsed;
		b.collapsed = !b.collapsed;
		that.slideevent.incr = 10;
		that.slideevent.end = 110;
	} else {
		that.slideevent.incr = -10;
		that.slideevent.end = 0;
	}
	that.slideevent.doc = doc;
	that.slidetimer.initWithCallback(that.slideevent,100,that.Ci.nsITimer.TYPE_REPEATING_SLACK);
}

nsMPM.prefObserver = function(prefName, changeAction) {
	this.action = changeAction
	this.register = function(){
		this._branch = nsMPM.prefs.branch;
		this._branch.QueryInterface(nsMPM.Ci.nsIPrefBranchInternal);
		this._branch.addObserver("", this, false);
	},
	this.unregister = function(){
		if (!this._branch)
			return;
		this._branch.removeObserver("", this);
	},
	this.observe = function(aSubject, aTopic, aData){
		if (aTopic != "nsPref:changed")
			return;
		// aSubject is the nsIPrefBranch we're observing (after appropriate QI)
		// aData is the name of the pref that's been changed (relative to aSubject)
		if (aData == prefName) this.action()
	}
}

nsMPM.prefs = {
	branch : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.mpm."),
	get : function(strPref, def) {
		try{
			switch (this.branch.getPrefType(strPref)) {
				case this.branch.PREF_STRING :
					return this.branch.getCharPref(strPref);
				case this.branch.PREF_INT :
					return this.branch.getIntPref(strPref);
				case this.branch.PREF_BOOL :
					return this.branch.getBoolPref(strPref);
				default :
					def = nsMPM.Nz(def)
					this.set(strPref, def);
					return def;
			}
		} catch(e){ nsMPM.debug(e); }
		return 'undefined';
	},
	isPref : function (strPref) {
		try {
			if ( !strPref ) return false;
			if ( this.branch.getPrefType(strPref) != this.branch.PREF_INVALID ) return true;
			return false;
		} catch(e) { 
			nsMPM.debug(e);
			return false; 
		}
	},
	getObserver : function (prefName, prefAction) {
		var po = new nsMPM.prefObserver(prefName, prefAction)
		po.register()
		return po
	},
	clear : function(strPref) {
		try {
			this.branch.clearUserPref(strPref);
		} catch(e) { return; }
	},
	set : function(strPref, val) {
		switch (this.branch.getPrefType(strPref)) {
			case this.branch.PREF_STRING :
				this.branch.setCharPref(strPref, val);
				break;
			case this.branch.PREF_INT :
				this.branch.setIntPref(strPref, val);
				break;
			case this.branch.PREF_BOOL :
				this.branch.setBoolPref(strPref, val);
				break;
			default :
				if (typeof(val) != 'undefined') {
					switch (typeof(val)) {
						case 'string' :
							this.branch.setCharPref(strPref, val);
							break;
						case 'number' :
							this.branch.setIntPref(strPref, val);
							break;
						case 'boolean' :
							this.branch.setBoolPref(strPref, val);
							break;
						default :
							this.branch.setCharPref(strPref, val.toSource());
							break;
					}
				}
		}
	}
}
nsMPM.slideevent = {
	incr : 0,
	end : 0,
	doc : null,
	notify: function(slidetimer) {		
		if (this.end < 1) this.end = 0;
		if ( this.incr == 0 ) {
			// nsMPM.debug("canceled"+this.incr+"-"+this.end);
			slidetimer.cancel();
			return;
		}
		try {
			var b = this.doc.getElementById("mpm_playlist_sb");
			// nsMPM.debug("slideevent: incr="+this.incr+", end="+this.end+", b.height="+b.height+", b.boxObject.height="+b.boxObject.height);
			b.height = parseInt(b.height) + this.incr;
		} catch(e) {
			nsMPM.debug(e);
			slidetimer.cancel();
			return;
		}
		if (this.incr > 0) {
			if (b.height >= this.end) slidetimer.cancel();
		} else {
			if (b.height <= this.end) {
				slidetimer.cancel();
				b.collapsed = !b.collapsed;
				var s = this.doc.getElementById("mpm_playlist_splitter");
				s.collapsed = !s.collapsed;
			}
		}
	}
}
nsMPM.winStorage = function(win,doc) {
	if ( typeof(win) == 'undefinied' || typeof(doc) == 'undefined') return
	nsMPM.instance_count++;
	this.instance = nsMPM.instance_count;
	this.obs = null;
	this.obsVol = null;
	this.csPrefObserver = null;
	this.window = win;
	this.document = doc;
	this.mpm = null;
	nsMPM.debug(this);
}
// dependent js modules
// declare holder in mpmCommon.js
if (nsMPM.mpmMenu == null) Components.utils.import("resource://minion/mpmMenu.js",nsMPM);
if (nsMPM.mpd == null) Components.utils.import("resource://minion/mpd.js",nsMPM);
if (nsMPM.mpmUpgrade == null || nsMPM.mpmIsUpgraded == null ) Components.utils.import("resource://minion/mpmUpgrade.js",nsMPM);

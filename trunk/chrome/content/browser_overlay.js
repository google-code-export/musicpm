Components.utils.import("resource://minion/mpmUtils.js");
nsMPM.debug("Starting Music player Minion...");

nsMPM.debug("Checking for upgrades...");
nsMPM.mpmUpgrade(nsMPM.mpd);

nsMPM.debug('Loading preferences...');
nsMPM.mpd.loadServers();
nsMPM.mpd.loadSrvPref();

nsMPM.debug("Starting...");
nsMPM.mpd.prefObserver.register();

nsMPM.debug("let's go...");

var mpm = {
	onLoad: function (e) {
		nsMPM.debug('load')
		window.removeEventListener("load", function(e) { mpm.onLoad(e); }, false);
		var cm = document.getElementById("contentAreaContextMenu")
		if (cm) cm.addEventListener("popupshowing", mpm.linkHandler, true)
		obs.observe(null, null, null)
		var volbtn = document.getElementById('mpm_sb_volume')
		var volscl = document.getElementById('mpm_sb_volume_scale')
		volbtn.addEventListener("DOMMouseScroll", volscl.volScroll, false)
		volbtn.setAttribute("tooltiptext", nsMPM.translateService.GetStringFromName("volume")+" "+nsMPM.mpd.volume+"%")
		nsMPM.observerService.addObserver(obs, 'greeting', false);
		nsMPM.observerService.addObserver(obsVol, 'volume', false);
		csPrefObserver.register();
		nsMPM.updateStatusBarPosition(document);
	},
	onFocus: function (e) {
		window.removeEventListener("focus", function(e) { mpm.onFocus(e); }, false);
		if (nsMPM.mpmIsUpgraded(true) == true ) {
			var cb = function (w){try{w.close}catch(e){}}
			window.openDialog("chrome://minion/content/upgrade.xul", "showupgrade", "chrome", cb)
		}
	},
	onPlaylistUnload: function (e) {
		e.target.saveColumns()
	},
	open: function(url, event) {
		openUILink(url, event, false, true);
	},
	doAbout: function() {
		var cb = function (w){try{w.close}catch(e){}}
		window.openDialog("chrome://minion/content/about/about.xul", "showmore", "chrome", cb)
	},
	linkHandler: function(event) {
		var ma = document.getElementById('mpm_linkHandlerAdd')
		var mp = document.getElementById('mpm_linkHandlerPlay')
		ma.hidden = mp.hidden = !gContextMenu.onLink
		return true
	}
}
function mpm_linkHandlerAction(action) {
	if (gContextMenu.onLink) {
		var t = gContextMenu.target
		// Handles images wrapped in hyperlinks.
		var val = (t.hasAttribute('href')) ? t.href : t.parentNode.href
		if (val != null) {
			var v = new RegExp();
			v.compile(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/);
			if (v.test(val)) {
				nsMPM.mpd.handleURL(val, action)
			}
		}
	}
}
var obs = {
	observe: function(sub,topic,data){
		var hide = (nsMPM.mpd._socket == null);
		document.getElementById('mpm_sb_controls').hidden = hide;
		document.getElementById('mpm_sb_volume').hidden = hide;
		document.getElementById('mpm_sb_playlist').hidden = hide;
		document.getElementById('mpm_sb_currentsong').hidden = hide;
		if (!hide) {
			csPrefObserver.observe(null,"nsPref:changed","sb_currentsong_hide")
			csPrefObserver.observe(null,"nsPref:changed","sb_playlist_menu")
		} else {
			document.getElementById('mpm_sb_currentsong').collapsed = true
			document.getElementById('mpm_sb_playlist').collapsed = true
			document.getElementById('mpm_sb_currentsongb').collapsed = true
			document.getElementById('mpm_sb_playlistb').collapsed = true
			document.getElementById('sb_playlist_menu').collapsed = true
			document.getElementById('sb_playlist_box').collapsed = true
		}
	}
};
var obsVol = {
	observe: function(sub,topic,data){
		var vol = document.getElementById('mpm_sb_volume')
		vol.setAttribute("tooltiptext", nsMPM.translateService.GetStringFromName("volume")+" "+data+"%")
	}
};
var csPrefObserver = {
	register: function(){
		this._branch = nsMPM.prefs.branch;
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
			case "sb_currentsong_hide":
				var hide = nsMPM.prefs.get('sb_currentsong_hide', false)
				document.getElementById('mpm_sb_currentsong').collapsed = hide;
				document.getElementById('mpm_sb_playlist').collapsed = !hide;
				document.getElementById('mpm_sb_currentsongb').collapsed = hide;
				document.getElementById('mpm_sb_playlistb').collapsed = !hide;
				break;
			case "sb_playlist_menu":
				var menu = nsMPM.prefs.get('sb_playlist_menu', false)
				document.getElementById('sb_playlist_menu').collapsed = !menu
				document.getElementById('sb_playlist_box').collapsed = menu
				break;
			case "statusbar_position":
				nsMPM.updateStatusBarPosition(document);
				break;
		}
	}
};
var srv = ""
try {
	window.addEventListener("load", function(e) { mpm.onLoad(e); }, false);
	window.addEventListener("focus", function(e) { mpm.onFocus(e); }, false);
	window.addEventListener("online", function(e) { nsMPM.mpd.force_connect();dump("online\n") }, false);
	window.addEventListener("offline", function(e) { nsMPM.mpd.disconnect();dump("offline\n") }, false);

	window.addEventListener("load", function(e) {
		try {
			document.getElementById('popup_playlist').addEventListener("unload", function(e) { mpm.onPlaylistUnload(e); }, true);
			document.getElementById('mpm_mw_playlist_box').addEventListener("unload", function(e) { mpm.onPlaylistUnload(e); }, true);
		} catch(e) {nsMPM.debug(e);}
	}, false);
} catch(e) {nsMPM.debug(e);}
Components.utils.import("resource://minion/mpmUtils.js");
nsMPM.debug("Starting Music player Minion...");

nsMPM.debug("Checking for upgrades...");
nsMPM.mpmUpgrade.check(nsMPM.mpd);

nsMPM.debug('Loading preferences...');
nsMPM.mpd.loadServers();
nsMPM.mpd.loadSrvPref();

nsMPM.debug("Starting...");
nsMPM.mpd.prefObserver.register();

nsMPM.debug("let's go...");

var nsMPM_window = new nsMPM.winStorage(window,document);

nsMPM_window.mpm = {
	onLoad: function (e) {
		nsMPM.debug('loading...')
		try {
			window.removeEventListener("load", function(e) { nsMPM_window.mpm.onLoad(e); }, false);
			nsMPM_window.obs.observe(null, null, null)
			var volbtn = nsMPM_window.document.getElementById('mpm_sb_volume')
			var volscl = nsMPM_window.document.getElementById('mpm_sb_volume_scale')
			volbtn.addEventListener("DOMMouseScroll", volscl.volScroll, false)
			volbtn.setAttribute("tooltiptext", nsMPM.translateService.GetStringFromName("volume")+" "+nsMPM.mpd.volume+"%")
			nsMPM.observerService.addObserver(nsMPM_window.obs, 'greeting', false);
			nsMPM.observerService.addObserver(nsMPM_window.obsVol, 'volume', false);
			nsMPM_window.csPrefObserver.register();
			nsMPM.updateStatusBarAllStyles(nsMPM_window);
		} catch(e){nsMPM.debug(e);}
		nsMPM.debug('loaded')
	},
	onFocus: function (e) {
		window.removeEventListener("focus", function(e) { nsMPM_window.mpm.onFocus(e); }, false);
		if (nsMPM.mpmUpgrade.isUpgraded(true) == true ) {
			var cb = function (w){try{w.close}catch(e){}}
			window.openDialog("chrome://minion/content/upgrade.xul", "showupgrade", "chrome", cb)
		}
	},
	onPlaylistUnload: function (e) {
		e.target.saveColumns()
	},
	open: function(url, event) {
		openUILink(url, event, false, true);
	}
}

nsMPM_window.obs = {
	observe: function(sub,topic,data){
		var hide = (nsMPM.mpd._socket == null);
		nsMPM.updateStatusBarElementsStyles(nsMPM_window,'force','playback',hide);
		nsMPM.updateStatusBarElementsStyles(nsMPM_window,'force','currentsong',hide);
		nsMPM.updateStatusBarElementsStyles(nsMPM_window,'force','playlist',hide);

		if (!hide) {
			nsMPM_window.csPrefObserver.observe(null,"nsPref:changed","sb_controls_hide");
			nsMPM_window.csPrefObserver.observe(null,"nsPref:changed","sb_currentsong_hide");
			nsMPM_window.csPrefObserver.observe(null,"nsPref:changed","sb_playlist_menu");
		}
	}
};
nsMPM_window.obsVol = {
	observe: function(sub,topic,data){
		var vol = nsMPM_window.document.getElementById('mpm_sb_volume')
		vol.setAttribute("tooltiptext", nsMPM.translateService.GetStringFromName("volume")+" "+data+"%")
	}
};
nsMPM_window.csPrefObserver = {	
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
			case "sb_launch_hide":
				nsMPM.updateStatusBarElementsStyles(nsMPM_window,'pref','launch',null);
			break;
			case "sb_controls_hide":
				nsMPM.updateStatusBarElementsStyles(nsMPM_window,'pref','playback',null);
			break;
			case "sb_currentsong_hide":
				nsMPM.updateStatusBarElementsStyles(nsMPM_window,'pref','currentsong',null);
			break;
			case "sb_playlist_menu":
				nsMPM.updateStatusBarElementsStyles(nsMPM_window,'pref','playlist',null);
			break;
			case "sb_settings_hide":
				nsMPM.updateStatusBarElementsStyles(nsMPM_window,'pref','settings',null);
			break;
			case "sb_song_width":
			case "statusbar_position":
			case "statusbar_hide":
				nsMPM.updateStatusBarStyles(nsMPM_window);
				break;
		}
	}
};
try {
	window.addEventListener("load", function(e) { nsMPM_window.mpm.onLoad(e); }, false);
	window.addEventListener("focus", function(e) { nsMPM_window.mpm.onFocus(e); }, false);
	window.addEventListener("online", function(e) { nsMPM.mpd.force_connect();nsMPM.debug("online\n") }, false);
	window.addEventListener("offline", function(e) { nsMPM.mpd.disconnect();nsMPM.debug("offline\n") }, false);

	window.addEventListener("load", function(e) {
		try {
			document.getElementById('popup_playlist').addEventListener("unload", function(e) { nsMPM_window.mpm.onPlaylistUnload(e); }, true);
			document.getElementById('mpm_mw_playlist_box').addEventListener("unload", function(e) { nsMPM_window.mpm.onPlaylistUnload(e); }, true);
		} catch(e) {nsMPM.debug(e);}
	}, false);
} catch(e) {nsMPM.debug(e);}
var EXPORTED_SYMBOLS = [ "nsMPM" ];

/**
 * nsMPM namespace.
 */
if ("undefined" == typeof(nsMPM) || nsMPM == null ) {
	var nsMPM = {
		Cc: Components.classes,
		Ci: Components.interfaces,
		Cu: Components.utils,
		JSON: null,
		FileIO: null,
		DirIO: null,
		mpmMenu: null,
		mpd: null,
		mpmUpgrade: null,
		mpmIsUpgraded: null,
		
		pref_dir: "ProfD", // http://mxr.mozilla.org/seamonkey/source/xpcom/io/nsAppDirectoryServiceDefs.h
		pref_file_servers: "mpm_servers.js",
		pref_file_menus : "mpm_menus.js"
	};
}

// independent js modules
if (nsMPM.JSON == null) Components.utils.import("resource://minion/JSON.js",nsMPM);
if (nsMPM.FileIO == null )Components.utils.import("resource://minion/io.js",nsMPM);

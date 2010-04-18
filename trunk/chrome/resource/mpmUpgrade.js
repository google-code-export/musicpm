Components.utils.import("resource://minion/mpmUtils.js");
Components.utils.import("resource://minion/mpmMenu.js");
Components.utils.import("resource://minion/io.js");


EXPORTED_SYMBOLS = ["mpmUpgrade"]

// http://mxr.mozilla.org/seamonkey/source/xpcom/io/nsAppDirectoryServiceDefs.h
var pref_dir = "ProfD";
var pref_dir_old = "Home";

var pref_file_menus = "mpm_menus.js";
var pref_file_menus_old = ".mpm_menus.js";

var pref_file_servers = "mpm_servers.js";
var pref_file_servers_old = ".mpm_servers.js";

var pref_file_state_old = ".mpm_browser_state.js";

function mpmUpgrade(mpd) {
	try {
		var oldVersion = mpmGetPreviousVersion();
		if ( oldVersion == mpmGetCurrentVersion() ) {
			debug('No upgrades to do');
			return;
		}

		debug('mpm preferences need to be upgraded ('+mpmGetPreviousVersion()+' != '+mpmGetCurrentVersion()+')');
		switch(oldVersion) {
			case '1.4.4':
				mpmUpgrade144(mpd);
			break;
			case '2.0.0':
				mpmUpgrade200(mpd);
			case '2.0.4':
				mpmUpgrade204(mpd);
			case '2.0.6':
				mpmUpgrade206(mpd);
			break;
			default:
				debug('This version has nothing to upgrade ('+oldVersion+')');
			break;
		}
		mpmCleanOldPrefs();
		mpmSetCurrentVersion();
		debug('Upgrade done');
	} catch(e) { debug(e); }
}

function mpmUpgrade206(mpd) {
	try {
		if ( prefs.isPref('use_amazon_art') ) {
			if (typeof(prefs.get("use_amazon_art",1)) == "boolean" ) prefs.clear("use_amazon_art");
		}
		debug('Upgrade for 2.0.6: Ok');
	} catch(e) {
		debug('Upgrade for 2.0.6: Failed');
		debug(e);
		return false;
	}
}

function mpmUpgrade204(mpd) {
	try {
		if ( prefs.isPref('persistant_state') ) prefs.clear("persistant_state");

		var file = DirIO.get(pref_dir_old);
		file.append(pref_file_state_old);
		if (file.exists()) FileIO.unlink(file);

		debug('Upgrade for 2.0.4: Ok');
	} catch(e) {
		debug('Upgrade for 2.0.4: Failed');
		debug(e);
		return false;
	}
}

function mpmUpgrade200(mpd) {
	try {
		var file = DirIO.get(pref_dir_old);
		file.append(pref_file_servers_old);
		if (file.exists()) {
			debug('Upgrading old server prefs');
			var str = FileIO.read(file);
			mpd.servers = eval(str);
			FileIO.unlink(file);
			mpd.setServers(mpd.servers);
		}

		file = DirIO.get(pref_dir_old);
		file.append(pref_file_menus_old);
		if (file.exists()) {
			debug('Upgrading old menu prefs');
			var str = FileIO.read(file);
			mpmMenu.items = eval(str);

			// Handles conversion for < 1.99.4 alpha clients
			for (var i=0;i<mpmMenu.items.length;i++) {
				var item = mpmMenu.items[i];
				if (typeof(item.filterField == 'undefined')) {
					item.filterField = null;
					if (item.id == "mpm_menu_viewAlbum") item.filterField = 'Artist';
				}
			}
			mpmMenu.save();
			FileIO.unlink(file);
			mpmMenu.items = [];
		}

		debug('Upgrade for 2.0.0: Ok');
	} catch(e) {
		debug('Upgrade for 2.0.0: Failed');
		debug(e);
		return false;
	}
}

function mpmUpgrade144(mpd) {
	try {
		var host = prefs.get('mpd_host');
		var port = prefs.get('mpd_port');
		var password = prefs.get('mpd_password');

		prefs.set('server',host+':'+port+':'+password);

		var servers = [];
		var server = [];
		server.push('MPD server');
		server.push(host+':'+port+':'+password);
		servers.push(server);
		
		mpd.setServers(servers);

		prefs.clear("mpd_host");
		prefs.clear("mpd_port");
		prefs.clear("mpd_password");
		prefs.clear("playlist_mode");
		prefs.clear("home");

		debug('Upgrade for 1.4.4: Ok');		
		return true;
	} catch(e) {
		debug('Upgrade for 1.4.4: Failed');
		debug(e);
		return false;
	}
}


function mpmCleanOldPrefs() {
	oldPrefs = ["mpd_host", "mpd_port", "mpd_password", "playlist_mode", "home", "use_amazon_art", "persistant_state"];
	for(i=0; i<oldPrefs.length; i++){
		if ( prefs.isPref(oldPrefs[i]) ) prefs.clear(oldPrefs[i]);
	}
}


function mpmGetPreviousVersion() {
	if ( prefs.isPref('version') ) return prefs.get('version');

	if ( prefs.isPref('save_art_url') ) return '2.0.8';
	
	var menus_file = DirIO.get(pref_dir);
	menus_file.append(pref_file_menus);
	var servers_file = DirIO.get(pref_dir);
	servers_file.append(pref_file_servers);
	if ( servers_file.exists() && menus_file.exists() ) return '2.0.6';

	if ( prefs.isPref('debug') ) return '2.0.4';

	menus_file = DirIO.get(pref_dir_old);
	menus_file.append(pref_file_menus_old);
	servers_file = DirIO.get(pref_dir_old);
	servers_file.append(pref_file_servers_old);
	if ( servers_file.exists() || menus_file.exists() ) return '2.0.0';

	if ( prefs.isPref('mpd_host') ) return '1.4.4';
}


function mpmGetCurrentVersion() {
	var rdfs = Components.classes['@mozilla.org/rdf/rdf-service;1']
				.getService(Components.interfaces.nsIRDFService);
	var extension = rdfs.GetResource('urn:mozilla:item:Music_Player_Minion@code.google.com');
	var gExtensionDB = Components.classes['@mozilla.org/extensions/manager;1']
				.getService(Components.interfaces.nsIExtensionManager)
				.QueryInterface(Components.interfaces.nsIExtensionManager)
				.datasource;

	// Version
	var versionArc = rdfs.GetResource(EM_NS('version'));
	var version = gExtensionDB.GetTarget(extension, versionArc, true);
	return version.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
}

function EM_NS(aProperty) {
    return 'http://www.mozilla.org/2004/em-rdf#' + aProperty;
}

function mpmSetCurrentVersion() {
	prefs.set('version',mpmGetCurrentVersion());
}
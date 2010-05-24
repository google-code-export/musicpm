Components.utils.import("resource://minion/mpmUtils.js");

let EXPORTED_SYMBOLS = ["mpmUpgrade"]

// Old variables. Now discarder. see mpmCommon.js.
var pref_dir_old = "Home";
var pref_file_menus_old = ".mpm_menus.js";
var pref_file_servers_old = ".mpm_servers.js";
var pref_file_state_old = ".mpm_browser_state.js";

var mpmUpgrade = {};

function mpmUpgrade206(mpd) {
	try {
		if ( nsMPM.prefs.isPref('use_amazon_art') ) {
			if (typeof(nsMPM.prefs.get("use_amazon_art",1)) == "boolean" ) nsMPM.prefs.clear("use_amazon_art");
		}

		// it is not possible to restore old menus stored in JS and get them converted to JSON
		// So, we have to restore defaults value.
		// This concerns only "beta" user of 2.0.x branch
		var file = nsMPM.DirIO.get(pref_dir_old);
		file.append(pref_file_menus_old);
		if (file.exists()) {
			nsMPM.FileIO.unlink(file);
		}
		nsMPM.mpmMenu.restore(); // Will overwrite any already migrated menus

		nsMPM.debug('Upgrade for 2.0.6: Ok');
	} catch(e) {
		nsMPM.debug('Upgrade for 2.0.6: Failed');
		nsMPM.debug(e);
	}
	return true;
}

function mpmUpgrade204(mpd) {
	try {
		if ( nsMPM.prefs.isPref('persistant_state') ) nsMPM.prefs.clear("persistant_state");

		var file = nsMPM.DirIO.get(pref_dir_old);
		file.append(pref_file_state_old);
		if (file.exists()) nsMPM.FileIO.unlink(file);

		nsMPM.debug('Upgrade for 2.0.4: Ok');
	} catch(e) {
		nsMPM.debug('Upgrade for 2.0.4: Failed');
		nsMPM.debug(e);
	}
	return true;
}

function mpmUpgrade200(mpd) {
	try {
		var file = nsMPM.DirIO.get(pref_dir_old);
		file.append(pref_file_servers_old);
		if (file.exists()) {
			nsMPM.debug('Upgrading old server nsMPM.prefs');
			var str = nsMPM.FileIO.read(file);
			nsMPM.mpd.servers = nsMPM.JSON.parse(str);
			nsMPM.FileIO.unlink(file);
			nsMPM.mpd.setServers(nsMPM.mpd.servers);
		}
		nsMPM.debug('Upgrade for 2.0.0: Ok');
	} catch(e) {
		nsMPM.debug('Upgrade for 2.0.0: Failed');
		nsMPM.debug(e);
	}
	return true;
}

function mpmUpgrade144(mpd) {
	try {
		var host = nsMPM.prefs.get('mpd_host');
		var port = nsMPM.prefs.get('mpd_port');
		var password = nsMPM.prefs.get('mpd_password');

		nsMPM.prefs.set('server',host+':'+port+':'+password);

		var servers = [];
		var server = [];
		server.push('MPD server');
		server.push(host+':'+port+':'+password);
		servers.push(server);
		
		nsMPM.mpd.setServers(servers);

		nsMPM.prefs.clear("mpd_host");
		nsMPM.prefs.clear("mpd_port");
		nsMPM.prefs.clear("mpd_password");
		nsMPM.prefs.clear("playlist_mode");
		nsMPM.prefs.clear("home");

		nsMPM.debug('Upgrade for 1.4.4: Ok');		
	} catch(e) {
		nsMPM.debug('Upgrade for 1.4.4: Failed');
		nsMPM.debug(e);
	}
	return true;
}

function mpmCleanOldPrefs() {
	oldPrefs = ["mpd_host", "mpd_port", "mpd_password", "playlist_mode", "home", "use_amazon_art", "persistant_state"];
	for(i=0; i<oldPrefs.length; i++){
		if ( nsMPM.prefs.isPref(oldPrefs[i]) ) nsMPM.prefs.clear(oldPrefs[i]);
	}
}

function mpmGetPreviousVersion() {
	if ( nsMPM.prefs.isPref('version') ) return nsMPM.prefs.get('version');

	if ( nsMPM.prefs.isPref('save_art_url') ) return '2.0.8';
	
	var menus_file = nsMPM.DirIO.get(nsMPM.pref_dir);
	menus_file.append(nsMPM.pref_file_menus);
	var servers_file = nsMPM.DirIO.get(nsMPM.pref_dir);
	servers_file.append(nsMPM.pref_file_servers);
	if ( servers_file.exists() && menus_file.exists() ) return '2.0.6';

	if ( nsMPM.prefs.isPref('nsMPM.debug') ) return '2.0.4';

	menus_file = nsMPM.DirIO.get(pref_dir_old);
	menus_file.append(pref_file_menus_old);
	servers_file = nsMPM.DirIO.get(pref_dir_old);
	servers_file.append(pref_file_servers_old);
	if ( servers_file.exists() || menus_file.exists() ) return '2.0.0';

	if ( nsMPM.prefs.isPref('mpd_host') ) return '1.4.4';
	return mpmGetCurrentVersion();
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

function mpmSetUpgraded(isUpgraded) {
	if ( typeof(isUpgraded) == 'boolean' ) nsMPM.prefs.set('upgraded',isUpgraded);
	else nsMPM.prefs.set('upgraded',false);
}

function EM_NS(aProperty) {
    return 'http://www.mozilla.org/2004/em-rdf#' + aProperty;
}

function mpmSetCurrentVersion() {
	nsMPM.prefs.set('version',mpmGetCurrentVersion());
}

// Upgrade dialog box functions
mpmUpgrade.check = function(mpd) {
	try {
		var oldVersion = mpmGetPreviousVersion();
		if ( oldVersion == mpmGetCurrentVersion() ) {
			nsMPM.debug('No upgrades to do');
			return;
		}

		nsMPM.debug('mpm preferences need to be upgraded ('+mpmGetPreviousVersion()+' != '+mpmGetCurrentVersion()+')');
		switch(oldVersion) {
			case '1.4.4':
				mpmSetUpgraded(mpmUpgrade144(mpd));
			break;
			case '2.0.0':
				mpmSetUpgraded(mpmUpgrade200(mpd));
			case '2.0.4':
				mpmSetUpgraded(mpmUpgrade204(mpd));
			case '2.0.6':
				mpmSetUpgraded(mpmUpgrade206(mpd));
			case '2.0.12':
				mpmSetUpgraded(true);
			break;
			default:
				nsMPM.debug('This version has nothing to upgrade ('+oldVersion+')');
				mpmSetUpgraded(false);
			break;
		}
		mpmCleanOldPrefs();
		mpmSetCurrentVersion();
		nsMPM.debug('Upgrade done');
	} catch(e) { nsMPM.debug(e); }
}

mpmUpgrade.isUpgraded = function(reset) {
	var isUpgraded = nsMPM.prefs.get('upgraded',true);
	if ( typeof(reset) == 'boolean' && reset == true ) 	nsMPM.prefs.set('upgraded',false);
	return isUpgraded;
}

mpmUpgrade.dialogInit = function(document){
	try {
		var rdfs = Components.classes['@mozilla.org/rdf/rdf-service;1'].
							  getService(Components.interfaces.nsIRDFService);
		var extension = rdfs.GetResource('urn:mozilla:item:Music_Player_Minion@code.google.com');
		var gExtensionDB = Components.classes['@mozilla.org/extensions/manager;1'].
						   getService(Components.interfaces.nsIExtensionManager).
						   QueryInterface(Components.interfaces.nsIExtensionManager).
						   datasource;
	
		var extensionsStrings = document.getElementById('extensionsStrings');
	
		// Name
		var nameArc = rdfs.GetResource(EM_NS('name'));
		var name = gExtensionDB.GetTarget(extension, nameArc, true);
		name = name.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
	
		// Version
		version = mpmGetCurrentVersion();
	
		// Description
		var descriptionArc = rdfs.GetResource(EM_NS('description'));
		var description = gExtensionDB.GetTarget(extension, descriptionArc, true);
		if (description)
		  description = description.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
	
		document.title = extensionsStrings.getFormattedString('aboutWindowTitle', [name]);
		var extensionName = document.getElementById('extensionName');
		extensionName.setAttribute('value', name);
		var extensionVersion = document.getElementById('extensionVersion');
		extensionVersion.setAttribute('value', version);
	
		var extensionDescription = document.getElementById('extensionDescription');
		extensionDescription.appendChild(document.createTextNode(description));
	
		var acceptButton = document.documentElement.getButton('accept');
		acceptButton.label = extensionsStrings.getString('aboutWindowCloseButton');
		nsMPM.debug('fin init');
	} catch(e){nsMPM.debug(e);}
}

mpmUpgrade.doServer = function() {
	nsMPM.mpm_openDialog('chrome://minion/content/servers.xul', 'servers');
}

mpmUpgrade.doSettings = function() {
	nsMPM.mpm_openDialog('chrome://minion/content/settings.xul', 'settings');
}

mpmUpgrade.doAbout = function() {
	nsMPM.mpm_openDialog('chrome://minion/content/about/about.xul', 'about');
}	

Components.utils.import("resource://minion/mpmUtils.js");
Components.utils.import("resource://minion/mpmMenu.js");
Components.utils.import("resource://minion/io.js");
Components.utils.import("resource://minion/JSON.js");

EXPORTED_SYMBOLS = ["mpmUpgrade", "mpmIsUpgraded"]

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
				debug('This version has nothing to upgrade ('+oldVersion+')');
				mpmSetUpgraded(false);
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

		// it is not possible to restore old menus stored in JS and get them converted to JSON
		// So, we have to restore defaults value.
		// This concerns only "beta" user of 2.0.x branch
		var file = DirIO.get(pref_dir_old);
		file.append(pref_file_menus_old);
		if (file.exists()) {
			FileIO.unlink(file);
		}
		mpmMenu.restore(); // Will overwrite any already migrated menus

		debug('Upgrade for 2.0.6: Ok');
	} catch(e) {
		debug('Upgrade for 2.0.6: Failed');
		debug(e);
	}
	return true;
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
	}
	return true;
}

function mpmUpgrade200(mpd) {
	try {
		var file = DirIO.get(pref_dir_old);
		file.append(pref_file_servers_old);
		if (file.exists()) {
			debug('Upgrading old server prefs');
			var str = FileIO.read(file);
			mpd.servers = JSON.parse(str);
			FileIO.unlink(file);
			mpd.setServers(mpd.servers);
		}
		debug('Upgrade for 2.0.0: Ok');
	} catch(e) {
		debug('Upgrade for 2.0.0: Failed');
		debug(e);
	}
	return true;
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
	} catch(e) {
		debug('Upgrade for 1.4.4: Failed');
		debug(e);
	}
	return true;
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

function mpmSetUpgraded(isUpgraded) {
	if ( typeof(isUpgraded) == 'boolean' ) prefs.set('upgraded',isUpgraded);
	else prefs.set('upgraded',false);
}

function mpmIsUpgraded(reset) {
	var isUpgraded = prefs.get('upgraded',true);
	if ( typeof(reset) == 'boolean' && reset == true ) 	prefs.set('upgraded',false);
	return isUpgraded;
}

function EM_NS(aProperty) {
    return 'http://www.mozilla.org/2004/em-rdf#' + aProperty;
}

function mpmSetCurrentVersion() {
	prefs.set('version',mpmGetCurrentVersion());
}

/*
 * Upgrade dialog box functions
 */
function dialogInit(){
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

    // Home Page URL
    var homepageArc = rdfs.GetResource(EM_NS('homepageURL'));
    var homepage = gExtensionDB.GetTarget(extension, homepageArc, true);
    if (homepage) {
        homepage = homepage.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
        // only allow http(s) homepages
        var scheme = '';
        var uri = null;
        try {
            uri = makeURI(homepage);
            scheme = uri.scheme;
        }
        catch (ex) {}

        if (uri && (scheme == 'http' || scheme == 'https'))
            homepage = uri.spec;
        else
            homepage = null;
    }

    document.title = extensionsStrings.getFormattedString('aboutWindowTitle', [name]);
    var extensionName = document.getElementById('extensionName');
    extensionName.setAttribute('value', name);
    var extensionVersion = document.getElementById('extensionVersion');
    extensionVersion.setAttribute('value', version);

    var extensionDescription = document.getElementById('extensionDescription');
    extensionDescription.appendChild(document.createTextNode(description));

    var extensionHomepage = document.getElementById('extensionHomepage');
    if (homepage) {
        extensionHomepage.setAttribute('homepageURL', homepage);
        extensionHomepage.setAttribute('tooltiptext', homepage);
        extensionHomepage.blur();
    }
    else
        extensionHomepage.hidden = true;

    var acceptButton = document.documentElement.getButton('accept');
    acceptButton.label = extensionsStrings.getString('aboutWindowCloseButton');
	debug('fin init');
}

function doServer() {
	mpm_openDialog('chrome://minion/content/servers.xul', 'servers');
}

function doSettings() {
	mpm_openDialog('chrome://minion/content/settings.xul', 'settings');
}

function doAbout() {
	mpm_openDialog('chrome://minion/content/about/about.xul', 'about');
}
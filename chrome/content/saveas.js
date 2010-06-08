Components.utils.import("resource://minion/mpmUtils.js");

addEventListener('load', function() {
	let dlg = dialog;
	let url = dialog.mLauncher.source;
	let referrer;

	removeEventListener('load', arguments.callee, true);
	var mimeSvc = Components.classes["@mozilla.org/mime;1"].getService(Components.interfaces.nsIMIMEService);
	var contentType = '';
	var fileExt = '';
	
	try {
		if ( typeof(url.fileExtension) != 'undefined' )
			fileExt = (url.fileExtension) ? url.fileExtension.toLocaleLowerCase() : '';
	} catch(e){
		nsMPM.debug('Failed to get fileExtension');
		fileExt = '';
	}
	
	try {
		contentType = mimeSvc.getTypeFromURI(url);
	} catch(e){
		nsMPM.debug('Failed to get mime-type');
		contentType = '';
	}

	function downloadPlaylist() {
		let de = document.documentElement;
		try {
			nsMPM.handleDowloadURL(url);
			de.removeAttribute('ondialogaccept');
			de.cancelDialog();
		}catch(e) { nsMPM.debug(e); }
	}

	if ( nsMPM.prefs.get('dl.integrate',true) != true ) return; // no overlay
	
	if ( url.spec.match(/^file/i) ) { // this might be a local file, via drag and drop
		if (contentType != 'audio/x-scpls' &&
			contentType != 'audio/x-mpegurl' &&
			contentType != 'application/xspf+xml' &&
			fileExt != 'pls' && fileExt != 'm3u' && fileExt != 'xspf' ) {
			nsMPM.debug('File not supported: '+url.spec+'(ext:'+fileExt+',mime:'+contentType+')');
			return; // no overlay, because not supported
		}
	}else {
		if (contentType != 'audio/x-scpls' &&
			contentType != 'audio/x-mpegurl' &&
			contentType != 'application/xspf+xml' &&
			fileExt != 'pls' && fileExt != 'm3u' && fileExt != 'xspf' &&
			fileExt != 'mp3' && fileExt != 'ogg' && fileExt != 'wav' &&
			fileExt != 'flac' && fileExt != 'mod' && fileExt != 'aac' &&
			fileExt != 'wma') {
			nsMPM.debug('File not supported: '+url.spec+'(ext:'+fileExt+',mime:'+contentType+')');
			return; // no overlay, because not supported
		}
	}

	const remember = document.getElementById("rememberChoice");
	const mpmdownloadcontainer = document.getElementById('mpmdownloadcontainer');
	const mpmdownload = document.getElementById('mpmdownload');
	const mode = document.getElementById('mode');

	mode.selectedItem = mpmdownload;
	mpmdownloadcontainer.collapsed = false;
	mpmdownload.disabled = false;
	remember.disabled = true; 
	remember.checked = false;

	try {
		referrer = dialog.mContext.QueryInterface(Components.interfaces.nsIWebNavigation).currentURI.spec;
	} catch(e) {
		referrer = url.spec;
	}
	
	mode.addEventListener('select', function(evt) {
		let selMode = mode.selectedItem;
		if (mpmdownload == selMode) {
			remember.disabled = true; 
			remember.checked = false;
		} else {
			remember.disabled = false; 
		}
		dlg.toggleRememberChoice(remember);
	}, false ); //select
	
	addEventListener('dialogaccept', function(evt) {
		let selMode = mode.selectedItem;
		if (selMode == mpmdownload ) {
			downloadPlaylist();			
			evt.stopPropagation();
			evt.preventDefault();
			return;
		}
	}, false); // dialogaccept
}, true); // load

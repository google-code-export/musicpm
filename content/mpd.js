/**
 * @author cseickel
 */
var host = "192.168.1.2"
var port = 6600
var mpd
var status_command = "command_list_begin\nstatus\nstats\ncommand_list_end\n"
var queue = []
var notify = {}
var talker_active = false
var doStatus = true

var transportService =
  Components.classes["@mozilla.org/network/socket-transport-service;1"]
    .getService(Components.interfaces.nsISocketTransportService);


function init_mpd () {
	if (typeof(mpd) != 'object') {
		mpd = {
			'volume': '-1',
			'repeat': '-1',
			'random': '-1',
			'playlist': '-1',
			'playlistlength': '-1',
			'xfade': '0',
			'state': 'none',
			'song': '-1',
			'songid': '-1',
			'time': '0:0',
			'bitrate': '0',
			'audio': '0:0:0',
			'artists': '0',
			'albums': '0',
			'songs': '0',
			'uptime': '0',
			'playtime': '0',
			'db_playtime': '0',
			'db_update': '0'
		}
		queue = []
		talker_active = false
		doStatus = true
		checkStatus()
	}
}

function command(outputData, callBack){
	queue.push({'outputData':outputData+"\n", 'callBack':callBack})
	if (!talker_active) {talker()}
}

function talker(){
	talker_active = true
	if (queue.length == 0 && doStatus) {
		var item = {
			'outputData': status_command,
			'callBack': statusCallBack
		}
	}
	else {
		var item = queue.shift()
	}
	var transport = transportService.createTransport(null,0,host,port,null);
	var stream_out = transport.openOutputStream(0,0,0);
	var stream_in = transport.openInputStream(0,0,0);
	const replacementChar = Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER;
	var instream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                   .createInstance(Components.interfaces.nsIConverterInputStream);
	instream.init(stream_in, 'UTF-8', 1024, replacementChar);
	var outstream = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                   .createInstance(Components.interfaces.nsIConverterOutputStream)
	outstream.init(stream_out, 'UTF-8', 0, 0x0000)
	
	var dataListener  = {
		  data : "",
		  onStartRequest: function(request, context){
		  			talker_active = true
					},
		  onStopRequest: function(request, context, status){
					talker_active = false
					},
		  onDataAvailable: function(request, context, inputStream, offset, count){
		  	var str = {};
			var done = false
			while (instream.readString(4096, str) != 0) {
				this.data += str.value
			}
			if (this.data.substr(0,6) == "OK MPD"){
				this.data = ""
				outstream.writeString(item.outputData);
			}		
			else if (this.data.slice(-3) == "OK\n") {
				if (item.callBack) {item.callBack(this.data)}
				done = true
			}
			else if (this.data.indexOf('ACK [') != -1) {
				alert(item.outputData+"\n"+this.data)
				done = true
			}
			if (done) {
				this.data = ""
				if (queue.length > 0) {
					item = queue.shift();
					outstream.writeString(item.outputData);
				}
				else if (doStatus) {
					doStatus = false
					item = {'outputData':status_command, 'callBack':statusCallBack}
					outstream.writeString(item.outputData)
				}
				else {
					item = null
					instream.close()
					stream_in.close()
					outstream.close()
					stream_out.close()
				}
			}				
		},
	};
	var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].
				createInstance(Components.interfaces.nsIInputStreamPump);
	pump.init(stream_in, -1, -1, 0, 0, false);
	pump.asyncRead(dataListener,null);
}

function clean(str){
	for (var i = 0; i < str.length; i++) {
		if (str.charCodeAt(i) < 32) {
			str = str.slice(0, i) + str.slice(i + 1)
		}
	}
	return str
}

function parse_db (data) {
	var db = {
		'playlists': [],
		'dirs': [],
		'artists': [],
		'albums': [],
		'files': []
	}
	data = data.split("\n")
	var dl = data.length
	var pair, fld, val
	for (var i=0;i<dl;i++) {
		pair = data[i].split(": ", 2)
		if (pair.length == 2) {
			fld = pair[0]
			val = clean(pair[1])
			switch (fld) {
				case "file":
						var song = {
						'file': val,
						'Track': 0,
						'Time' : 0,
						'Title': val,
						'Artist': 'unknown',
						'Album': 'unknown'
					};
					do {
						if (i < dl) {
							i++;
							pair = data[i].split(": ", 2);
							if (pair.length == 2) {
								song[pair[0]] = clean(pair[1]);
							}
						}
					} while ((i+1) < dl && data[i+1].substr(0, 6) != "file: ");
					song['Time'] = hmsFromSec(song['Time']);
					db.files.push(song);
					break;
				case "directory": db.dirs.push(val); break;
				case "Artist": db.artists.push(val); break;
				case "Album": db.albums.push(val); break;
				case "playlist": db.playlists.push(val); break;
			}
		}
	}
	return db
}

function checkStatus() {
	doStatus = true
	var tm = 200
	if (!talker_active) {talker()}
	try {
		if (mpd.state == "stop") {
			tm = 600
		}
	} 
	catch (e) {
	}
	setTimeout("checkStatus()", tm)
}
function statusCallBack (data) {
	var pair, fld, val
	data = data.split("\n")
	for (line in data) {
		pair = data[line].split(": ", 2)
		if (pair.length == 2) {
			fld = pair[0]
			val = pair[1]
			try {
				if (val != mpd[fld]) {
					if (typeof(notify[fld]) == 'function') {
						notify[fld](val)
					}
				}
			} catch (e) {debug("notify '"+fld+"'="+val+" error: "+e)}
			mpd[fld] = val
		}
	}
	doStatus = false
}

function browse (loc) {
	var cb = function (data) {
		db = parse_db(data)
		alert(db.dirs[0])
		alert(db.files[0]['Title'])
	}
	command('lsinfo "'+loc+'"', cb)
}



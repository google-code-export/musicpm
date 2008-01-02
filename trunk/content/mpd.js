/**
 * @author cseickel
 */
var host = "192.168.1.2"
var port = 6600
var mpd
var status_command = "command_list_begin\nstatus\nstats\ncommand_list_end\n"
var queue = []
var talker_active = false
var doStatus = true

var transportService =
  Components.classes["@mozilla.org/network/socket-transport-service;1"]
    .getService(Components.interfaces.nsISocketTransportService);


function init_mpd () {
	if (typeof(mpd) != 'object') {
		mpd = {
			'volume': '0',
			'repeat': '0',
			'random': '0',
			'playlist': '0',
			'playlistlength': '0',
			'xfade': '0',
			'state': 'stop',
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
function parse(data)
{
	var result = {
		'volume': '0',
		'repeat': '0',
		'random': '0',
		'playlist': '0',
		'playlistlength': '0',
		'xfade': '0',
		'state': 'stop',
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
	if (data.substr(0, 3) == "ACK") {
		alert(data)
	}
	else {
		if (typeof(data) == "string") (data = data.split("\n"))
		for (line in data) {
			if (data[line].indexOf(": ") > 0) {
				var pair = data[line].split(": ")
				result[pair[0]] = clean(pair[1])
			}
		}
	}
	return result
}

function parse_db (data, filter) {
	if (typeof(filter) == 'undefined') {
		var filter = {
			'playlists': true,
			'dirs': true,
			'artists': true,
			'albums': true,
			'files': true
		}
	}
	var db = {
		'playlists': [],
		'dirs': [],
		'artists': [],
		'albums': [],
		'files': []
	}
	var pair
	data = data.split("\n")
	var dl = data.length
	for (var i=0;i<dl;i++) {
		if (data[i].indexOf(": ") > 0) {
			pair = data[i].split(": ")
			pair[1] = clean(pair[1])
			if (pair[0] == "file" && filter.files) {
				var song = {
					'file': pair[1],
					'Track': 0,
					'Time' : 0,
					'Title': pair[1],
					'Artist': 'unknown',
					'Album': 'unknown'
				}
				do {
					if (i < dl) {
						i++
						if (data[i].indexOf(": ") > 0) {
							pair = data[i].split(": ")
							song[pair[0]] = clean(pair[1])
						}
					}
				}
				while ((i+1) < dl && data[i+1].substr(0, 6) != "file: ")
				db.files.push(song)
			}
			else if (pair[0] == "directory" && filter.dirs) {
					db.dirs.push(pair[1])
			}
			else if (pair[0] == "playlist" && filter.playlists) {
					db.playlists.push(pair[1])
			}
			else if (pair[0] == "Artist" && filter.artists) {
					db.artists.push(pair[1])
			}
			else if (pair[0] == "Album" && filter.albums) {
					db.albums.push(pair[1])
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
function statusCallBack (rawdata) {
	data = parse(rawdata)
	if (data['volume'] != mpd['volume']) {setVol(data['volume'])}
	if (data['playlist'] != mpd['playlist']) {
		PL = new Array(parseInt(data['playlistlength']))
		playlist_view(PLmode)
	}		
	if (data['state'] != mpd['state']) {setState(data['state'])}	
	if (data['random'] != mpd['random']) {setRandom(data['random'])}	
	if (data['repeat'] != mpd['repeat']) {setRepeat(data['repeat'])}		
	if (data['state'] != "stop") {
		if (data['time'] != mpd['time']) {
			var t = data['time'].split(":")
			setTime(t[0], t[1])
		}
	}
	else {setTime(0, 0)}
	if (data['song'] != mpd['song']) {
		var id = data['song']
		var t = $('lbl_title')
		var a = $('lbl_artist')
		var b = $('lbl_album')
		if (typeof(PL[id]) == 'object') {
			if (t) {
				t.value = PL[id]['Title']
			}
			if (a) {
				a.value = PL[id]['Artist']
			}
			if (b) {
				b.value = PL[id]['Album']
			}
			getCover($("cur_album_art"), PL[id])
		}
		else {
			var cb = function(data){
				var db = parse_db(data)
				var song = db.files[0]
				var t = $('lbl_title')
				var a = $('lbl_artist')
				var b = $('lbl_album')
				if (t) {
					t.value = song['Title']
				}
				if (a) {
					a.value = song['Artist']
				}
				if (b) {
					b.value = song['Album']
				}
				getCover($("cur_album_art"), song)
			}
			command('playlistinfo ' + id, cb)
		}
		curSong = id
		centerPL()
	}
	if (data['db_update'] != mpd['db_update']) {setColDB(data['db_update'])}
	mpd = data
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

function plinfo (pos) {
	var cb = function (data) {
		db = parse_db(data)
		PL[pos] = db.files[0]
		PL[pos]['Time'] = hmsFromSec(PL[pos]['Time'])
		var boxobject = $('playlist').boxObject;
	    boxobject.QueryInterface(Components.interfaces.nsITreeBoxObject);
		if (PLmode == "extended") {
			pos = parseInt(pos) * 3
			boxobject.invalidateRow(pos);
			boxobject.invalidateRow(pos + 1);
			boxobject.invalidateRow(pos + 2);
		}
		else {
			boxobject.invalidateRow(parseInt(pos));
		}
	}
	command('playlistinfo '+pos, cb)
}


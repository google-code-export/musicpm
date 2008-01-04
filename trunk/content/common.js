var base='http://192.168.1.4:8081'
var NS = "http://webamp2"
var dbVersion = 0
var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].
                   getService(Components.interfaces.nsIRDFService);
var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
						.getService(Components.interfaces.nsIConsoleService);
var rdf_name = rdfService.GetResource("mpd_Name")
var rdf_title = rdfService.GetResource("mpd_Title")
var rdf_artist = rdfService.GetResource("mpd_Artist")
var rdf_album = rdfService.GetResource("mpd_Album")
var rdf_time = rdfService.GetResource("mpd_Time")

var art = []
var db_ds = {}
var playlists_ds
var content_ds

var volTmr = false
var seekTmr = false
var seekMax = 0
var noEchoVol = 0
var noEchoSeek = 0
var convertPercent = true
var isLoaded = false
var infoBrowser

function $(e) {return document.getElementById(e)}
function debug(s) {consoleService.logStringMessage(s)}

//send a command with callback on completion
function sendCB(url, callBack){
  var send = new XMLHttpRequest()
  send.open("GET", url, true)
  send.onreadystatechange = function() {
    if (send.readyState == 4) {
        if (send.status == 200) {callBack(send.responseText)}
        else {debug("Error sending command to "+base+url)}
          }
    }
  send.send("")
  }
function safe_eval(s){
    var regexp = /^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/
    var s_test = s.replace(/\\./g, '@')
                 .replace(/"[^"\\\n\r]*"/g, '')
                 .replace(/'[^'\\\n\r]*'/g, '')
    if (regexp.test(s_test)) {
		return eval(s)
	}
	else {return "UNSAFE DATA"}
}

//get data
function get(url, callBack){
  var send = new XMLHttpRequest()
  send.open("GET", url, true)
  send.onreadystatechange = function() {
    if (send.readyState == 4) {
        if (send.status == 200) {
            callBack(safe_eval(send.responseText))
			}
        else {debug("Error sending command to "+base+url)}
          }
    }
  send.send("")
  }
  
function createURLranges(lst) {
    if (lst.length <= 0) {return ""}
    var ids = lst[0]
    var at = "id"
    for (var i=1;i<lst.length;i++){
        if ((lst[i]-1) != lst[i-1]){ //It's not the next in a sequence.
            switch(at){
                case "id": ids += "and"+lst[i]; break;
                case "to": ids += "to"+lst[i-1]+"and"+lst[i]; at = "id"; break;
                default:  break;
                }
            }
        else { //It is the next in a sequence
            if(at=="id") {
                at = "to"
                }
            }
        }
    if (at == "to") {ids += "to"+lst[lst.length-1]}
    return ids
    }

function getSong(id) {
    var song = {'name':'','title':'','artist':'','album':'','time':'','id':id}
    var node = rdfService.GetResource("http://webamp2/song/"+id)

    var target = files_ds.GetTarget(node, rdf_name, true);
    if (target instanceof Components.interfaces.nsIRDFLiteral){
        song['name'] = target.Value;
        }
    if (song['name']=='') {return id}

    target = files_ds.GetTarget(node, rdf_title, true);
    if (target instanceof Components.interfaces.nsIRDFLiteral){
        song['title'] = target.Value;
        }
    target = files_ds.GetTarget(node, rdf_artist, true);
    if (target instanceof Components.interfaces.nsIRDFLiteral){
        song['artist'] = target.Value;
        }
    target = files_ds.GetTarget(node, rdf_album, true);
    if (target instanceof Components.interfaces.nsIRDFLiteral){
        song['album'] = target.Value;
        }
    target = files_ds.GetTarget(node, rdf_time, true);
    if (target instanceof Components.interfaces.nsIRDFLiteral){
        song['time'] = target.Value;
        }
    if (song['title']==''){song['title']=song['name']}
    return song
    }
function openURL(url, attrName) {
  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
           .getService(Components.interfaces.nsIWindowMediator);
  for (var found = false, index = 0, browserInstance = wm.getEnumerator('navigator:browser').getNext().getBrowser();
       index < browserInstance.mTabContainer.childNodes.length && !found;
       index++) {
    // Get the next tab
    var currentTab = browserInstance.mTabContainer.childNodes[index];
    // Does this tab contain our custom attribute?
    if (currentTab.hasAttribute(attrName)) {
      // Yes--select and focus it.
      browserInstance.selectedTab = currentTab;
      // Focus *this* browser in case another one is currently focused
      browserInstance.focus();
      browserInstance.loadURI(url)
      found = true;
    }
  }

  if (!found) {
    // Our tab isn't open. Open it now.
    var browserEnumerator = wm.getEnumerator("navigator:browser");
    var browserInstance = browserEnumerator.getNext().getBrowser();
    // Create tab
    var newTab = browserInstance.addTab(url);
    newTab.setAttribute(attrName, "xyz");
    // Focus tab
    browserInstance.selectedTab = newTab;
    // Focus *this* browser in case another one is currently focused
    browserInstance.focus();
  }
}

function google(id, type){
    id = encodeURI(id)
    var url = "http://www.google.com/musicsearch?q="+id+"&ie=UTF-8&oe=UTF-8"
    openURL(url, "wa2_infoBrowser")
}

function lyricsfreak(id, type){
    id = encodeURI(id)
    switch (type){
        case "file": var url = "http://www.lyricsfreak.com/search.php?type=title&q="+id;break
        case "album": var url = "http://www.lyricsfreak.com/search.php?type=album&q="+id;break
        case "artist": var url = "http://www.lyricsfreak.com/search.php?type=artist&q="+id;break
    }
    openURL(url, "wa2_infoBrowser")
}

function parseRDFString(str, url){
    var memoryDS = Components.classes["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"]
                     .createInstance(Components.interfaces.nsIRDFDataSource); 
    var ios=Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService);
    baseUri=ios.newURI(url,null,null);
    var parser=Components.classes["@mozilla.org/rdf/xml-parser;1"]
                         .createInstance(Components.interfaces.nsIRDFXMLParser);
    parser.parseString(memoryDS,baseUri,str);
    return memoryDS;
    }

function xmlEscape (s) {
	if (!s) {return ''}
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g,"&quot;")
}
function dbRDF(items, about, filter){
	var name = ""
    var rdfString ='<RDF:RDF xmlns:RDF="http://www.w3.org/1999/02/22-rdf-syntax-ns#" \n' +
					'    xmlns:s="mpd_"\n' +
					'    xmlns:nc="http://home.netscape.com/NC-rdf#">\n\n'
	var rdfSeq = ' <RDF:Seq about="'+about+'">\n'
    for (x in items){
		var item = items[x]
		if (filter[item.type]) {
		    rdfString += ' <RDF:Description about="mpd://'+item.type+'/'+x+'">\n'
			for (p in items[x]) {
				rdfString += '   <s:'+p+'>'+xmlEscape(item[p])+'</s:'+p+'>\n'
			}
			rdfString += ' </RDF:Description>\n'
		    rdfSeq += '  <RDF:li resource="mpd://'+item.type+'/'+x+'"/>\n'
		}
    }
    var rdf = rdfString + rdfSeq + '</RDF:Seq></RDF:RDF>'
	return parseRDFString(rdf, about+"/temp")
}

function doPrev() {command("previous", null)}
function doStop() {command("stop", null)}
function doPlay() {
	if (mpd.state == "stop") {
		command("play", null)
	}
	else {
		command("pause", null)
	}
}
function doNext() {command("next", null)}
function updateMe() {window.location=base+"/webamp2xul"}

function _clean (item) {
    var s = item.indexOf("(",0)
    if (s > 0) {
        e = item.indexOf(")", s)
        if (e < 0) {
			e = s
		}
        item = item.slice(0, s-1) + item.slice(e+1)
	}
    item = item.replace(/&/g,"and").replace(/!/g,"").replace(/\?/g,"")
    item = item.replace(/\./g,"").replace(/:/g,"").replace(/;/g,"").replace(/'/g,"")
    item = item.replace(/"/g,"").replace(/,/g," ").replace(/ - /g," ")
    item = item.replace(/-/g," ")
    item = encodeURI(item)
    return item
}
function getCover(elem, song) {
	elem.src = "chrome://webamp2/content/album_blank.png"
    var data = ""
    var asin = ""
    var artist = _clean(song['Artist'])
    var album = _clean(song['Album'])
    var search_url = "http://musicbrainz.org/ws/1/release/?type=xml&artist="+artist+"&title="+album+"&limit=1"
	
	if (typeof(art[search_url]) == 'string') {
		elem.src = art[search_url]
	}
	else {
		art[search_url] = "chrome://webamp2/content/album_blank.png"
		var cb = function(data){
			if (data != "") {
				var s = data.indexOf("<asin>") + 6
				if (s > 6) {
					var e = data.indexOf("</asin>", s)
					if (e > 0) {
						asin = data.slice(s, e)
					}
					if (asin.length == 10) {
						base = "http://images.amazon.com/images/P/" + asin
						art[search_url] = base + ".01.MZZZZZZZ.jpg"
						elem.src = base + ".01.MZZZZZZZ.jpg"
					}
				}
			}
		}
		sendCB(search_url, cb)
	}
}

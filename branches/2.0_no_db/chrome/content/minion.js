Components.utils.import("resource://minion/mpd.js");
Components.utils.import("resource://minion/trees.js");

function init () {
    if(!mpd._socket) mpd.connect()
}

function setFavicon (url) {
    var link = document.createElementNS("http://www.w3.org/1999/xhtml","link");
    link.id = "mpm_favicon"
    link.type = "image/x-icon";
    link.rel = "shortcut icon";
    link.href = url;
    var el = document.getElementById("mpm_favicon")
    var win = document.getElementById("main")
    win.removeChild(el)
    win.appendChild(link)
    el = null
}

function showPlaylists () {
    var list = document.getElementById("savedPlaylists")
    if (list.collapsed == false) {
        list.collapsed = true
        document.getElementById("playlist_splitter").collapsed = true
        return null
    }
    list.collapsed = false
    document.getElementById("playlist_splitter").collapsed = false
    mpd.doCmd('lsinfo', function(data){
        try {
            data = data.replace(/(directory:.+\n|file:.+\n)|(playlist: )/g, "").split("\n")
            var db = []
            for (x in data) {
                if (data[x].length > 0) {
                    db.push({
                        type: 'playlist',
                        Title: data[x]
                    })
                }
            }
            list.view = new arrayView(db)
        }
        catch (e) {
            debug(e)
        }
    }, false)

}

function loadPlaylist(name) {
    var c = "command_list_begin\n" +
            "clear\n" +
            'load  "' + name.replace(/"/g, '\\"') + '"\n' +
            "command_list_end"
    mpd.doCmd(c)
    document.getElementById("playlistName").value = name
    document.getElementById("savedPlaylists").collapsed = true
    document.getElementById("playlist_splitter").collapsed = true
}

function savePlaylist () {
    var name = document.getElementById("playlistName").value
    if (name == "") return null
    mpd.doCmd('save "' + name.replace(/"/g, '\\"') + '"')

}

function prepareOutputs () {
    var popup = document.getElementById("outputsPopup")
    var buildMenu = function (outputs) {
        while (popup.hasChildNodes()) { popup.removeChild(popup.firstChild) }
        var NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
        var len = outputs.length
        for (var i=0;i<len;i++) {
            var item = document.createElementNS(NS, "menuitem")
            item.setAttribute("type", "checkbox")
            item.setAttribute("value", outputs[i].id)
            item.setAttribute("label", outputs[i].name)
            if (outputs[i].enabled) item.setAttribute("checked", true)
            item.onclick = function () {
                var cmd = (this.hasAttribute("checked")) ? "enable" : "disable";
                debug(cmd)
                mpd.doCmd(cmd+"output "+this.value);
            }
            popup.appendChild(item)
        }
    }
    mpd.getOutputs(buildMenu)
}

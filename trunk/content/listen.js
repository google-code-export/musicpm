var serverSocket = Components.classes["@mozilla.org/network/server-socket;1"]
                     .createInstance(Components.interfaces.nsIServerSocket);

serverSocket.init(8008,false,-1);
serverSocket.asyncListen(listener);

var listener = {
    onSocketAccepted : function(serverSocket, transport){
        alert(transport)
        var stream = transport.openOutputStream(0,0,0);
        stream.write("OK",2);
        stream.close();
        },
    
    onStopListening : function(serverSocket, status){}
    };
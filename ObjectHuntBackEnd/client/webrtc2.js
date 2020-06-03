const WS_PORT = 8443; //make sure this matches the port for the webscokets server

var localUuid;
var localDisplayName;
var localStream;
var serverConnection;
var peerConnections = {}; // key is uuid, values are peer connection object and user defined display name string


var urlParams = new URLSearchParams(window.location.search);
var roomUUID = urlParams.get("roomId");

var peerConnectionConfig = {
  iceServers: [
    { urls: "stun:stun.stunprotocol.org:3478" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};


function start() {
  localDisplayName =
    urlParams.get("displayName") || prompt("Enter your name", "");
  document
    .getElementById("localVideoContainer")
    .appendChild(makeLabel(localDisplayName));

  // specify no audio for user media
  var constraints = {
    video: {
      width: { max: 320 },
      height: { max: 240 },
      frameRate: { max: 24 },
    },
    audio: true,
  };
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        localStream = stream;
        document.getElementById("localVideo").srcObject = stream;
      })
      .catch(errorHandler)
      .then(()=>{
        serverConnection = new WebSocket(
          "wss://" + window.location.hostname + ":" + WS_PORT
        );
        serverConnection.onmessage = gotMessageFromServer;
        serverConnection.onopen = (event) => {
          serverConnection.send(
            JSON.stringify({
              eventName:'selfSetup',
              data: {
                roomId: roomUUID,
                displayName: localDisplayName,
              }
            })
          );
        };

      })
      // set up websocket and message all existing clients
      .then(() => {
      })
      .catch(errorHandler);
  } else {
    alert("Your browser does not support getUserMedia API");
  }

}

function gotMessageFromServer(message) {
  var signal = JSON.parse(message.data);
  console.log(signal);
  switch(signal.eventName){
    case 'selfSetup':
      localUuid = signal.data.user.uuid;
      roomUUID = signal.data.user.room;
      
      serverConnection.send(
        JSON.stringify({
          eventName:'p2pAction',
          data: {
            uuid: localUuid,
            roomId: roomUUID,
            displayName: localDisplayName,
            dest: "all",
          }
        })
      );
      break;
    case 'p2pAction':
      var peerUuid = signal.data.uuid;
      if (peerUuid == localUuid || (signal.data.dest != localUuid && signal.data.dest != "all")){ 
        break;
      }
      if (signal.data.displayName && signal.data.dest == "all") {
        console.log("here1");
        // set up peer connection object for a newcomer peer
        setUpPeer(peerUuid, signal.data.displayName);
        serverConnection.send(
          JSON.stringify({
            eventName:'p2pAction',
            data: {
              displayName: localDisplayName,
              uuid: localUuid,
              dest: peerUuid,
            }
          })
        );
      } else if (signal.data.displayName && signal.data.dest == localUuid) {
        console.log("here2");
        // initiate call if we are the newcomer peer
        setUpPeer(peerUuid, signal.data.displayName, true);
      } else if (signal.data.sdp) {
        console.log("here3");
        peerConnections[peerUuid].pc
          .setRemoteDescription(new RTCSessionDescription(signal.data.sdp))
          .then(function () {
            // Only create answers in response to offers
            if (signal.data.sdp.type == "offer") {
              peerConnections[peerUuid].pc
                .createAnswer()
                .then((description) => createdDescription(description, peerUuid))
                .catch(errorHandler);
            }
          })
          .catch(errorHandler);
      } else if (signal.data.ice) {
        console.log("here4");

        peerConnections[peerUuid].pc
          .addIceCandidate(new RTCIceCandidate(signal.data.ice))
          .catch(errorHandler);
      }    
      break;
    default:
      break;
  }
}

function makeLabel(label) {
  var vidLabel = document.createElement("div");
  vidLabel.appendChild(document.createTextNode(label));
  vidLabel.setAttribute("class", "videoLabel");
  return vidLabel;
}

function errorHandler(error) {
  console.log(error);
}

function setUpPeer(peerUuid, displayName, initCall = false) {
  peerConnections[peerUuid] = {
    displayName: displayName,
    pc: new RTCPeerConnection(peerConnectionConfig),
  };
  peerConnections[peerUuid].pc.onicecandidate = (event) =>
    gotIceCandidate(event, peerUuid);
  peerConnections[peerUuid].pc.ontrack = (event) =>
    gotRemoteStream(event, peerUuid);
  peerConnections[peerUuid].pc.oniceconnectionstatechange = (event) =>
    checkPeerDisconnect(event, peerUuid);
  peerConnections[peerUuid].pc.addStream(localStream);

  if (initCall) {
    peerConnections[peerUuid].pc
      .createOffer()
      .then((description) => createdDescription(description, peerUuid))
      .catch(errorHandler);
  }
}

function gotIceCandidate(event, peerUuid) {
  if (event.candidate != null) {
    serverConnection.send(
      JSON.stringify({ 
        eventName:'p2pAction',
        data:{
          ice: event.candidate, 
          uuid: localUuid, 
          dest: peerUuid
        } 
      })
    );
  }
}

function createdDescription(description, peerUuid) {
  console.log(`got description, peer ${peerUuid}`);
  peerConnections[peerUuid].pc
    .setLocalDescription(description)
    .then(function () {
      serverConnection.send(
        JSON.stringify({
          eventName: 'p2pAction',
          data: {
            sdp: peerConnections[peerUuid].pc.localDescription,
            uuid: localUuid,
            dest: peerUuid,
          }
        })
      );
    })
    .catch(errorHandler);
}

function gotRemoteStream(event, peerUuid) {
  var element = document.getElementById("remoteVideo_" + peerUuid);
  if(element === null){
    console.log(`got remote stream, peer ${peerUuid}`);
    //assign stream to new HTML video element
    var vidElement = document.createElement("video");
    vidElement.setAttribute("autoplay", "");
    vidElement.setAttribute("muted", "");
    vidElement.srcObject = event.streams[0];

    var vidContainer = document.createElement("div");
    vidContainer.setAttribute("id", "remoteVideo_" + peerUuid);
    vidContainer.setAttribute("class", "videoContainer");
    vidContainer.appendChild(vidElement);
    vidContainer.appendChild(makeLabel(peerConnections[peerUuid].displayName));


    document.getElementById("videos").appendChild(vidContainer);

    updateLayout();
  }
}

function checkPeerDisconnect(event, peerUuid) {
  var state = peerConnections[peerUuid].pc.iceConnectionState;
  console.log(`connection with peer ${peerUuid} ${state}`);
  if (state === "failed" || state === "closed" || state === "disconnected") {
    delete peerConnections[peerUuid];
    document
      .getElementById("videos")
      .removeChild(document.getElementById("remoteVideo_" + peerUuid));
    updateLayout();
  }
}

function updateLayout() {
  // update CSS grid based on number of diplayed videos
  var rowHeight = "98vh";
  var colWidth = "98vw";

  var numVideos = Object.keys(peerConnections).length + 1; // add one to include local video

  if (numVideos > 1 && numVideos <= 4) {
    // 2x2 grid
    rowHeight = "48vh";
    colWidth = "48vw";
  } else if (numVideos > 4) {
    // 3x3 grid
    rowHeight = "32vh";
    colWidth = "32vw";
  }

  document.documentElement.style.setProperty(`--rowHeight`, rowHeight);
  document.documentElement.style.setProperty(`--colWidth`, colWidth);
}


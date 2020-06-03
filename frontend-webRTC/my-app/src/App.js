import React, { Component } from "react";
import { w3cwebsocket as W3CWebSocket } from "websocket";
import Players from "./components/Players";
import Word from "./components/Word";
import "./App.css";
import VideoFeed from "./components/VideoFeed";
import logo from './logo.png'; // with import
// eslint-disable-next-line
import * as tf from '@tensorflow/tfjs'; 
import * as cocoSsd  from '@tensorflow-models/coco-ssd';


class App extends Component {  
  constructor(props){
    super(props);
    this.localVideoRef = React.createRef();
    this.canvasRef = React.createRef();
    this.localStream = '';
    this.peerConnections = [];
    this.peerConnectionConfig = {
      iceServers: [
        { urls: "stun:stun.stunprotocol.org:3478" },
        { urls: "stun:stun.l.google.com:19302" },
      ],
    };
    this.model = '';

    this.client = new W3CWebSocket('wss://taskbit.net:8443');

    this.sendPrediction = false;
    this.hasStream = [];
  }
  componentWillMount(){
      let hash = window.location.hash.replace("#",'');   
      if(hash.split("=")[0] === "roomId"){
        let me = this.state.me;
        me.roomId = hash.split("=")[1];
        this.setState({me: me})
      }
    (async ()=>{
      this.model = await cocoSsd.load();
      this.setState({loading_model:false});
    })()

  }

  state = {
    me:{
      uuid: '',
      username: '',
      roomId: '',
      host: false,
    },
    loading_model: true,
    login: true,
    game: {
      status: false,
      gameData: {
        word: '',
      },
    },
    players: [
    ],
    peerConnections: [],
    videoFeeds: [],
    notification: '',
    countDownSeconds: 3,
  };


  constraints = {
    video: {
      width: { max: 320 },
      height: { max: 240 },
      frameRate: { max: 24 },
    },
    audio: true,
  };

  
  updateWord = (word) => {
    let currentGame = this.state.game;
    currentGame.gameData.word = word;
    this.setState({
      game: currentGame,
    });
  };

  addUser = (player) => {
    this.setState({ players: [...this.state.players, player] });
  };

  addVideoFeed = (videoFeed) => {
    this.setState({videoFeeds: [...this.state.videoFeeds, videoFeed]});
  }
  onUserWinner = (obj) =>{
    this.sendPrediction = false;

    let game = this.state.game;
    let players = this.state.players;
    let player = players.find((player)=>{
      return (player.id === obj.data.user.uuid);
    })
    
    this.setState({notification: `${player.name} wins`});
    player.score = obj.data.user.score;
    if(player.score < 10){
      this.countDown = setInterval(()=>{
        const {countDownSeconds} = this.state;

        if(countDownSeconds > 0){
          this.setState({
            countDownSeconds: countDownSeconds-1,
            notification: countDownSeconds
          });
        } else {
          game.gameData.word = obj.data.game.word;
          this.setState({countDownSeconds: 3, notification: ''});
          this.setState({players: players, game: game});
          this.sendPrediction = true;
          clearInterval(this.countDown);
        }

      },1000);
   } else {
    this.sendPrediction = true;
   }

  }

  onUserConnected = (obj) => {
    let userAdd = {
      id: obj.data.user.uuid,
      name: obj.data.user.username,
      score: obj.data.user.score,
    };
    this.addUser(userAdd);
  }
  
  onUserDisconnect = (obj) =>{
    if(typeof obj.data.newHost !== 'undefined'){
      if(obj.data.newHost.uuid === this.state.me.uuid){
        let me = this.state.me;
        me.host = true;
        this.setState({me: me});
      }
    }
    let players = this.state.players;
    players = players.filter((ele)=>{ return ele.id !== obj.data.user.uuid; });
    this.setState({players: players});
  }
  onFOGameOver = (obj) => {
    let game = this.state.game;
    game.status = false;
    this.setState({
      game: game,
      notification: `${obj.data.user.username} won`
    });

    
  }
  onFOUpdateData = (obj) =>{
    let currentGame = this.state.game;
    currentGame.status = obj.data.game.status;
    this.setState({game:currentGame});
    this.updateWord(obj.data.gameData.game.word);
    let players = this.state.players;
    if(obj.data.game.shouldResetScores){
      players.map((player)=>{
        player.score = 0;
        return player;
      });
    }
  }
  onFOStart = (obj) =>{
    console.log("Resetting");
    this.setState({notification: ''});
    let players = this.state.players;
    players.map((player)=>{
      player.score = 0;
      return player;
    });
    this.setState({players: players});
  }
  
  componentDidMount(){
    this.client.onopen = () => {
      console.log('WebSocket Client Connected');
    };
    this.client.onmessage = (message) => {
      let obj = JSON.parse(message.data);
      console.log(obj);
      switch(obj.eventName){
        case "selfSetup":
          this.setState({
            me:
            {
              uuid: obj.data.user.uuid,
              username: obj.data.user.username,
              roomId: obj.data.user.room,
              host: (obj.data.user.role === "HOST")? true: false,
            }
          })
          console.log(obj.data.user.room);
          let game = this.state.game;
          if(typeof obj.data.user.game !== 'undefined'){
            game.status = obj.data.user.game.status
            game.gameData.word = obj.data.user.game.word;
          }
          this.setState({game: game});
          obj.data.users.forEach(element => {
            let userAdd = {
              id: element.uuid,
              name: element.username,
              score: element.score,
            };
            this.addUser(userAdd);
          });    
          break;
        case 'FOStart':
          this.onFOStart(obj);
          break;
        case 'FOUpdateData':
          this.onFOUpdateData(obj);
          break;
        case 'FOGameOver':
          this.onFOGameOver(obj);
          break;
        case 'userWinner':
          this.onUserWinner(obj);
          break;
        case 'userConnected':
            this.onUserConnected(obj);
            break;
        case 'userDisconnect':
          this.onUserDisconnect(obj);
          break;
        case 'p2pAction':
            var peerUuid = obj.data.uuid;
            if (peerUuid === this.state.me.uuid || (obj.data.dest !== this.state.me.uuid && obj.data.dest !== "all")){ 
              break;
            }
            
            if (obj.data.displayName && obj.data.dest === "all") {
              // set up peer connection object for a newcomer peer
              this.setUpPeer(peerUuid, obj.data.displayName);
              this.client.send(
                JSON.stringify({
                  eventName:'p2pAction',
                  data: {
                    displayName: this.state.me.username,
                    uuid: this.state.me.uuid,
                    dest: peerUuid,
                  }
                })
              );
            } else if (obj.data.displayName && obj.data.dest === this.state.me.uuid) {
              // initiate call if we are the newcomer peer
              this.setUpPeer(peerUuid, obj.data.displayName, true);
            } else if (obj.data.sdp) {
              this.peerConnections[peerUuid].pc
                .setRemoteDescription(new RTCSessionDescription(obj.data.sdp))
                .then(() => {
                  // Only create answers in response to offers
                  if (obj.data.sdp.type === "offer") {
                    this.peerConnections[peerUuid].pc
                      .createAnswer()
                      .then((description) => this.createdDescription(description, peerUuid))
                      .catch(this.errorHandler);
                  }
                })
                .catch(this.errorHandler);
            } else if (obj.data.ice) {
              this.peerConnections[peerUuid].pc
                .addIceCandidate(new RTCIceCandidate(obj.data.ice))
                .catch(this.errorHandler);
            }    
            break;      
        default:
          break;
      }
    };
    this.predict();

  }
  
  predict = async ()=>{
    if(this.state.game.status && this.sendPrediction){

    let video = this.localVideoRef.current;
    let canvas = this.canvasRef.current;
    let context = canvas.getContext('2d');

    let ratio = video.videoWidth / video.videoHeight;
    let w = video.videoWidth - 100;
    let h = parseInt(w / ratio, 10);
    canvas.width = w;
    canvas.height = h;
    context.fillRect(0, 0, w, h);
    context.drawImage(video, 0, 0, w, h);
    await this.model.detect(canvas).then(predictions=>{
        if(this.state.me.uuid !== undefined && predictions.length > 0 && this.sendPrediction){
          let data = {
            eventName: 'userPrediction',
            data: predictions
          };
          this.client.send(JSON.stringify(data));
        }
        requestAnimationFrame(this.predict);
    });
    
    }else{
      requestAnimationFrame(this.predict);
    }
  }

  gotIceCandidate = (event, peerUuid) =>{
    if (event.candidate != null) {
      this.client.send(
        JSON.stringify({ 
          eventName:'p2pAction',
          data:{
            ice: event.candidate, 
            uuid: this.state.me.uuid, 
            dest: peerUuid
          } 
        })
      );
    }
  }
  
  setUpPeer = (peerUuid, displayName, initCall = false) => {
    this.peerConnections[peerUuid] = {
      displayName: displayName,
      pc: new RTCPeerConnection(this.peerConnectionConfig),
    };
    this.peerConnections[peerUuid].pc.onicecandidate = (event) =>
      this.gotIceCandidate(event, peerUuid);
    this.peerConnections[peerUuid].pc.ontrack = (event) =>
      this.gotRemoteStream(event, peerUuid);
    this.peerConnections[peerUuid].pc.oniceconnectionstatechange = (event) =>
      this.checkPeerDisconnect(event, peerUuid);
    this.peerConnections[peerUuid].pc.addStream(this.localStream);
  
    if (initCall) {
      this.peerConnections[peerUuid].pc
        .createOffer()
        .then((description) => this.createdDescription(description, peerUuid))
        .catch(this.errorHandler);
    }
  }

  errorHandler = (err) =>{
    console.log(err);
  }
  
  checkPeerDisconnect = (event, peerUuid)=> {
    var states = this.peerConnections[peerUuid].pc.iceConnectionState;
    console.log(`connection with peer ${peerUuid} ${states}`);
    if (states === "failed" || states === "closed" || states === "disconnected") {
      delete this.peerConnections[peerUuid];
      let videoFeeds = this.state.videoFeeds;
      videoFeeds = videoFeeds.filter((ele)=>{ return ele.peerUUID !== peerUuid; });
      this.setState({videoFeeds: videoFeeds});
      // document
      //   .getElementById("videos")
      //   .removeChild(document.getElementById("remoteVideo_" + peerUuid));
      // updateLayout();
    }
  }
  
  connectToSocket = () => {
    const {me} = this.state;
    let data = {
      eventName: 'selfSetup',
      data: {
        roomId: me.roomId,
        displayName: me.username,
      }
    };
    this.client.send(JSON.stringify(data));  
  }

  gotRemoteStream = (event, peerUuid) => {
    console.log(event);
    if(event.track.kind === "video"){
    console.log(`got remote stream, peer ${peerUuid}`);
    let streamRef = React.createRef();
    let videoFeed = {
      ref: streamRef,
      stream: event.streams[0],
      peerUUID: peerUuid,
    }
    this.addVideoFeed(videoFeed);
  }

}
  

  onLogin = (e) => {
    const {me} = this.state;
    if(me.username !== ''){
      this.setState({login:false});
      this.connectToSocket();

      navigator.mediaDevices
      .getUserMedia(this.constraints)
      .then((stream) => {
        this.localStream = stream;
        this.localVideoRef.current.srcObject = this.localStream;
        this.sendPrediction = true;
      })
      .catch(this.errorHandler)
      .then(()=>{
        this.client.send(
          JSON.stringify({
            eventName:'p2pAction',
            data: {
              uuid: this.state.me.uuid,
              roomId: this.state.me.roomId,
              displayName: this.state.me.username,
              dest: "all",
            }
          })
        );
      })
  }

  }
  onUsernameUpdate = (e) =>{
    let me = this.state.me;
    me.username = e.target.value;
    this.setState({me: me});
  }
  startGame = (e) => {
    // this.setState({notification: ''});
    // let players = this.state.players;
    // players.map((player)=>{
    //   player.score = 0;
    //   return player;
    // });
    // this.setState({players: players});
    let data = {
      eventName: 'FOStart',
      data: {
      }
    };
    this.client.send(JSON.stringify(data));
  }
  updatePredict = (e) =>{
    this.setState({predict: e.target.value});
  }
  sendPredict = (e) =>{
    let data = {
      eventName: 'userPrediction',
      data: [{class:this.state.predict, percentage:1}]
    };
    this.client.send(JSON.stringify(data));
  }


 createdDescription = (description, peerUuid) => {
    console.log(`got description, peer ${peerUuid}`);
    this.peerConnections[peerUuid].pc
      .setLocalDescription(description)
      .then(() => {
        this.client.send(
          JSON.stringify({
            eventName: 'p2pAction',
            data: {
              sdp: this.peerConnections[peerUuid].pc.localDescription,
              uuid: this.state.me.uuid,
              dest: peerUuid,
            }
          })
        );
      })
      .catch(this.errorHandler);
  }

  render() {
    const { loading_model, login, players, game, me } = this.state;
    let page;
    if(loading_model){
      page = <div style={{color:'#000000'}}>Loading Tensorflow model</div>;
    }
    else if(login){
      page = <div className="App" style={{marginTop:'15%'}}>
        <img alt="logo" src={logo} style={{width:'480px', marginBottom: '30px'}}/>
        <div style={{width:'725px', margin:'0 auto'}}>Welcome to the MediaMonks LABs stand-alone webRTC Object Hunt. This game uses Tensorflow’s object recognition model to detect objects that players are holding in their hands. When the game calls out for an object, the players are asked to run around the house and find that object as quickly as they can. By showing the object to the webcam first, you win a point. When you score 10 points in total, you win the game.<br/>
To start playing, please input your name and press enter. Once you enter the room, click the button labeled “COPY LINK”, send that copied link to the friends you want to play with and push start to play.
<br/>We hope you enjoy it!
        </div>
        <input style={{marginTop:'44px'}} type="text" placeholder="username" name="username" onChange={this.onUsernameUpdate} />
        <input type="submit" value="connect" onClick={this.onLogin}/>
      </div>;
    }else{
      page = <div className="App">
        <canvas ref={this.canvasRef} style={{
          width:'1px',
        }}/>
        <VideoFeed videoRef={this.localVideoRef} videoFeeds={this.state.videoFeeds}/>
        <Players players={players} />
        <div className="countdown">
            <div id="counter">{this.state.notification}</div>
        </div>
        {/* <div style={{position:"absolute", top:"80%", zIndex: 1}}>
        <input placeholder="item" onChange={this.updatePredict}/>
        <input type="submit" value="send" onClick={this.sendPredict}/>
        </div> */}
        <div className="-bottom-">
          {game.status && <Word game={game}/>}
          {me.host && !game.status &&
              <div className="btn-function">
                  <button className="startGame-btn" onClick={this.startGame}>START</button>
              </div>
          }
          <button style={{position:'absolute', bottom: 0}} onClick={()=>{navigator.clipboard.writeText(`https://taskbit.net/#roomId=${this.state.me.roomId}`)}}>COPY LINK</button>
        </div>

      </div>;
    }
    return (
      <React.Fragment>
      {page}
      </React.Fragment>
    );
  }
}

export default App;

import * as config from './constants/serverConfig';
import * as fs from 'fs';
import * as WebSocket from 'ws';
import { WebServer } from './WebServer';
import { socketEvents } from './constants/socketEvents';
import { ISetupUser, IMessage,  } from './constants/socketTypes';
import { ROLES  } from './constants/userConstants';
import { User } from './User';
import { Room } from './Room';
import { FindObject } from './games/FindObject';
import { FindObjectEvents, IFOPrediction } from './constants/games/findObject';


export class WebRTCServer {
  private wss: WebSocket.Server;
  private rooms: Room[];

  constructor(webServer: WebServer) {
    this.rooms = [];
    this.wss = new WebSocket.Server({ server: webServer.getHttpsServer() });

    this.wss.on(socketEvents.CONNECTION, (ws: WebSocket) => {
      console.log('on connection');
      const broadcast = (room: Room, data: any) => {
        this.wss.clients.forEach(client => {
          if(room === client.room && client.user.getId() !== ws.user.getId() && client.readyState === WebSocket.OPEN){
            client.send(data);
          }
        });
      }
      const broadcastRoom = (room: Room, data: any) => {
        this.wss.clients.forEach(client => {
          if(room === client.room && client.readyState === WebSocket.OPEN){
            client.send(data);
          }
        });
      }

      ws.on(socketEvents.MESSAGE, (data: any) => {
        console.log('on message');
        let obj: IMessage = JSON.parse(data);

        switch(obj.eventName){
          case socketEvents.SELF_SETUP:
            let user: User = this.setupUser(ws, obj.data);
            ws.user = user;
            let users: object[] = [];

            [...user.getRoom().getUsers()].forEach(user => {
              let currentUser = {
                username: user.getName(),
                uuid: user.getId(),
                role: user.getRole(),
                score: user.getScore(),
              };
              users = [...users, currentUser];
            });
            let newUser = {
              username: user.getName(),
              uuid: user.getId(),
              role: user.getRole(),
              score: user.getScore(),
            };
            let resp : IMessage = {
              eventName: socketEvents.SELF_SETUP,
              data: {
                user: {
                  username: user.getName(),
                  uuid: user.getId(),
                  role: user.getRole(),
                  room: user.getRoom().getId(),
                  game: user.getRoom().getGame(),
                  score: user.getScore(),
                },
                users: users
              }
            }

            let newUserResp: IMessage = {
              eventName: socketEvents.USER_CONNECTED,
              data: {
                user: newUser
              }
            };
            ws.send(JSON.stringify(resp));
            broadcast(ws.room, JSON.stringify(newUserResp));
            break;
          case socketEvents.P2PACTION:
            broadcast(ws.room, JSON.stringify(obj));
            break;
          case FindObjectEvents.START:
            let foGame: FindObject = new FindObject();
            foGame.setupGame(ws);
            let gameData: any = foGame.updateClient();
            let data: IMessage = {
              eventName: FindObjectEvents.UPDATE_DATA,
              data: {
                game:{
                  status: foGame.getStatus(),
                  resetScores: foGame.shouldResetScores(),
                },
                gameData
              }
            };
            let gameStart: IMessage = {
              eventName: FindObjectEvents.START,
              data: {}
            };
            broadcastRoom(ws.room, JSON.stringify(gameStart));
            broadcastRoom(ws.room, JSON.stringify(data));
            break;
          case FindObjectEvents.USER_PREDICTION:
            if(!Array.isArray(obj.data))
              break;
            let predictions: IFOPrediction[] = obj.data;
            if(typeof ws.room.getGame().runPrediction !== "undefined"){
              ws.room.getGame().runPrediction(ws, predictions, broadcastRoom);
            }
            break;
          default:
            console.log("default");
            break;
        }
      });
      ws.on(socketEvents.ERROR, (e) => {
        console.log('socket error ', e);
        ws.terminate();
      });
      ws.on(socketEvents.CLOSE, ()=>{
        console.log('socket close');
        let user: User | undefined;
        if(typeof ws.room === "undefined"){
          return;
        }
        user = [...ws.room.getUsers()].find(element => {
          return (element.getId() == ws.uuId);
        });
        if(typeof user !== "undefined"){
          ws.room.removeUser(user);
          let newHost: User | undefined = undefined;
          if(user?.getRole() === ROLES[0] && ws.room.getUsers().length > 0){
            ws.room.getUsers()[0].setRole(ROLES[0]);
            newHost = ws.room.getUsers()[0];
          }

          //alert users for disconnect
          let newHostData;
          if(typeof newHost !== "undefined"){
            newHostData = {
              uuid: newHost.getId()
            }
          }

          let data = {
            eventName: socketEvents.USER_DISCONNECT,
            data:{
              user: {
                uuid: user?.getId()
              },
              newHost: newHostData
            }
          }
          broadcast(ws.room, JSON.stringify(data))
        }
      })
    });
  }

  setupUser = (ws: WebSocket, data: ISetupUser) => {
    let room: Room | undefined;
    let user: User;
    room = this.rooms.find(element => {
      return (element.getId() == data.roomId);
    });

    if(room === undefined){
      room = new Room();
      this.rooms = [...this.rooms, room];
    }

    let role = ROLES[1];
    if(room.getUsers().length == 0){
      role = ROLES[0];
    }
    console.log(data);
    user = new User(data.displayName, room, role);
    room.addUser(user);

    ws.room = room;
    ws.uuId = user.getId();

    return user;
  }
}

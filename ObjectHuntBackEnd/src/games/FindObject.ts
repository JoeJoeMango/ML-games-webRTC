import * as WebSocket from 'ws';
import { Game } from "./Game";
import { GameWords, IFOPrediction, FindObjectEvents } from "../constants/games/findObject";
import { User } from '../User';
import { ROLES } from '../constants/userConstants';
import { IMessage } from '../constants/socketTypes';

export class FindObject extends Game{
    constructor(){
        super();
        this.word = '';

    }
    private word: string;
    
    setupGame(ws: WebSocket){
        let user: User | undefined = [...ws.room.getUsers()].find(element => {
            return (element.getId() === ws.uuId)
          });
        if(user?.getRole() === ROLES[0]){
            [...ws.room.getUsers()].forEach(user => {
                user.setScore(0);
            })
            ws.room.setGame(this);
            ws.room.getGame().updateWord();
            ws.room.getGame().setStatus(true);
        }
    }
    runPrediction(ws: WebSocket, predictions: IFOPrediction[], broadCast: any){
        predictions.forEach(prediction => {
            if(prediction.class === ws.room.getGame().getWord()){
              ws.user.increaseScore();
              let oldWord: string = ws.room.getGame().getWord();
              //update word while its equal to prev word (prevent duplicates)
              do{
                ws.room.getGame().updateWord();
              } while(ws.room.getGame().getWord() == oldWord)
              
              //send winner and new game data
              broadCast(ws.room, JSON.stringify({
                  eventName: FindObjectEvents.USER_WINNER,
                  data: {
                      user: {
                          uuid: ws.user.getId(),
                          score: ws.user.getScore(),
                      },
                      game: {
                          word: ws.room.getGame().getWord()
                      }
                  }
              }));

              this.gameOver(ws.user, broadCast);
            }
          });
    }
    gameOver(user: User, broadCast: any){
        if(user.getScore() == 10){
            let message: IMessage = {
                eventName: FindObjectEvents.GAME_OVER,
                data: {
                    user: {
                        username: user.getName(),
                        uuid: user.getId(),
                        role: user.getRole(),
                        score: user.getScore(),
                    }
                }
            }
            user.getRoom().getGame().setResetScores(true);
            broadCast(user.getRoom(), JSON.stringify(message));
        }
    }
    updateClient(){
        let resp = {
            game: {
                word: this.getWord()
            }
        }
        return resp;
    }
    getWord(){
        return this.word;
    }
    updateWord(){
        this.word = GameWords[(Math.floor(Math.random() * GameWords.length))];
    }

}

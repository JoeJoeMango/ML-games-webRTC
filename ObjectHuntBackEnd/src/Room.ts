import { User } from "./User";
import { v4 as uuidv4 } from 'uuid';
import { Game } from "./games/Game";

export class Room{
    private uuid: string;
    private users: User[];
    private game: any;

    constructor(){
        this.uuid = uuidv4();
        this.users = [];
        this.game;
    }
    getId(){
        return this.uuid;
    }
    getUser(userId: number){
        return this.users[userId];
    }
    getUsers(){
        return this.users;
    }
    addUser(user: User){
        this.users = [...this.users, user];
    }
    removeUser(user: User){
        this.users = this.users.filter(function(ele){ return ele != user; });
    }
    getGame(){
        return this.game;
    }
    setGame(game: Game){
        this.game = game;
    }
}
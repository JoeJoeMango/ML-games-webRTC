import { v4 as uuidv4 } from 'uuid';
import { Room } from './Room';
export class User{
    
    private uuid: string;
    private displayName: string;
    private room: Room;
    private role: string;
    private score: number;

    constructor(displayName: string, room: Room, role: string){
        this.uuid = uuidv4();
        this.displayName = displayName;
        this.room = room;
        this.role = role;
        this.score = 0;
    }
    getId(){
        return this.uuid;
    }
    getName(){
        return this.displayName;
    }
    getRoom(){
        return this.room;
    }
    getRole(){
        return this.role;
    }
    setRole(role: string){
        this.role = role;
    }
    getScore(){
        return this.score;
    }
    setScore(score: number){
        this.score = score
    }
    increaseScore(){
        this.score++;
    }

}
export class Game{
    private status: boolean;
    private resetScores: boolean;

    constructor(){
        this.status = false;
        this.resetScores = false;
    }

    getStatus(){
        return this.status;
    }
    setStatus(status: boolean){
        this.status = status;
    }
    shouldResetScores(){
        let resetScores = this.resetScores;
        this.resetScores = false;
        return resetScores;
    }
    setResetScores(status: boolean){
        this.resetScores = status;
    }

}
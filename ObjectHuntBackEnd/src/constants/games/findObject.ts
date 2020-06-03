export enum FindObjectEvents {
    USER_PREDICTION = 'userPrediction',
    USER_WINNER = 'userWinner',
    START = 'FOStart',
    UPDATE_DATA = 'FOUpdateData', 
    GAME_OVER = 'FOGameOver',
}

export const GameWords = ['umbrella','backpack','wine glass','fork','spoon','book','broccoli','banana','toilet','cup','tv','laptop','remote','knife','cell phone','sink','refrigerator','potted plant','scissors','carrot'];

export interface IFOPrediction {
    class: string;
    percentage: number;
}

import React, { Component } from "react";

class Word extends Component {
  render() {
    const { gameData } = this.props.game;
    return (
        <div className="-game-direction">
          {gameData.word}
        </div>
    );
  }
}

export default Word;

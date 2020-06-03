import React, { Component } from "react";

class Player extends Component {
  render() {
    const { player } = this.props;
    return (
      <div className="block">
        <div className="number">{player.score}</div>
        <div className="name">{player.name}</div>
      </div>
    );
  }
}

export default Player;

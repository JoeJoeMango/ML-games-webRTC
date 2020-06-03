import React, { Component } from "react";
import Player from "./Player";

class Players extends Component {
  componentDidMount(){
    console.log(this.props);
  }

  render() {
    const { players } = this.props;
    return (
      <div className="container">
        {players.map((player) => {
          return <Player key={player.id} player={player} />;
        })}
      </div>
    );
  }
}

export default Players;

import React, { Component } from "react";

class VideoFeed extends Component {
  componentDidUpdate(){
    const {videoFeeds} = this.props;
      videoFeeds.forEach(element => {
          element.ref.current.srcObject = element.stream;
      });
      var rowHeight = "98vh";
      var colWidth = "98vw";

      var numVideos = videoFeeds.length+1; // add one to include local video
      console.log(videoFeeds.length);
      if (numVideos > 1 && numVideos <= 4) {
        // 2x2 grid
        rowHeight = "48vh";
        colWidth = "48vw";
      } else if (numVideos > 4) {
        // 3x3 grid
        rowHeight = "32vh";
        colWidth = "32vw";
      }
    
      document.documentElement.style.setProperty(`--rowHeight`, rowHeight);
      document.documentElement.style.setProperty(`--colWidth`, colWidth);

  }
  shouldComponentUpdate(nextProps, nextState){
    if (this.props.videoFeeds !== nextProps.videoFeeds) {
      return true;
    }
    return false;
  }

  render() {
    const { videoRef, videoFeeds } = this.props;
    return (
      <div className="videos">
        <div className="videoContainer">
            <video ref={videoRef} autoPlay muted ></video>
        </div>
        {videoFeeds.map((feed, index) => {
            return <div key={index} className="videoContainer">
              <video ref={feed.ref} autoPlay/>
            </div>;
        })}
      </div>
    );
  }
}

export default VideoFeed;

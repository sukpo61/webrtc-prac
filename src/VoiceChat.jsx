import React from "react";
import socket from "./socket";
import styled from "styled-components";
import { useState, useEffect, useRef } from "react";
import { userinfo } from "./socket";

const VoiceChat = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [room, setRoom] = useState("my-room");
  const [username, setUsername] = useState("");
  // const [RtcPeerConnectionMap, setRtcPeerConnectionMap] = useState(
  //   () => new Map()
  // );
  const RtcPeerConnectionMap = new Map();

  const handleVideoRef = (video) => {
    if (video) {
      video.srcObject = localStream;
    }
  };

  async function getMedia() {
    try {
      const myStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setLocalStream(myStream);
    } catch (e) {
      console.log(e);
    }
  }

  function handleIce(data) {
    console.log("sent candidate");
    socket.emit("ice", data.candidate, room);
  }

  function handleAddStream(data) {
    setRemoteStreams((e) => [...e, data.stream]);
  }

  async function initCall() {
    await getMedia();
  }

  const handleJoin = async () => {
    await initCall();
    socket.emit("join_room", room);
  };

  const handleLeave = () => {
    socket.emit("leave", localStream);
  };

  const remoteStreamList = remoteStreams.map((stream, index) => {
    const remotehandleVideoRef = (video) => {
      if (video) {
        video.srcObject = stream;
      }
    };

    return (
      <div>
        {index + 2}
        <video
          ref={remotehandleVideoRef}
          autoPlay
          playsInline
          width="400"
          height="400"
          muted
        />
      </div>
    );
  });

  const createRTCPeerConnection = async (otheruserid) => {
    console.log(otheruserid);

    const NewUserPeerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
            "stun:stun3.l.google.com:19302",
            "stun:stun4.l.google.com:19302",
          ],
        },
      ],
    });

    NewUserPeerConnection.addEventListener("addstream", handleAddStream);
    // NewUserPeerConnection.addEventListener("icecandidate", handleIce);

    localStream
      .getTracks()
      .forEach((track) => NewUserPeerConnection.addTrack(track, localStream));

    return NewUserPeerConnection;
  };

  useEffect(() => {
    if (localStream) {
      socket.on("welcome", async (answerid) => {
        const MyPeerConnection = await createRTCPeerConnection(answerid);

        MyPeerConnection.onicecandidate = (event) => {
          socket.emit("ice", event.candidate, userinfo.id);
        };

        RtcPeerConnectionMap.set(answerid, MyPeerConnection);

        const offer = await MyPeerConnection.createOffer();

        MyPeerConnection.setLocalDescription(offer);

        socket.emit("offer", offer, userinfo.id, answerid);
      });

      socket.on("offer", async (offer, offerid, answerid) => {
        const MyPeerConnection = await createRTCPeerConnection(offerid);

        MyPeerConnection.onicecandidate = (event) => {
          socket.emit("ice", event.candidate, answerid);
        };

        RtcPeerConnectionMap.set(offerid, MyPeerConnection);

        MyPeerConnection.setRemoteDescription(offer);

        const answer = await MyPeerConnection.createAnswer();

        MyPeerConnection.setLocalDescription(answer);

        socket.emit("answer", answer, offerid, answerid);

        console.log("sent the answer");
      });

      socket.on("answer", (answer, answerid) => {
        RtcPeerConnectionMap.get(answerid).setRemoteDescription(answer);
        console.log("received the answer");
      });

      socket.on("ice", (ice, targetid) => {
        RtcPeerConnectionMap.get(targetid).addIceCandidate(ice);
        console.log("received candidate");
      });
    }
  }, [localStream]);

  return (
    <div>
      <h1>Voice Chat Room</h1>
      <div>
        <input
          type="text"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button onClick={handleJoin}>Join Room</button>
        <button onClick={handleLeave}>Leave Room</button>
      </div>
      <div>
        1
        <video
          ref={handleVideoRef}
          autoPlay
          playsInline
          width="400"
          height="400"
          muted
        />
        {remoteStreamList}
      </div>
    </div>
  );
};

export default VoiceChat;

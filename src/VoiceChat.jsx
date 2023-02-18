import React from "react";
import socket from "./socket";
import styled from "styled-components";
import { useState, useEffect, useRef } from "react";

const VoiceChat = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [room, setRoom] = useState("my-room");
  const [username, setUsername] = useState("");
  const [staticitem, setStatic] = useState(true);
  const [myPeerConnection, setmyPeerConnection] = useState(null);
  // const streamToBlob = require("stream-to-blob");

  const handleVideoRef = (video) => {
    if (video) {
      video.srcObject = localStream;
    }
  };

  // let localStream;
  // let remoteStreams = [];
  // let myPeerConnection;

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
  // 스트림에 정보를 담게됨.

  // console.log(localStream);

  // setLocalStream(myStream);

  function handleIce(data) {
    console.log("sent candidate");
    socket.emit("ice", data.candidate, room);
  }

  function handleAddStream(data) {
    setRemoteStreams((e) => [...e, data.stream]);
  }

  async function initCall() {
    await getMedia();
    // 유저의 디바이스를 불러옴.
    // makeConnection();
  }

  // handle join room
  const handleJoin = async () => {
    await initCall();
    socket.emit("join_room", room);
    console.log("joined!");
  };

  // handle leave room
  const handleLeave = () => {
    socket.emit("leave", localStream);
  };

  // render remote streams
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

  useEffect(() => {
    if (myPeerConnection) {
      // myPeerConnection.addEventListener("icecandidate", handleIce);
      // // 아이스 캔디데이트의 기준은 무엇인가? 언제 일어나는가?
      myPeerConnection.addEventListener("addstream", handleAddStream);
      //html 에 애트 스트림이 되면 하드코딩을 하게됨, 애드 스트림을 정확히 알아야 할듯.

      myPeerConnection.onicecandidate = (data) => {
        console.log("sent candidate");
        socket.emit("ice", data.candidate, room);
      };

      localStream
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, localStream));
      // 로컬스트림의 트랙을 커낵션에 넣게됨.

      socket.on("welcome", async () => {
        const offer = await myPeerConnection.createOffer();
        //2. a 의 오퍼를 생성하고
        myPeerConnection.setLocalDescription(offer);
        // a 로컬에 자기 로컬 오퍼 추가sddd
        socket.emit("offer", offer, room);
        //3. 백앤드로 보냄
        console.log("sent the offer");
      });

      socket.on("offer", async (offer) => {
        console.log("received the offer");

        //5. b가 a의 오퍼를 받게 됨
        myPeerConnection.setRemoteDescription(offer);
        // b 로컬에 a 리모트 오퍼 추가
        const answer = await myPeerConnection.createAnswer();
        //6. b의 오퍼를 생성함.
        myPeerConnection.setLocalDescription(answer);
        //7. b의 로컬에 자기 로컬 앤서 추가, 둘다 추가 됨.
        socket.emit("answer", answer, room);
        //8. 앤서 백앤으로 보내고
        console.log("sent the answer");
      });

      socket.on("answer", (answer) => {
        console.log("received the answer");
        myPeerConnection.setRemoteDescription(answer);
        //10. a로컬에 b 리모트 앤서 추가, 둘다 추가 됨.
      });

      socket.on("ice", (ice) => {
        console.log("received candidate");
        myPeerConnection.addIceCandidate(ice);
      });
    }
  }, [myPeerConnection]);

  useEffect(() => {
    if (localStream) {
      setmyPeerConnection(
        new RTCPeerConnection({
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
        })
      );
      // 방에 돌입하면. 독자적인 스턴서버를 운용하고 RTC 연결을 새로 생성함.
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

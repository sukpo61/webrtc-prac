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
  const [myPeerConnection, setmyPeerConnection] = useState(null);
  const [RtcPeerConnectionMap, setRtcPeerConnectionMap] = useState(
    () => new Map()
  );

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
    // 유저의 디바이스를 불러옴.
    // makeConnection();
  }

  // handle join room
  const handleJoin = async () => {
    await initCall();
    socket.emit("join_room", room);
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

  const createRTCPeerConnection = async (otheruserid, peerkind) => {
    console.log(otheruserid);
    //a.1-2 b id 받음.
    //b.1-2 a id 받음.
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
    //a.2 b와 연결할 a의 피어커넥션 생성.
    //b.2 a와 연결할 b의 피어커넥션 생성.

    // NewUserPeerConnection.addEventListener("addstream", handleAddStream);
    // NewUserPeerConnection.addEventListener("icecandidate", handleIce);
    //a.3 애드스트림, 아이스캔디데이트 리스너 추가.
    //b.3 애드스트림, 아이스캔디데이트 리스너 추가.

    localStream
      .getTracks()
      .forEach((track) => NewUserPeerConnection.addTrack(track, localStream));
    //a.4 a 로컬스트림 트랙 추가.
    //b.4 b 로컬스트림 트랙 추가.

    if (peerkind === "offer") {
      const offer = await NewUserPeerConnection.createOffer();
      //a.5 a 의 오퍼를 생성하고
      NewUserPeerConnection.setLocalDescription(offer);
      //a.6 a 로컬피어에 a 로컬 오퍼 추가

      const newMap = new Map(RtcPeerConnectionMap);
      newMap.set(otheruserid, NewUserPeerConnection);
      setRtcPeerConnectionMap(newMap);

      //a.7 a의 피어커넥션 맵에 b id인 피어커넥션 추가.

      socket.emit("offer", offer, otheruserid, userinfo.id);
      //a.8  백앤드로 a offer 와 b id, a id를 보냄.
      console.log("sent the offer");
    } else {
      const answer = await NewUserPeerConnection.createOffer();
      //b.5 a 의 오퍼를 생성하고
      NewUserPeerConnection.setLocalDescription(answer);
      //b.6 로컬에 자기 로컬 오퍼 추가

      const newMap = new Map(RtcPeerConnectionMap);
      newMap.set(otheruserid, NewUserPeerConnection);
      setRtcPeerConnectionMap(newMap);

      //b.7 b의 피어커넥션 맵에 a id인 피어커넥션 추가.

      socket.emit("answer", answer, otheruserid, userinfo.id);
      //b.8  백앤드로 b answer 와 a id 를 보냄.
      console.log("sent the answer");
    }
  };

  useEffect(() => {
    if (RtcPeerConnectionMap.size !== 0) {
      console.log(RtcPeerConnectionMap);
      socket.on("offer", async (offer, offeruserid) => {
        const offeredPeerConnection = RtcPeerConnectionMap.get(offeruserid);

        //a.11 b가 a의 오퍼를 받게 됨
        offeredPeerConnection.setRemoteDescription(offer);
        //a.12 b 로컬피어에 a 리모트 오퍼 추가. 둘다 추가됨.

        console.log(`${offeruserid} send offer`);
      });

      socket.on("answer", (answer, answeruserid) => {
        const answeredPeerConnection = RtcPeerConnectionMap.get(answeruserid);

        answeredPeerConnection.setRemoteDescription(answer);

        console.log(`${answeruserid} send answer`);
      });

      socket.on("ice", (ice) => {
        console.log("received candidate");
        myPeerConnection.addIceCandidate(ice);
      });
    }
  }, [RtcPeerConnectionMap]);

  useEffect(() => {
    if (localStream) {
      console.log("123", localStream);

      socket.on("welcome", async (welcomeuserid) => {
        //a.1 a 프런트에 b 의 아이디가 오게됨.
        await createRTCPeerConnection(welcomeuserid, "offer");
      });
      socket.on("getuserids", (nicknames) => {
        nicknames.map((id) => {
          createRTCPeerConnection(id, "answer");
          //b.1 다른사람의 닉네임배열로 (2명이면 a의 id) 피어커넥션 생성함수 실행.
        });
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

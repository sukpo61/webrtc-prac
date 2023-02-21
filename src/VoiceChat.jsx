import React from "react";
import socket from "./socket";
import styled from "styled-components";
import { useState, useEffect, useRef } from "react";
import { userinfo } from "./socket";

const VoiceChat = () => {
  const [localStream, setLocalStream] = useState(null);
  const [AllStreams, setAllStreams] = useState([]);
  const [room, setRoom] = useState("my-room");
  const [username, setUsername] = useState("");
  const [FirstJoin, setFirstJoin] = useState(true);
  const [RtcPeerConnectionMap, setRtcPeerConnectionMap] = useState(new Map());

  // let RtcPeerConnectionMap = new Map();

  // const handleVideoRef = (video) => {
  //   if (video) {
  //     video.srcObject = localStream;
  //   }
  // };

  async function getMedia() {
    try {
      const myStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setLocalStream(myStream);

      handleAddStream(userinfo.id, myStream);
    } catch (e) {
      console.log(e);
    }
  }

  const handleAddStream = (userid, stream) => {
    if (stream) {
      setAllStreams((e) => [...e, { userid, stream }]);
    }
  };

  const handleJoin = async () => {
    await getMedia();
    socket.emit("join_room", room);
  };

  const handleLeave = () => {
    setRtcPeerConnectionMap(
      RtcPeerConnectionMap.forEach((peerconnection, id) => {
        peerconnection.close();
        RtcPeerConnectionMap.delete(id);
      })
    );

    localStream.getTracks().forEach((track) => {
      track.stop();
    });
    setAllStreams([]);
    socket.emit("leave", userinfo.id, room);
  };

  // 삭제하려면, a, b, c 가 있는 상황에서 c 가 나가면 a와 b 에서 c와의 피어 커낵션을 제거해야하고,
  // c에서는 리모트 스트림 초기화,
  // rtcPeerConnectionMap.get(response.id).close();
  //     rtcPeerConnectionMap.delete(response.id);

  // 소캣에서 또한 나가야 하며, 리모트 스트림을 편집해야 한다. 특정

  const StreamList = AllStreams.map((data) => {
    const remotehandleVideoRef = (video) => {
      if (video) {
        video.srcObject = data.stream;
      }
    };

    return (
      <div key={data.userid}>
        {data.userid}
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

    localStream
      .getTracks()
      .forEach((track) => NewUserPeerConnection.addTrack(track, localStream));

    return NewUserPeerConnection;
  };

  useEffect(() => {
    if (localStream) {
      if (FirstJoin) {
        socket.on("welcome", async (answerid) => {
          const MyPeerConnection = await createRTCPeerConnection();

          MyPeerConnection.onicecandidate = (event) => {
            socket.emit("ice", event.candidate, userinfo.id);
          };

          MyPeerConnection.onaddstream = (event) => {
            handleAddStream(answerid, event.stream);
          };

          setRtcPeerConnectionMap(
            RtcPeerConnectionMap.set(answerid, MyPeerConnection)
          );
          const offer = await MyPeerConnection.createOffer();

          MyPeerConnection.setLocalDescription(offer);

          socket.emit("offer", offer, userinfo.id, answerid);
        });

        socket.on("offer", async (offer, offerid, answerid) => {
          console.log("answer");
          const MyPeerConnection = await createRTCPeerConnection(offerid);

          MyPeerConnection.onicecandidate = (event) => {
            socket.emit("ice", event.candidate, answerid);
          };

          MyPeerConnection.onaddstream = (event) => {
            handleAddStream(offerid, event.stream);
          };

          setRtcPeerConnectionMap(
            RtcPeerConnectionMap.set(offerid, MyPeerConnection)
          );

          MyPeerConnection.setRemoteDescription(offer);

          const answer = await MyPeerConnection.createAnswer();

          MyPeerConnection.setLocalDescription(answer);

          socket.emit("answer", answer, offerid, answerid);
        });
        //dㅇdd
        console.log("A socketon");

        socket.on("answer", (answer, answerid) => {
          console.log(RtcPeerConnectionMap);
          RtcPeerConnectionMap.get(answerid).setRemoteDescription(answer);
        });

        socket.on("ice", (ice, targetid) => {
          RtcPeerConnectionMap.get(targetid).addIceCandidate(ice);
        });
        socket.on("leave", (targetid) => {
          console.log("leave");
          RtcPeerConnectionMap.get(targetid).close();
          setRtcPeerConnectionMap(RtcPeerConnectionMap.delete(targetid));
          setAllStreams((e) =>
            e.filter((stream) => stream.userid !== targetid)
          );
        });
        setFirstJoin(false);
      }
    }
    return () => {};
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
      <div>{StreamList}</div>
    </div>
  );
};

export default VoiceChat;

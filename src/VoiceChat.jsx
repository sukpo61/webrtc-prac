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
  const [RtcPeerConnectionMap, setRtcPeerConnectionMap] = useState(new Map());
  const [DataChannelMap, setDataChannelMap] = useState(new Map());

  async function getMedia() {
    try {
      const myStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setLocalStream(myStream);

      handleAddStream(userinfo.id, myStream);
    } catch (e) {
      console.log(e);
    }
  }

  const startSharing = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      setLocalStream(screenStream);

      handleAddStream(userinfo.id, screenStream);
    } catch (error) {
      console.error("Error starting screen share", error);
    }
  };

  const handleAddStream = (userid, stream) => {
    if (stream) {
      setAllStreams((e) => [...e, { userid, stream }]);
    }
  };

  const handleJoin = async () => {
    // await startSharing();
    await getMedia();
    socket.emit("join_room", room);
  };

  const handleLeave = () => {
    if (RtcPeerConnectionMap.size !== 0) {
      socket.emit("test");
      RtcPeerConnectionMap.forEach((peerconnection, id) => {
        peerconnection.close();
      });
      RtcPeerConnectionMap.forEach((channel, id) => {
        channel.close();
      });
      localStream.getTracks().forEach((track) => track.stop());
      setRtcPeerConnectionMap(() => new Map());
      setDataChannelMap(() => new Map());
    }

    setAllStreams([]);
    socket.emit("leave", userinfo.id, room);
  };

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

  const createRTCPeerConnection = async (userid) => {
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

    NewUserPeerConnection.ontrack = (event) => {
      handleAddStream(userid, event.streams[0]);
    };

    NewUserPeerConnection.onicecandidate = (event) => {
      socket.emit("ice", event.candidate, userinfo.id, room);
    };

    setRtcPeerConnectionMap((e) => e.set(userid, NewUserPeerConnection));

    return NewUserPeerConnection;
  };

  const createData = (MyPeerConnection, answerid) => {
    const newDataChannel = MyPeerConnection.createDataChannel("chat");

    setDataChannelMap((e) => e.set(answerid, newDataChannel));

    return newDataChannel;
  };

  const createAnswerData = (channel, offerid) => {
    setDataChannelMap((e) => e.set(offerid, channel));

    return channel;
  };

  const checkMap = () => {
    console.log(RtcPeerConnectionMap);
  };

  useEffect(() => {
    if (localStream) {
      socket.off("welcome");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice");
      socket.off("leave");
      //d
      socket.on("welcome", async (answerid) => {
        console.log("welcome");
        const MyPeerConnection = await createRTCPeerConnection(answerid);

        const myData = createData(MyPeerConnection, answerid);

        myData.onmessage = (e) => {
          console.log(e.data);
        };

        const offer = await MyPeerConnection.createOffer();

        MyPeerConnection.setLocalDescription(offer);

        socket.emit("offer", offer, userinfo.id, answerid);
      });

      socket.on("offer", async (offer, offerid, answerid) => {
        const MyPeerConnection = await createRTCPeerConnection(offerid);

        MyPeerConnection.ondatachannel = (e) => {
          const myData = createAnswerData(e.channel, offerid);
          myData.onmessage = (e) => {
            console.log(e.data);
          };
        };

        MyPeerConnection.setRemoteDescription(offer);

        const answer = await MyPeerConnection.createAnswer();

        MyPeerConnection.setLocalDescription(answer);

        socket.emit("answer", answer, offerid, answerid);
      });

      socket.on("answer", (answer, answerid) => {
        RtcPeerConnectionMap.get(answerid).setRemoteDescription(answer);
      });

      socket.on("ice", (ice, targetid) => {
        if (RtcPeerConnectionMap.get(targetid)) {
          RtcPeerConnectionMap.get(targetid).addIceCandidate(ice);
        }
      });

      socket.on("leave", (targetid) => {
        RtcPeerConnectionMap.get(targetid).close();
        setRtcPeerConnectionMap((e) => {
          e.delete(targetid);
          return e;
        });
        DataChannelMap.get(targetid).close();
        setDataChannelMap((e) => {
          e.delete(targetid);
          return e;
        });
        setAllStreams((e) => e.filter((stream) => stream.userid !== targetid));
      });
    }

    return () => {
      socket.off("welcome");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice");
      socket.off("leave");
    };
  }, [localStream, RtcPeerConnectionMap, DataChannelMap]);

  return (
    <div>
      <h1>Voice Chat Room</h1>
      <div>
        <InputWrap>
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
        </InputWrap>
        <button onClick={handleJoin}>Join Room</button>
        <button onClick={handleLeave}>Leave Room</button>
        <button onClick={checkMap}>Map</button>
        <button
          onClick={() => {
            DataChannelMap.forEach((channel, id) => {
              channel.send(username);
            });
          }}
        >
          send
        </button>
      </div>
      <VideoWrap>{StreamList}</VideoWrap>
    </div>
  );
};

export default VoiceChat;

const VideoWrap = styled.div`
  display: flex;
  flex-direction: row;
`;
const InputWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
`;

import { io } from "socket.io-client";

export const userinfo = {
  id: "user4",
};

const socket = io("http://localhost:4500");

socket.on("connect", () => {
  console.log("Connected to server!");
});

socket.emit("userid", userinfo.id);

socket.on("message", (data) => {
  console.log("Received message:", data);
});

export default socket;

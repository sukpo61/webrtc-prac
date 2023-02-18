import { io } from "socket.io-client";

const socket = io("http://localhost:4500");

socket.on("connect", () => {
  console.log("Connected to server!");
});

socket.on("message", (data) => {
  console.log("Received message:", data);
});

export default socket;

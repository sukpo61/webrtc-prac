import React from "react";
import socket from "./socket";
import axios from "axios";

const NodeTest = () => {
  const API_URL = "http://localhost:8000";

  const Log = () => {
    console.log("test");
  };

  const Test = () => {
    socket.emit("test", () => {
      Log();
    });
  };

  const getPosts = async () => {
    const response = await axios.get(`${API_URL}/posts`);
    console.log(response);
  };

  return (
    <div>
      <button onClick={Test}>socket test</button>
      <button onClick={getPosts}>db json test</button>
    </div>
  );
};

export default NodeTest;

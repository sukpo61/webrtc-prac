import React from "react";
import firebase from "firebase/app";
import "firebase/auth";

const STEAM_API_KEY = "234E0113F33D5C7C4D4D5292C6774550";
const STEAM_OPENID_ENDPOINT = `https://steamcommunity.com/openid/login?openid.ns=http://specs.openid.net/auth/2.0&openid.mode=checkid_setup&openid.return_to=http://localhost:3002/&openid.realm=http://localhost:3002&openid.identity=http://specs.openid.net/auth/2.0/identifier_select&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select`;

const SteamLogin = () => {
  const handleLogin = async () => {
    window.location.href = STEAM_OPENID_ENDPOINT;
  };

  return (
    <div>
      <button onClick={handleLogin}>Login with Steam</button>
    </div>
  );
};

export default SteamLogin;

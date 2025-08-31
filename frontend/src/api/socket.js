import { io } from "socket.io-client";

const SOCKET_URL = "http://192.168.8.156:5000"; // backend URL

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

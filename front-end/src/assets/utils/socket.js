import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export const initializeSocket = (userId) => {
    socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
        if (userId) {
            socket.emit("register", userId);  
        }
    });
};

export default socket;

import { io } from "socket.io-client";
import eventBus from "./eventBus";

let socket = null; // ✅ Variable global para manejar el socket

function connectSocket() {
    const token = sessionStorage.getItem("token");

    if (!token) {
        console.warn("⚠️ No se inicializó Socket.IO porque no hay token.");
        return;
    }

    if (socket && socket.connected) {
        console.log("✅ Socket ya está conectado.");
        return;
    }

    socket = io("http://localhost:3000", {
        auth: { token },
        transports: ["websocket"],
        autoConnect: true, // ✅ Se conecta automáticamente si hay token
    });

    socket.on("connect", () => {
        console.log("🔗 Conectado a Socket.IO con ID:", socket.id);
        socket.emit("requestConnectedUsers"); // ✅ Pedir lista de usuarios conectados
        eventBus.emit("socketConnected", socket);
    });

    socket.on("disconnect", () => {
        console.warn("⚠️ Desconectado de Socket.IO");
    });

    socket.on("connectedUsers", (users) => {
        console.log("🟢 Usuarios conectados:", users);
        eventBus.emit("socketUsersUpdated", users);
    });

    socket.on("receivePrivateMessage", (message) => {
        console.log("📩 Nuevo mensaje recibido:", message);
        eventBus.emit("socketMessageReceived", message);
    });

    socket.on("unreadMessages", (unread) => {
        console.log("🔔 Mensajes no leídos:", unread);
        eventBus.emit("socketUnreadMessages", unread);
    });
}

export default {
    install: (app) => {
        app.provide("socket", {
            connect: connectSocket, // ✅ Método para inicializar el socket después del login
            getInstance: () => socket, // ✅ Método para obtener la instancia actual del socket
        });

        // 🔹 Si hay un token, conectamos el socket automáticamente
        if (sessionStorage.getItem("token")) {
            connectSocket();
        }

        app.provide("eventBus", eventBus);
    },
};

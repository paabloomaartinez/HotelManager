import Message from '../models/Message.js';

const connectedUsers = {};
const unreadMessages = {};
const openChats = {};

export default (io) => {
    io.on('connection', (socket) => {
        const user = socket.user;

        connectedUsers[user.numeroDocumento] = {
            numeroDocumento: user.numeroDocumento,
            nombre: user.nombre,
            apellidos: user.apellidos,
            rol: user.rol,
            socketId: socket.id,
        };

        console.log(`Usuario conectado: ${user.nombre} (${user.rol})`);
        io.emit('connectedUsers', Object.values(connectedUsers));

        socket.emit('unreadMessages', unreadMessages[user.numeroDocumento] || {});

        // Enviar historial de mensajes cuando un usuario abre un chat
        socket.on('getChatHistory', async ({ withUserId }) => {
            try {
                const messages = await Message.find({
                    $or: [
                        { sender: user.numeroDocumento, recipient: withUserId },
                        { sender: withUserId, recipient: user.numeroDocumento }
                    ]
                }).sort({ timestamp: 1 });

                socket.emit('chatHistory', { withUserId, messages });
            } catch (error) {
                console.error("Error al obtener historial de mensajes:", error);
            }
        });

        socket.on("requestConnectedUsers", () => {
            console.log(`📢 Usuario ${user.numeroDocumento} solicitó la lista de usuarios.`);
            socket.emit("connectedUsers", Object.values(connectedUsers));
        });

        socket.on('chatOpened', async ({ chatWith }) => {
            if (!openChats[user.numeroDocumento]) {
                openChats[user.numeroDocumento] = new Set();
            }
            openChats[user.numeroDocumento].add(chatWith);

            // Marcar mensajes como leídos en la base de datos
            await Message.updateMany(
                { sender: chatWith, recipient: user.numeroDocumento, isRead: false },
                { isRead: true }
            );

            // Verificar si existen mensajes no leídos antes de intentar eliminarlos
            if (unreadMessages[user.numeroDocumento] && unreadMessages[user.numeroDocumento][chatWith]) {
                delete unreadMessages[user.numeroDocumento][chatWith];
            }

            io.to(socket.id).emit('unreadMessages', unreadMessages[user.numeroDocumento] || {});
        });

        // Manejar evento cuando un usuario cierra un chat
        socket.on('chatClosed', ({ chatWith }) => {
            if (openChats[user.numeroDocumento]) {
                openChats[user.numeroDocumento].delete(chatWith);
            }
        });

        // Manejar mensajes privados
        socket.on('privateMessage', async ({ toUserId, text }) => {
            const recipient = connectedUsers[toUserId];

            if (!toUserId || !text.trim()) {
                return socket.emit('errorMessage', { message: "El mensaje y el destinatario son requeridos." });
            }

            const message = {
                sender: user.numeroDocumento,
                recipient: toUserId,
                text,
                timestamp: new Date(),
            };

            try {
                const newMessage = new Message(message);
                await newMessage.save();
            } catch (error) {
                console.error('Error al guardar el mensaje:', error);
            }

            if (recipient && (!openChats[toUserId] || !openChats[toUserId].has(user.numeroDocumento))) {
                if (!unreadMessages[toUserId]) unreadMessages[toUserId] = {};
                if (!unreadMessages[toUserId][user.numeroDocumento]) {
                    unreadMessages[toUserId][user.numeroDocumento] = 0;
                }
                unreadMessages[toUserId][user.numeroDocumento] += 1;
            }

            if (recipient) {
                io.to(recipient.socketId).emit('receivePrivateMessage', message);
                io.to(recipient.socketId).emit('unreadMessages', unreadMessages[toUserId]);
            }
            socket.emit('receivePrivateMessage', message);
        });

        socket.on('disconnect', () => {
            console.log(`Usuario desconectado: ${user.nombre} (${user.rol})`);

            io.emit("userDisconnected", { userId: user.numeroDocumento });

            delete connectedUsers[user.numeroDocumento];
            io.emit('connectedUsers', Object.values(connectedUsers));
        });

    });
};

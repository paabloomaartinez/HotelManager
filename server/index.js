import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import router from './routes/routes.js';
import connectMongoDB from './config/mongoose.js';
import chatController from './controllers/Chat.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "uploads")));

app.use('/', router);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:8080",
        methods: ["GET", "POST"],
    },
});

app.set("io", io);

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Token no proporcionado"));
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        socket.user = decoded;
        next();
    } catch (error) {
        next(new Error("Token inválido"));
    }
});

chatController(io);

server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    connectMongoDB(); // Conectar a MongoDB
});

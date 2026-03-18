const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();

// Разрешаем CORS для всех доменов, чтобы Firebase мог общаться с Render
app.use(cors({ origin: "*" }));

const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" } 
});

// Указываем серверу, что все файлы игры лежат в папке public
app.use(express.static(path.join(__dirname, 'public')));

// Базовый маршрут для проверки, что сервер жив
app.get('/status', (req, res) => {
    res.json({ status: 'Engine is Online', timestamp: new Date() });
});

io.on('connection', (socket) => {
    console.log('User connected to Game Engine');
    
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`=== BATTLETOADS ENGINE LIVE ON PORT ${PORT} ===`);
});

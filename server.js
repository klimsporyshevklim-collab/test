const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors()); // Чтобы Firebase мог заходить на этот сервер
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Все файлы игры (html, js) должны лежать в папке public
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Player connected to Render Engine');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Battletoads Engine running on port ${PORT}`);
});

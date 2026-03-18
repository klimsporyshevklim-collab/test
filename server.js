const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

let players = 0;

io.on('connection', (socket) => {
    players++;
    console.log('A player connected. Total:', players);
    io.emit('playerCountUpdate', players);

    socket.on('disconnect', () => {
        players--;
        io.emit('playerCountUpdate', players);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Статические файлы (твой index.html) должны лежать в папке public
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Player linked to Render');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is LIVE on port ${PORT}`);
});

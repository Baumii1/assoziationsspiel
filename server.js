const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let lobbies = {};

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket-Verbindung
io.on('connection', (socket) => {
    console.log('Ein Benutzer hat sich verbunden:', socket.id);

    socket.on('createLobby', () => {
        const lobbyCode = Math.random().toString(36).substring(2, 8);
        lobbies[lobbyCode] = { players: [], currentCategory: 'Oberbegriff' };
        socket.join(lobbyCode);
        socket.emit('lobbyCreated', lobbyCode); // Sende die Lobby-ID zurück
    });

    socket.on('joinLobby', (code) => {
        if (lobbies[code]) {
            socket.join(code);
            socket.emit('lobbyJoined', lobbies[code].currentCategory);
        } else {
            socket.emit('lobbyError', 'Lobby nicht gefunden');
        }
    });

    socket.on('reveal', (input) => {
        const lobby = Object.keys(lobbies).find(code => socket.rooms[code]);
        if (lobby) {
            lobbies[lobby].players.push(input);
            io.to(lobby).emit('showResults', lobbies[lobby].players);
        }
    });

    socket.on('nextRound', () => {
        const lobby = Object.keys(lobbies).find(code => socket.rooms[code]);
        if (lobby) {
            lobbies[lobby].players = [];
        }
    });
});

// Route für Lobbys
app.get('/:lobbyCode', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server starten
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
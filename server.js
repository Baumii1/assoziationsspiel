const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

let lobbies = {}; // Speichert die Lobbys und Spieler

app.use(cors());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`);
});

// Socket.io-Verbindung
io.on('connection', (socket) => {
    console.log('Ein Spieler hat sich verbunden:', socket.id);

    // Lobby erstellen
    socket.on('createLobby', () => {
        const lobbyCode = generateLobbyCode();
        lobbies[lobbyCode] = { players: [] };
        socket.join(lobbyCode);
        socket.emit('lobbyCreated', lobbyCode);
        console.log(`Lobby ${lobbyCode} wurde erstellt.`);
    });

    // Lobby beitreten
    socket.on('joinLobby', (lobbyCode) => {
        if (lobbies[lobbyCode]) {
            // Spieler der Lobby beitreten
            if (lobbies[lobbyCode].players.length < 4) {
                if (!lobbies[lobbyCode].players.includes(socket.id)) {
                    lobbies[lobbyCode].players.push(socket.id);
                    socket.join(lobbyCode);
                    socket.emit('lobbyJoined', lobbyCode)
                    io.to(lobbyCode).emit('playerJoined', lobbies[lobbyCode].players);
                    console.log(`Spieler ${socket.id} ist der Lobby ${lobbyCode} beigetreten.`);
                } else {
                    socket.emit('error', 'Du bist bereits in dieser Lobby.');
                }
            } else {
                socket.emit('error', 'Die Lobby ist voll. Maximal 4 Spieler erlaubt.');
            }
        } else {
            socket.emit('error', 'Lobby nicht gefunden.');
        }
    });

    // Spieler trennt die Verbindung
    socket.on('disconnect', () => {
        console.log('Ein Spieler hat sich getrennt:', socket.id);
        for (const lobbyCode in lobbies) {
            const index = lobbies[lobbyCode].players.indexOf(socket.id);
            if (index !== -1) {
                lobbies[lobbyCode].players.splice(index, 1);
                io.to(lobbyCode).emit('playerJoined', lobbies[lobbyCode].players);
                // Lobby schließen, wenn keine Spieler mehr vorhanden sind
                if (lobbies[lobbyCode].players.length === 0) {
                    delete lobbies[lobbyCode];
                    console.log(`Lobby ${lobbyCode} wurde entfernt, da sie leer ist.`);
                }
                break;
            }
        }
    });
});

// Hilfsfunktionen
function generateLobbyCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
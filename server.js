const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'https://baumii1.github.io', // Erlaube alle Ursprünge
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000, // Zeit, bis der Server die Verbindung trennt
    pingInterval: 25000 // Häufigkeit, mit der der Server Pings sendet
});

const DISCONNECT_DELAY = 5000; // 5 Sekunden Delay

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
        lobbies[lobbyCode] = { players: [], hostId: socket.id }; // Host-ID speichern
        socket.join(lobbyCode);
        socket.emit('lobbyCreated', lobbyCode);
        console.log(`Lobby ${lobbyCode} wurde erstellt.`);
    });

    // Lobby beitreten
    socket.on('joinLobby', ({ lobbyCode }) => { // Nickname wird nicht mehr als Teil des Objekts empfangen
        const nickname = getCookie('nickname'); // Nickname aus Cookies abrufen
        if (!nickname) {
            socket.emit('error', 'Sie müssen einen Nicknamen haben, um einer Lobby beizutreten.');
            return; // Beende die Funktion, wenn kein Nickname vorhanden ist
        }
    
        if (lobbies[lobbyCode]) {
            if (lobbies[lobbyCode].players.length < 4) {
                // Überprüfen, ob der Spieler bereits in der Lobby ist
                const existingPlayerIndex = lobbies[lobbyCode].players.findIndex(player => player.id === socket.id);
                if (existingPlayerIndex !== -1) {
                    // Entferne den alten Account
                    lobbies[lobbyCode].players.splice(existingPlayerIndex, 1);
                }
    
                // Füge den neuen Spieler hinzu
                lobbies[lobbyCode].players.push({ id: socket.id, name: nickname }); // Speichere den Nicknamen
                socket.join(lobbyCode);
                socket.emit('lobbyJoined', lobbyCode);
                io.to(lobbyCode).emit('playerJoined', lobbies[lobbyCode].players.map(player => ({
                    id: player.id,
                    name: player.name,
                    isHost: player.id === lobbies[lobbyCode].hostId
                })));
                console.log(`Spieler ${nickname} (ID: ${socket.id}) ist der Lobby ${lobbyCode} beigetreten.`);
            } else {
                socket.emit('error', 'Die Lobby ist voll. Maximal 4 Spieler erlaubt.');
            }
        } else {
            socket.emit('error', 'Lobby nicht gefunden.');
        }
    });

    // Kick-Player-Event
    socket.on('kickPlayer', (playerId) => {
        const lobbyCode = Object.keys(lobbies).find(code => lobbies[code].players.includes(socket.id)); // Finde die Lobby des Hosts
        if (lobbyCode && socket.id === lobbies[lobbyCode].hostId) { // Überprüfe, ob der Sender der Host ist
            const index = lobbies[lobbyCode].players.indexOf(playerId);
            if (index !== -1) {
                lobbies[lobbyCode].players.splice(index, 1); // Spieler entfernen
                io.to(lobbyCode).emit('playerJoined', lobbies[lobbyCode].players.map(id => ({ id, isHost: id === lobbies[lobbyCode].hostId }))); // Aktualisiere die Spieler-Liste
                const playerSocket = io.sockets.sockets.get(playerId);
                if (playerSocket) {
                    playerSocket.emit('redirectToHome'); // Sende Nachricht an den gekickten Spieler
                    playerSocket.disconnect(); // Trenne den Spieler
                }
                console.log(`Spieler ${playerId} wurde von ${socket.id} gekickt.`);
            }
        }
    });

    // Spieler trennt die Verbindung
    socket.on('disconnect', () => {
        console.log('Ein Spieler hat sich getrennt:', socket.id);
        for (const lobbyCode in lobbies) {
            const index = lobbies[lobbyCode].players.indexOf(socket.id);
            if (index !== -1) {
                lobbies[lobbyCode].players.splice(index, 1);
                io.to(lobbyCode).emit('playerJoined', lobbies[lobbyCode].players.map(player => ({
                    id: player.id,
                    name: player.name,
                    isHost: player.id === lobbies[lobbyCode].hostId
                }))); // Aktualisiere die Spieler-Liste

                // Lobby schließen, wenn keine Spieler mehr vorhanden sind
                if (lobbies[lobbyCode].players.length === 0) {
                    // Setze einen Timer, um die Lobby nach einem Delay zu schließen
                    setTimeout(() => {
                        if (lobbies[lobbyCode].players.length === 0) {
                            delete lobbies[lobbyCode];
                            console.log(`Lobby ${lobbyCode} wurde entfernt, da sie leer ist.`);
                        }
                    }, DISCONNECT_DELAY);
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
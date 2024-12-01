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
    socket.on('joinLobby', ({ lobbyCode, nickname }) => {
        if (!nickname) {
            socket.emit('error', 'Sie müssen einen Nicknamen haben, um einer Lobby beizutreten.');
            return; // Beende die Funktion, wenn kein Nickname vorhanden ist
        }
    
        if (lobbies[lobbyCode]) {
            if (lobbies[lobbyCode].players.length < 4) {
                const existingPlayerIndex = lobbies[lobbyCode].players.findIndex(player => player.id === socket.id);
                if (existingPlayerIndex !== -1) {
                    socket.emit('error', 'Du bist bereits in dieser Lobby.');
                    return; // Beende die Funktion, wenn der Spieler bereits in der Lobby ist
                }
    
                // Füge den neuen Spieler hinzu
                lobbies[lobbyCode].players.push({ id: socket.id, name: nickname });
    
                // Setze den Host, wenn dies der erste Spieler ist
                if (lobbies[lobbyCode].players.length === 1) {
                    lobbies[lobbyCode].hostId = socket.id; // Setze den Host auf den ersten Spieler
                }
    
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
        const lobbyCode = Object.keys(lobbies).find(code => lobbies[code].players.some(player => player.id === socket.id));
        if (lobbyCode && socket.id === lobbies[lobbyCode].hostId) {
            const index = lobbies[lobbyCode].players.findIndex(player => player.id === playerId);
            if (index !== -1) {
                const playerName = lobbies[lobbyCode].players[index].name;
                lobbies[lobbyCode].players.splice(index, 1);
                io.to(lobbyCode).emit('playerJoined', lobbies[lobbyCode].players.map(player => ({
                    id: player.id,
                    name: player.name,
                    isHost: player.id === lobbies[lobbyCode].hostId
                })));
    
                // Sende die Nachricht an den gekickten Spieler
                const playerSocket = io.sockets.sockets.get(playerId);
                if (playerSocket) {
                    playerSocket.emit('redirectToHome', `Du wurdest von ${playerName} aus der Lobby ${lobbyCode} gekickt.`);
                    playerSocket.disconnect(); // Trenne den Spieler
                }
                console.log(`Spieler ${playerName} wurde von ${socket.id} gekickt.`);
            }
        }
    });

    // Spieler trennt die Verbindung
    socket.on('disconnect', () => {
        console.log('Ein Spieler hat sich getrennt:', socket.id);
        for (const lobbyCode in lobbies) {
            const index = lobbies[lobbyCode].players.findIndex(player => player.id === socket.id);
            if (index !== -1) {
                // Spieler aus der Lobby entfernen
                const playerName = lobbies[lobbyCode].players[index].name; // Spielername speichern
                lobbies[lobbyCode].players.splice(index, 1);
                
                // Wenn der Host die Lobby verlässt, setze den neuen Host
                if (lobbies[lobbyCode].hostId === socket.id) {
                    if (lobbies[lobbyCode].players.length > 0) {
                        // Setze den neuen Host auf den ersten Spieler in der Liste
                        lobbies[lobbyCode].hostId = lobbies[lobbyCode].players[0].id;
                        console.log(`Neuer Host für Lobby ${lobbyCode} ist ${lobbies[lobbyCode].players[0].name} (ID: ${lobbies[lobbyCode].players[0].id})`);
                    } else {
                        // Lobby schließen, wenn keine Spieler mehr vorhanden sind
                        setTimeout(() => {
                            if (lobbies[lobbyCode].players.length === 0) {
                                delete lobbies[lobbyCode];
                                console.log(`Lobby ${lobbyCode} wurde entfernt, da sie leer ist.`);
                            }
                        }, DISCONNECT_DELAY);
                    }
                }

                // Informiere alle verbleibenden Spieler über die aktualisierte Spieler-Liste
                io.to(lobbyCode).emit('playerJoined', lobbies[lobbyCode].players.map(player => ({
                    id: player.id,
                    name: player.name,
                    isHost: player.id === lobbies[lobbyCode].hostId // Aktualisiere den Host-Status
                }))); // Aktualisiere die Spieler-Liste
                
                break; // Beende die Schleife, nachdem der Spieler gefunden und entfernt wurde
            }
        }
    });
});

// Hilfsfunktionen
function generateLobbyCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
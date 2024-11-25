const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let lobbies = {}; // Speichert die Lobbys und ihre Spieler

app.use(express.static('public')); // Statische Dateien (HTML, CSS, JS)

io.on('connection', (socket) => {
    console.log('Ein Spieler hat sich verbunden: ' + socket.id);

    socket.on('createLobby', () => {
        const lobbyCode = Math.random().toString(36).substring(2, 8); // Generiere einen Lobby-Code
        lobbies[lobbyCode] = { players: [], host: socket.id, currentWord: '', streak: 0 };
        socket.join(lobbyCode);
        socket.emit('lobbyCreated', lobbyCode);
    });

    socket.on('joinLobby', (lobbyCode) => {
        if (lobbies[lobbyCode] && lobbies[lobbyCode].players.length < 4) {
            lobbies[lobbyCode].players.push(socket.id);
            socket.join(lobbyCode);
            io.to(lobbyCode).emit('playerJoined', lobbies[lobbyCode].players);
        } else {
            socket.emit('lobbyFull');
        }
    });

    socket.on('startGame', (lobbyCode) => {
        if (lobbies[lobbyCode].players.length >= 2) {
            lobbies[lobbyCode].currentWord = generateWord(); // Funktion zum Generieren des Überbegriffs
            io.to(lobbyCode).emit('gameStarted', lobbies[lobbyCode].currentWord);
        }
    });

    socket.on('reveal', (lobbyCode, association) => {
        lobbies[lobbyCode].players.forEach(playerId => {
            io.to(playerId).emit('revealAssociation', association);
        });
    });

    socket.on('checkAnswer', (lobbyCode, answer) => {
        const correctAnswer = lobbies[lobbyCode].currentWord; // Hier könnte die Logik zum Überprüfen der Antworten implementiert werden
        if (answer === correctAnswer) {
            lobbies[lobbyCode].streak++;
            io.to(lobbyCode).emit('answerResult', 'correct', lobbies[lobbyCode].streak);
        } else {
            lobbies[lobbyCode].streak = 0;
            io.to(lobbyCode).emit('answerResult', 'incorrect', lobbies[lobbyCode].streak);
        }
    });

    socket.on('nextWord', (lobbyCode) => {
        lobbies[lobbyCode].currentWord = generateWord(); // Nächsten Überbegriff generieren
        io.to(lobbyCode).emit('nextWord', lobbies[lobbyCode].currentWord);
    });
});

function generateWord() {
    const words = ['Natur', 'Technologie', 'Essen', 'Sport']; // Beispielüberbegriffe
    return words[Math.floor(Math.random() * words.length)];
}

server.listen(3000, () => {
    console.log('Server läuft auf http://localhost:3000');
});
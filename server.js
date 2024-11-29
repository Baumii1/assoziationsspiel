const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let lobbies = {}; // Stores the lobbies and players

// Middleware for static files
app.use(express.static('public'));

// Server start
server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A player has connected:', socket.id);

    // Create a lobby
    socket.on('createLobby', () => {
        const lobbyCode = generateLobbyCode();
        lobbies[lobbyCode] = { players: [], currentWord: '' };
        socket.join(lobbyCode);
        socket.emit('lobbyCreated', lobbyCode);
    });

    // Join a lobby
    socket.on('joinLobby', (lobbyCode) => {
        if (lobbies[lobbyCode]) {
            if (lobbies[lobbyCode].players.length < 4) {
                lobbies[lobbyCode].players.push(socket.id);
                socket.join(lobbyCode);
                io.to(lobbyCode).emit('playerJoined', lobbies[lobbyCode].players);
                checkPlayerCount(lobbyCode);
            } else {
                socket.emit('error', 'The lobby is full. Maximum 4 players allowed.');
            }
        } else {
            socket.emit('error', 'Lobby not found');
        }
    });

    // Function to check the number of players
    function checkPlayerCount(lobbyCode) {
        const playerCount = lobbies[lobbyCode].players.length;
        if (playerCount >= 2) {
            io.to(lobbyCode).emit('startGame', getNewWord());
        }
    }

    // Start the game
    socket.on('startGame', (lobbyCode) => {
        const word = getNewWord();
        lobbies[lobbyCode].currentWord = word;
        io.to(lobbyCode).emit('gameStarted', word);
    });

    // Reveal the association
    socket.on('reveal', (lobbyCode, association) => {
        io.to(lobbyCode).emit('revealAssociation', association);
    });

    // Check the answer
    socket.on('checkAnswer', (lobbyCode, currentWord) => {
        const result = checkAnswer(currentWord); // Logic to check the answer
        const currentStreak = updateStreak(socket.id, result); // Update the streak
        io.to(lobbyCode).emit('answerResult', result, currentStreak);
    });

    // Get the next word
    socket.on('nextWord', (lobbyCode) => {
        const word = getNewWord();
        lobbies[lobbyCode].currentWord = word;
        io.to(lobbyCode).emit('nextWord', word);
    });

    // Player disconnect
    socket.on('disconnect', () => {
        console.log('A player has disconnected:', socket.id);
        for (const lobbyCode in lobbies) {
            const index = lobbies[lobbyCode].players.indexOf(socket.id);
            if (index !== -1) {
                lobbies[lobbyCode].players.splice(index, 1);
                io.to(lobbyCode).emit('playerJoined', lobbies[lobbyCode].players);
                break;
            }
        }
    });
});

// Helper functions

// Generate a random lobby code
function generateLobbyCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Get a new word (dummy function)
function getNewWord() {
    const words = ['Apple', 'Banana', 'Cherry', 'Dragon Fruit', 'Elderberry'];
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
}

// Check the answer (dummy logic)
function checkAnswer(currentWord) {
    // Logic to check the answer
    return Math.random() > 0.5 ? 'correct' : 'incorrect';
}

// Update the streak (dummy logic)
function updateStreak(playerId, result) {
    // Logic to update the streak
    return result === 'correct' ? 1 : 0;
}
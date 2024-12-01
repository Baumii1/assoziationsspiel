const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

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
const MIN_PLAYERS = 2; // Minimale Spieleranzahl zum Starten des Spiels

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
        lobbies[lobbyCode] = { players: [], hostId: socket.id, gameActive: false }; // Host-ID speichern
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

        if (!lobbies[lobbyCode]) {
            socket.emit('error', 'Lobby nicht gefunden.');
            return; // Beende die Funktion, wenn die Lobby nicht existiert
        }

        if (lobbies[lobbyCode].players.length < 4) {
            const existingPlayerIndex = lobbies[lobbyCode].players.findIndex(player => player.id === socket.id);
            if (existingPlayerIndex !== -1) {
                socket.emit('error', 'Du bist bereits in dieser Lobby.');
                return; // Beende die Funktion, wenn der Spieler bereits in der Lobby ist
            }

            // Füge den neuen Spieler hinzu
            lobbies[lobbyCode].players.push({ id: socket.id, name: nickname, revealed: false });

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
        
        const lobbyCode = Object.keys(lobbies).find(code => lobbies[code].players.some(player => player.id === socket.id));
        if (lobbyCode) {
            const playerIndex = lobbies[lobbyCode].players.findIndex(player => player.id === socket.id);
            if (playerIndex !== -1) {
                // Spieler aus der Lobby entfernen
                lobbies[lobbyCode].players.splice(playerIndex, 1);
                io.to(lobbyCode).emit('playerLeft', socket.id); // Sende das Event an die verbleibenden Spieler

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

                // Überprüfen, ob das Spiel gestoppt werden soll
                if (lobbies[lobbyCode].gameActive && lobbies[lobbyCode].players.length < MIN_PLAYERS) {
                    lobbies[lobbyCode].gameActive = false; // Setze das Spiel auf nicht aktiv
                    io.to(lobbyCode).emit('gameStopped');
                    console.log(`Das Spiel in der Lobby ${lobbyCode} wurde gestoppt, da weniger als ${MIN_PLAYERS} Spieler vorhanden sind.`);
                    
                    // Starte einen Timer, um die Spieler zurück zur Lobby zu schicken
                    const restartTimer = setTimeout(() => {
                        io.to(lobbyCode).emit('redirectToLobby'); // Sende das Event, um zur Lobby zurückzukehren
                        delete lobbies[lobbyCode]; // Lösche die Lobby, wenn sie leer ist
                    }, 30000); // 15 Sekunden warten

                    // Wenn ein Spieler wieder beitritt, stoppe den Timer und starte das Spiel neu
                    socket.on('joinLobby', ({ lobbyCode, nickname }) => {
                        if (lobbies[lobbyCode].players.length >= MIN_PLAYERS) {
                            clearTimeout(restartTimer); // Stoppe den Timer
                            lobbies[lobbyCode].gameActive = true; // Setze das Spiel auf aktiv
                            io.to(lobbyCode).emit('gameStarted');
                            console.log(`Das Spiel in der Lobby ${lobbyCode} wurde neu gestartet, weil ein Spieler beigetreten ist.`);
                        }
                    });
                }
            }
        }
    });

    // Spiel starten
    socket.on('startGame', (lobbyCode) => {
        if (lobbies[lobbyCode] && lobbies[lobbyCode].players.length >= MIN_PLAYERS) {
            getRandomWord().then(word => {
                lobbies[lobbyCode].currentWord = word; // Speichere den aktuellen Begriff
                lobbies[lobbyCode].gameActive = true; // Setze das Spiel auf aktiv
                io.to(lobbyCode).emit('gameStarted', word); // Sende den Begriff an alle Spieler
            }).catch(error => {
                socket.emit('error', 'Fehler beim Abrufen des Begriffs: ' + error);
            });
        } else {
            socket.emit('error', 'Nicht genügend Spieler, um das Spiel zu starten.');
        }
    });
    

    // Stoppe das Spiel
    socket.on('stopGame', (lobbyCode) => {
        if (lobbies[lobbyCode] && socket.id === lobbies[lobbyCode].hostId) {
            lobbies[lobbyCode].gameActive = false; // Setze das Spiel auf nicht aktiv
            io.to(lobbyCode).emit('gameStopped');
            console.log(`Das Spiel in der Lobby ${lobbyCode} wurde gestoppt.`);

            // Setze die Lobby zurück
            lobbies[lobbyCode].players.forEach(player => {
                player.revealed = false; // Setze den Reveal-Status zurück
            });

            // Setze andere Spielvariablen zurück
            lobbies[lobbyCode].currentWord = null; // Aktuellen Begriff zurücksetzen
        } else {
            socket.emit('error', 'Nur der Host kann das Spiel stoppen.');
        }
    });

    // Spieler hat ein Wort aufgedeckt
    socket.on('playerRevealed', ({ playerId, word }) => {
        const lobbyCode = Object.keys(lobbies).find(code => lobbies[code].players.some(player => player.id === playerId));
        if (lobbyCode) {
            // Erhöhe den Reveal-Zähler und benachrichtige alle Spieler
            const currentLobby = lobbies[lobbyCode];
            const revealedPlayers = currentLobby.players.filter(player => player.revealed).length;
            currentLobby.players.find(p => p.id === playerId).revealed = true; // Markiere den Spieler als revealed
            io.to(lobbyCode).emit('updateRevealCount', revealedPlayers); // Sende die aktualisierte Anzahl der revealed Spieler
        }
    });

    // Spieler hat das Spiel gestartet
    socket.on('evaluateAnswers', () => {
        const lobbyCode = Object.keys(lobbies).find(code => lobbies[code].players.some(player => player.id === socket.id));
        if (lobbyCode) {
            const revealedWords = lobbies[lobbyCode].players.map(player => player.revealed ? player.word : null).filter(Boolean);
            io.to(lobbyCode).emit('evaluateAnswers', revealedWords); // Sende die Wörter zur Auswertung
        }
    });

    // Funktion um einen zufälligen Begriff aus word.json zu holen
    function getRandomWord() {
        return new Promise((resolve, reject) => {
            fs.readFile(path.join(__dirname, 'public', 'word.json'), 'utf8', (err, data) => {
                if (err) {
                    reject('Fehler beim Lesen der Datei: ' + err);
                } else {
                    try {
                        const words = JSON.parse(data); // Versuche, die Daten zu parsen
                        if (!Array.isArray(words) || words.length === 0) {
                            reject('Das Format der Datei ist ungültig oder das Array ist leer.');
                        } else {
                            const randomIndex = Math.floor(Math.random() * words.length);
                            resolve(words[randomIndex]); // Gebe den zufälligen Begriff zurück
                        }
                    } catch (parseError) {
                        reject('Fehler beim Parsen der JSON-Daten: ' + parseError.message);
                    }
                }
            });
        });
    }
    });

// Hilfsfunktionen
function generateLobbyCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
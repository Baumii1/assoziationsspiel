document.addEventListener('DOMContentLoaded', () => {
    const createLobbyButton = document.getElementById('create-lobby');
    const joinLobbyButton = document.getElementById('join-lobby');
    const gameScreen = document.getElementById('game-screen');
    const startScreen = document.getElementById('start-screen');
    const resultScreen = document.getElementById('result-screen');
    const playersDiv = document.getElementById('players');
    const currentWordDisplay = document.getElementById('current-word');
    const resultsDiv = document.getElementById('results');
    const socket = io("https://assoziationsspiel-backend-dcf85e77dc96.herokuapp.com/"); // Socket.io instance

    let lobbyCode;
    let players = [];
    let currentWord = '';
    let streak = 0;
    let playerCount = 0; // Counter for the number of players

    // Event listener for creating a lobby
    createLobbyButton.addEventListener('click', () => {
        socket.emit('createLobby');
    });

    // Event listener for joining a lobby
    joinLobbyButton.addEventListener('click', () => {
        lobbyCode = prompt('Enter the lobby code:');
        if (lobbyCode) {
            socket.emit('joinLobby', lobbyCode);
        }
    });

    // Socket.io event: Lobby created
    socket.on('lobbyCreated', (code) => {
        lobbyCode = code;
        alert(`Lobby created! Code: ${lobbyCode}`);
        startGame();
    });

    // Socket.io event: Player joined
    socket.on('playerJoined', (playersList) => {
        players = playersList;
        playerCount = players.length;
        updatePlayersDisplay();
        checkPlayerCount();
    });

    // Function to check the number of players
    function checkPlayerCount() {
        if (playerCount >= 2 && playerCount <= 4) {
            alert(`There are ${playerCount} players in the lobby. The game can start!`);
            // Start the game automatically if the count is sufficient
            if (playerCount === 4) {
                startGame();
            }
        } else {
            alert('There must be at least 2 and at most 4 players in the lobby.');
        }
    }

    // Function to start the game
    function startGame() {
        startScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        socket.emit('startGame', lobbyCode);
    }

    // Socket.io event: Game started
    socket.on('gameStarted', (word) => {
        currentWord = word;
        currentWordDisplay.textContent = `Association: ${currentWord}`;
    });

    // Update the players display
    function updatePlayersDisplay() {
        playersDiv.innerHTML = ''; // Clear the players display
        players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.textContent = player;
            playersDiv.appendChild(playerElement);
        });
    }

    // Event listener for the reveal button
    document.getElementById('reveal').addEventListener('click', () => {
        socket.emit('reveal', lobbyCode, currentWord);
    });

    // Socket.io event: Reveal information
    socket.on('revealAssociation', (association) => {
        alert(`The association is: ${association}`);
    });

    // Event listener for the result buttons
    document.getElementById('correct').addEventListener('click', () => {
        streak++;
        socket.emit('checkAnswer', lobbyCode, currentWord);
        alert(`Streak increased! Current streak: ${streak}`);
        startGame();
    });

    document.getElementById('incorrect').addEventListener('click', () => {
        streak = 0;
        alert('Streak reset!');
        startGame();
    });

    // Socket.io event: Answer result
    socket.on('answerResult', (result, currentStreak) => {
        if (result === 'correct') {
            alert(`Correct! Current streak: ${currentStreak}`);
        } else {
            alert(` Incorrect! Streak reset.`);
        }
    });

    // Event listener for the next word
    document.getElementById('next').addEventListener('click', () => {
        socket.emit('nextWord', lobbyCode);
    });

    // Socket.io event: Next word
    socket.on('nextWord', (word) => {
        currentWord = word;
        currentWordDisplay.textContent = `Association: ${currentWord}`;
    });

    // Initialize the game
    function initializeGame() {
        socket.on('connect', () => {
            console.log('Connected to the server');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from the server');
        });
    }

    // Call to initialize the game
    initializeGame();
});
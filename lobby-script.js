document.addEventListener('DOMContentLoaded', () => {
    const socket = io("https://assoziationsspiel-backend-dcf85e77dc96.herokuapp.com/");
    const playersDiv = document.getElementById('players');
    const startGameButton = document.getElementById('start-game');
    const lobbyCodeDisplay = document.getElementById('lobbyCode');
    const copyButton = document.getElementById('copy-button');
    const errorMessageDiv = document.getElementById('error-message');
    const popupMessage = document.getElementById('popup-message');
    const currentWordDisplay = document.getElementById('current-word');
    const associationInput = document.getElementById('association-word');
    const revealButton = document.getElementById('reveal-button');
    const revealCountDisplay = document.getElementById('reveal-count');

    // Lobby-Code aus der URL abrufen
    const lobbyCode = new URLSearchParams(window.location.search).get('lobbyCode');
    lobbyCodeDisplay.textContent = lobbyCode;

    // Nickname aus Cookies abrufen
    const nickname = getCookie('nickname');

    // Spieler der Lobby beitreten
    socket.emit('joinLobby', { lobbyCode, nickname });

    // Event-Listener für den Copy-Button
    copyButton.addEventListener('click', function() {
        const range = document.createRange();
        range.selectNode(lobbyCodeDisplay);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');

        popupMessage.textContent = 'Lobby-Code kopiert: ' + lobbyCodeDisplay.textContent;
        popupMessage.style.display = 'block';

        setTimeout(() => {
            popupMessage.style.display = 'none';
        }, 3000);

        window.getSelection().removeAllRanges();
    });

    let revealCount = 0; // Zähler für Reveals
    let totalPlayers = 0; // Gesamtanzahl der Spieler
    let gameActive = false; // Flag, um den Spielstatus zu verfolgen
    let countdownTimer; // Timer für den Countdown
    let streak = 0; // Streak-Zähler

    // Spiel starten
    startGameButton.addEventListener('click', () => {
        socket.emit('startGame', lobbyCode);
        console.log('Spiel wird gestartet...');
    });

    // Socket.io Ereignis für das Spiel starten
    socket.on('gameStarted', (word) => {
        gameActive = true; // Spiel ist aktiv
        currentWordDisplay.textContent = word; // Setze den aktuellen Begriff anzuzeigen
        currentWordDisplay.classList.remove('hidden');

        // Zeige die Spieler mit Statuspunkten an
        playersDiv.innerHTML = ''; // Leere die Spieler-Liste
        playersList.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.classList.add('player');

            // Erstelle den Punkt
            const statusDot = document.createElement('span');
            statusDot.classList.add('status-dot');
            statusDot.classList.add(player.revealed ? 'revealed' : 'not-revealed'); // Füge die entsprechende Klasse hinzu

            playerElement.appendChild(statusDot); // Füge den Punkt zum Spieler-Element hinzu
            playerElement.appendChild(document.createTextNode(player.name)); // Füge den Spielernamen hinzu

            playersDiv.appendChild(playerElement);
        });

        const playerCount = document.getElementById('player-count');
        playerCount.style.position = 'absolute';
        playerCount.style.top = '20px';
        playerCount.style.right = '20px';
        playerCount.style.fontSize = "16px";
        playersDiv.style.position = 'absolute';
        playersDiv.style.top = '50px';
        playersDiv.style.right = '20px';
        playersDiv.style.width = '200px';

        associationInput.classList.remove('hidden');
        revealButton.classList.remove('hidden');
        revealCountDisplay.classList.remove('hidden');

        startGameButton.style.display = 'none';

        revealCount = 0;
        updateRevealCount();
    });

    // Event-Listener für den Reveal-Button
    revealButton.addEventListener('click', () => {
        if (associationInput.disabled) {
            // Wenn das Eingabefeld deaktiviert ist, aktiviere es (Unreveal)
            associationInput.disabled = false; 
            revealButton.textContent = 'Reveal'; // Button-Text ändern

            // Reduziere die Anzahl der Reveals
            revealCount--; 
            socket.emit('playerUnrevealed', { playerId: socket.id }); // Sende Unreveal an den Server
        } else {
            // Wenn das Eingabefeld aktiviert ist, deaktiviere es (Reveal)
            associationInput.disabled = true; 
            revealButton.textContent = 'Unreveal'; // Button-Text ändern

            // Sende Reveal an den Server
            socket.emit('playerRevealed', { playerId: socket.id, word: associationInput.value });

            // Erhöhe die Anzahl der Reveals
            revealCount++; 
        }

        // Aktualisiere die Anzeige der Reveals
        updateRevealCount(); 
        
        // Überprüfen, ob alle Spieler revealed haben
        if (revealCount === totalPlayers) {
            console.log('Alle Spieler haben revealed!');
            socket.emit('evaluateAnswers'); // Sende Event zur Auswertung der Antworten
        }
    });

    // Spieler hat ein Wort revealed
    socket.on('playerRevealed', ({ playerId }) => {
        const playerElements = document.querySelectorAll('.player');
        playerElements.forEach(playerElement => {
            const playerName = playerElement.textContent.trim();
            if (playerName === playerId) {
                const statusDot = playerElement.querySelector('.status-dot');
                statusDot.classList.remove('not-revealed');
                statusDot.classList.add('revealed');
            }
        });
    });

    // Socket.io Ereignis für das Stoppen des Spiels
    socket.on('gameStopped', () => {
        // Spieler zurück zur Lobby schicken
        const messageDiv = document.getElementById('error-message');
        messageDiv.textContent = 'Das Spiel wurde gestoppt. Du wirst zurück zur Lobby geleitet.';
        messageDiv.classList.remove('hidden');

        setTimeout(() => {
            // Hier kannst du zur Lobby-Seite weiterleiten
            window.location.href = 'index.html'; // Oder die URL zur Lobby-Seite anpassen
        }, 3000); // Warte 3 Sekunden, bevor du zur Lobby weiterleitest
    });

    // Spieler der Lobby beitreten
socket.on('playerJoined', (playersList) => {
    playersDiv.innerHTML = '';
    playersList.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.classList.add('player');

        // Erstelle den Punkt
        const statusDot = document.createElement('span');
        statusDot.classList.add('status-dot');
        statusDot.classList.add(player.revealed ? 'revealed' : 'not-revealed'); // Füge die entsprechende Klasse hinzu

        playerElement.appendChild(statusDot); // Füge den Punkt zum Spieler-Element hinzu

        // Spielername zentrieren
        const playerName = document.createElement('span');
        playerName.classList.add('player-name');
        playerName.textContent = player.name;
        playerElement.appendChild(playerName); // Füge den Spielernamen hinzu

        // Host-Badge hinzufügen, wenn der Spieler der Host ist
        if (player.isHost) {
            const hostBadge = document.createElement('span');
            hostBadge.classList.add('host-badge');
            hostBadge.textContent = 'Host';
            playerElement.appendChild(hostBadge); // Füge den Host-Badge hinzu
        }

        // Kick-Button hinzufügen
        const kickButton = document.createElement('button');
        kickButton.classList.add('kick-button');
        kickButton.innerHTML = '<img src="kick-icon.png" alt="Kick" class="kick-icon" />';
        kickButton.onclick = () => {
            socket.emit('kickPlayer', player.id);
        };
        playerElement.appendChild(kickButton); // Füge den Kick-Button hinzu

        playersDiv.appendChild(playerElement); // Füge das Spieler-Element zur Liste hinzu
    });

    totalPlayers = playersList.length; // Gesamtanzahl der Spieler aktualisieren
    updateRevealCount(); // Aktualisiere die Anzeige der Reveals

    const playerCountDiv = document.getElementById('player-count');
    playerCountDiv.textContent = `Spieler in der Lobby (${totalPlayers}/4):`;

    // Überprüfen, ob genügend Spieler vorhanden sind
    const isHost = playersList.some(player => player.id === socket.id && player.isHost);
    if (totalPlayers < 2) {
        startGameButton.style.display = 'none'; // Start-Button ausblenden
        if (gameActive) {
            stopGame(); // Stoppe das Spiel, wenn weniger als 2 Spieler
        }
    } else {
        startGameButton.style.display = isHost ? 'block' : 'none'; // Spiel starten Button anzeigen, wenn Host
    }
});

    // Fehlerbehandlung
    socket.on('error', (errorMessage) => {
        showErrorMessage(errorMessage);
    });

    socket.on('redirectToHome', (message) => {
        console.log('Redirecting to home with message:', message);
        const messageDiv = document.getElementById('error-message');
        messageDiv.textContent = message;
        messageDiv.classList.remove('hidden');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    });

    // Synchronisation der Reveals
    socket.on('updateRevealCount', (count) => {
        revealCount = count; // Aktualisiere den Reveal-Zähler
        updateRevealCount(); // Aktualisiere die Anzeige
    });

    // Socket.io Ereignis für die Auswertung der Antworten
    socket.on('evaluateAnswers', (revealedWords) => {
        // Blende den Spielbildschirm aus und zeige den Auswertungsbildschirm an
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('evaluation-screen').classList.remove('hidden');
    
        // Zeige die Wörter der Spieler an
        const revealedWordsDiv = document.getElementById('revealed-words');
        revealedWordsDiv.innerHTML = ''; // Leere vorherige Wörter
        revealedWords.forEach(word => {
            const wordBox = document.createElement('div');
            wordBox.textContent = word; // Setze den Text des Wortes
            revealedWordsDiv.appendChild(wordBox); // Füge die Box hinzu
        });
    
        // Blende das Eingabefeld und den Reveal-Button aus
        associationInput.classList.add('hidden');
        revealButton.classList.add('hidden');
        revealCountDisplay.classList.add('hidden'); // Blende die Anzahl der Reveals aus
    
        // Zeige die Antwort-Buttons nur für den Host an
        const isHost = revealedWords.some(player => player.id === socket.id && player.isHost);
        document.getElementById('answer-buttons').style.display = isHost ? 'flex' : 'none';
    
        // Event-Listener für die Antwort-Buttons
        const correctButton = document.getElementById('correct-button');
        const wrongButton = document.getElementById('wrong-button');
    
        // Entferne vorherige Event-Listener, um Duplikate zu vermeiden
        correctButton.removeEventListener('click', handleCorrect);
        wrongButton.removeEventListener('click', handleWrong);
    
        // Hinzufügen der neuen Event-Listener
        correctButton.addEventListener('click', handleCorrect);
        wrongButton.addEventListener('click', handleWrong);
    });
    
    // Funktion für den korrekten Button
    function handleCorrect() {
        streak++; // Erhöhe den Streak
        updateStreakDisplay(); // Aktualisiere die Streak-Anzeige
        nextWord(); // Gehe zum nächsten Wort
    }
    
    // Funktion für den falschen Button
    function handleWrong() {
        streak = 0; // Setze den Streak zurück
        updateStreakDisplay(); // Aktualisiere die Streak-Anzeige
        nextWord(); // Gehe zum nächsten Wort
    }

    // Funktion zur Aktualisierung der Streak-Anzeige
    function updateStreakDisplay() {
        document.getElementById('streak').textContent = `Streak: ${streak}`;
    }

    // Funktion für den nächsten Begriff
    function nextWord() {
        // Blende die Antwort-Buttons aus und zeige den Weiter-Button an
        document.getElementById('answer-buttons').style.display = 'none';
        document.getElementById('next-word-button').classList.remove('hidden');

        // Event-Listener für den Weiter-Button
        document.getElementById('next-word-button').onclick = () => {
            socket.emit('startGame', lobbyCode); // Starte das nächste Spiel
            document.getElementById('next-word-button').classList.add('hidden'); // Blende den Button aus
        };
    }

    // Funktion zur Aktualisierung der Reveal-Anzeige
    function updateRevealCount() {
        revealCountDisplay.textContent = `Reveals: ${revealCount}/${totalPlayers}`;
    }

    // Timer für das Stoppen des Spiels
    function stopGame() {
        clearTimeout(countdownTimer);
        const messageDiv = document.getElementById('error-message');
        messageDiv.textContent = 'Das Spiel wird in 30 Sekunden gestoppt, da weniger als 2 Spieler vorhanden sind.';
        messageDiv.classList.remove('hidden');

        let countdown = 30;
        countdownTimer = setInterval(() => {
            countdown--;
            messageDiv.textContent = `Das Spiel wird in ${countdown} Sekunden gestoppt.`;
            if (countdown <= 0) {
                clearInterval(countdownTimer);
                socket.emit('stopGame', lobbyCode); // Stoppe das Spiel und gehe zurück zur Lobby
            }
        }, 1000);
    }

    // Beispiel für die Fehlerbehandlung
    function showErrorMessage(message) {
        const messageDiv = document.getElementById('error-message');
        messageDiv.textContent = message;
        messageDiv.classList.remove('hidden');

        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000); // 5 Sekunden
    }

    // Funktion zum Abrufen eines Cookies
    function getCookie(name) {
        return document.cookie.split('; ').reduce((r, v) => {
            const parts = v.split('=');
            return parts[0] === name ? decodeURIComponent(parts[1]) : r;
        }, '');
    }

    // Spieler verlassen das Spiel
    socket.on('playerLeft', (playerId) => {
        if (gameActive) {
            totalPlayers--; // Spieleranzahl verringern
            updateRevealCount(); // Aktualisiere die Anzeige der Reveals
            if (totalPlayers < 2) {
                stopGame(); // Stoppe das Spiel, wenn weniger als 2 Spieler
            }
        }
    });
});
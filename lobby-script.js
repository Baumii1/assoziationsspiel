document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM vollständig geladen. Initialisiere Socket.io...');
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

    let isHost = false; // Variable für den Host-Status

    // Lobby-Code aus der URL abrufen
    const lobbyCode = new URLSearchParams(window.location.search).get('lobbyCode');
    console.log(`Lobby-Code abgerufen: ${lobbyCode}`);
    lobbyCodeDisplay.textContent = lobbyCode;

    // Nickname aus Cookies abrufen
    const nickname = getCookie('nickname');
    console.log(`Nickname aus Cookies abgerufen: ${nickname}`);

    // Spieler der Lobby beitreten
    console.log('Sende Join-Lobby-Event...');
    socket.emit('joinLobby', { lobbyCode, nickname });

    // Event-Listener für den Copy-Button
    copyButton.addEventListener('click', function() {
        console.log('Copy-Button wurde geklickt.');
        const range = document.createRange();
        range.selectNode(lobbyCodeDisplay);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');

        popupMessage.textContent = 'Lobby-Code kopiert: ' + lobbyCodeDisplay.textContent;
        popupMessage.style.display = 'block';
        console.log('Popup-Nachricht angezeigt: ' + popupMessage.textContent);

        setTimeout(() => {
            popupMessage.style.display = 'none';
            console.log('Popup-Nachricht nach 3 Sekunden ausgeblendet.');
        }, 3000);

        window.getSelection().removeAllRanges();
    });

    let totalPlayers = 0; // Gesamtanzahl der Spieler
    let gameActive = false; // Flag, um den Spielstatus zu verfolgen
    let countdownTimer; // Timer für den Countdown
    let streak = 0; // Streak-Zähler

    // Spiel starten
    startGameButton.addEventListener('click', () => {
        console.log('Start-Button wurde geklickt. Spiel wird gestartet...');
        socket.emit('startGame', lobbyCode);
    });

    // Socket.io Ereignis für das Spiel starten
    socket.on('gameStarted', (word, playersList) => {
        console.log('Spiel gestartet. Aktuelles Wort:', word);
        gameActive = true; // Spiel ist aktiv
        currentWordDisplay.textContent = word; // Setze den aktuellen Begriff anzuzeigen
        currentWordDisplay.classList.remove('hidden');

        // Zeige die Spieler mit Statuspunkten an
        playersDiv.innerHTML = ''; // Leere die Spieler-Liste
        playersList.forEach(player => {
            console.log(`Füge Spieler hinzu: ${player.name}, revealed: ${player.revealed}`);
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
                console.log(`Host-Badge hinzugefügt für Spieler: ${player.name}`);
            } else {
                // Kick-Button nur für den Host anzeigen
                isHost = playersList.some(p => p.id === socket.id && p.isHost);
                if (isHost) {
                    const kickButton = document.createElement('button');
                    kickButton.classList.add('kick-button');
                    kickButton.innerHTML = '<img src="kick-icon.png" alt="Kick" class="kick-icon" />';
                    kickButton.onclick = () => {
                        console.log(`Kick-Button geklickt für Spieler: ${player.name}`);
                        socket.emit('kickPlayer', player.id);
                    };
                    playerElement.appendChild(kickButton); // Füge den Kick-Button hinzu
                }
            }
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
        console.log('Spiel-UI aktualisiert. Reveal-Buttons sichtbar.');

        updateRevealCount();
    });

    // Event-Listener für den Reveal-Button
    revealButton.addEventListener('click', () => {
        console.log('Reveal-Button wurde geklickt.');
        const playerId = socket.id; // Aktueller Spieler

        if (associationInput.disabled) {
            // Unreveal-Logik
            associationInput.disabled = false; 
            revealButton.textContent = 'Reveal'; // Button-Text ändern

            // Sofortige Aktualisierung des StatusDots
            updatePlayerStatus(playerId, false); // Spieler als unrevealed markieren
            console.log(`Spieler ${playerId} hat unrevealed.`);
        } else {
            // Reveal-Logik
            associationInput.disabled = true; 
            revealButton.textContent = 'Unreveal'; // Button-Text ändern

            // Sofortige Aktualisierung des StatusDots
            updatePlayerStatus(playerId, true); // Spieler als revealed markieren
            console.log(`Spieler ${playerId} hat revealed: ${associationInput.value}`);
        }

        // Sende das Socket-Event
        socket.emit(associationInput.disabled ? 'playerRevealed' : 'playerUnrevealed', { playerId, word: associationInput.value });
    });

    // Funktion zur Aktualisierung des Spielerstatus
    function updatePlayerStatus(playerId, isRevealed) {
        const playerElements = document.querySelectorAll('.player');
        playerElements.forEach(playerElement => {
            const playerName = playerElement.querySelector('.player-name').textContent.trim();
            if (playerName === getCookie('nickname')) { // Hier sicherstellen, dass die ID korrekt ist
                const statusDot = playerElement.querySelector('.status-dot');
                if (isRevealed) {
                    statusDot.classList.remove('not-revealed');
                    statusDot.classList.add('revealed'); // Ändere den Statuspunkt zu grün
                } else {
                    statusDot.classList.remove('revealed');
                    statusDot.classList.add('not-revealed'); // Ändere den Statuspunkt zurück zu grau
                }
                console.log(`Statuspunkt für Spieler ${playerName} auf ${isRevealed ? 'revealed' : 'not-revealed'} gesetzt.`);
            }
        });
    }

    // Spieler hat ein Wort revealed
    socket.on('playerRevealed', ({ playerId }) => {
        console.log(`Spieler revealed: ${playerId}`);
        const playerElements = document.querySelectorAll('.player');
        playerElements.forEach(playerElement => {
            if (playerElement.dataset.playerId === playerId) {
                const statusDot = playerElement.querySelector('.status-dot');
                statusDot.classList.remove('not-revealed');
                statusDot.classList.add('revealed'); // Ändere den Statuspunkt zu grün
                console.log(`Statuspunkt für Spieler ${playerName} auf revealed gesetzt.`);
            }
        });

        // Aktualisiere die Anzahl der revealed Spieler
        const revealedCount = document.querySelectorAll('.revealed').length;
        updateRevealCount(revealedCount); // Rufe die aktualisierte Funktion auf
    });

    // Spieler hat ein Wort unrevealed
    socket.on('playerUnrevealed', ({ playerId }) => {
        console.log(`Spieler unrevealed: ${playerId}`);
        const playerElements = document.querySelectorAll('.player');
        playerElements.forEach(playerElement => {
            if (playerElement.dataset.playerId === playerId) {
                const statusDot = playerElement.querySelector('.status-dot');
                statusDot.classList.remove('revealed');
                statusDot.classList.add('not-revealed'); // Ändere den Statuspunkt zurück zu grau
                console.log(`Statuspunkt für Spieler ${playerName} auf not-revealed gesetzt.`);
            }
        });

        //updateRevealCount(); // Aktualisiere die Anzeige der Reveals
    });

    // Socket.io Ereignis für das Stoppen des Spiels
    socket.on('gameStopped', () => {
        console.log('Das Spiel wurde gestoppt.');
        // Spieler zurück zur Lobby schicken
        const messageDiv = document.getElementById('error-message');
        messageDiv.textContent = 'Das Spiel wurde gestoppt. Du wirst zurück zur Lobby geleitet.';
        messageDiv.classList.remove('hidden');

        setTimeout(() => {
            console.log('Leite Spieler zurück zur Lobby...');
            // Hier kannst du zur Lobby-Seite weiterleiten
            window.location.href = 'index.html'; // Oder die URL zur Lobby-Seite anpassen
        }, 3000); // Warte 3 Sekunden, bevor du zur Lobby weiterleitest
    });

    // Spieler der Lobby beitreten
    socket.on('playerJoined', (playersList) => {
        console.log('Ein Spieler hat die Lobby betreten. Aktualisiere die Spieler-Liste...');
        playersDiv.innerHTML = '';
        playersList.forEach(player => {
            console.log(`Füge Spieler hinzu: ${player.name}, revealed: ${player.revealed}`);
            const playerElement = document.createElement('div');
            playerElement.classList.add('player');
            playerElement.dataset.playerId = player.id; // Speichere die Spieler-ID im data-Attribut

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
                console.log(`Host-Badge hinzugefügt für Spieler: ${player.name}`);
            } else {
                // Kick-Button nur für den Host anzeigen
                isHost = playersList.some(p => p.id === socket.id && p.isHost);
                if (isHost) {
                    const kickButton = document.createElement('button');
                    kickButton.classList.add('kick-button');
                    kickButton.innerHTML = '<img src="kick-icon.png" alt="Kick" class="kick-icon" />';
                    kickButton.onclick = () => {
                        console.log(`Kick-Button geklickt für Spieler: ${player.name}`);
                        socket.emit('kickPlayer', player.id);
                    };
                    playerElement.appendChild(kickButton); // Füge den Kick-Button hinzu
                }
            }

            playersDiv.appendChild(playerElement); // Füge das Spieler-Element zur Liste hinzu
        });

        totalPlayers = playersList.length; // Gesamtanzahl der Spieler aktualisieren
        console.log(`Aktualisierte Spieleranzahl: ${totalPlayers}`);
        updateRevealCount(); // Aktualisiere die Anzeige der Reveals

        const playerCountDiv = document.getElementById('player-count');
        playerCountDiv.textContent = `Spieler in der Lobby (${totalPlayers}/4):`;

        // Überprüfen, ob genügend Spieler vorhanden sind
        isHost = playersList.some(player => player.id === socket.id && player.isHost);
        if (totalPlayers < 2) {
            console.log('Weniger als 2 Spieler. Start-Button wird ausgeblendet.');
            startGameButton.style.display = 'none'; // Start-Button ausblenden
            if (gameActive) {
                stopGame(); // Stoppe das Spiel, wenn weniger als 2 Spieler
            }
        } else {
            startGameButton.style.display = isHost ? 'block' : 'none'; // Spiel starten Button anzeigen, wenn Host
            console.log('Start-Button sichtbar für Host:', isHost);
        }
    });

    // Fehlerbehandlung
    socket.on('error', (errorMessage) => {
        console.error('Fehler empfangen:', errorMessage);
        showErrorMessage(errorMessage);
    });

    socket.on('redirectToHome', (message) => {
        console.log('Redirecting to home with message:', message);
        const messageDiv = document.getElementById('error-message');
        messageDiv.textContent = message;
        messageDiv.classList.remove('hidden');

        setTimeout(() => {
            console.log('Leite Spieler zurück zur Startseite...');
            window.location.href = 'index.html';
        }, 3000);
    });

    // Aktualisiere die Anzahl der revealed Spieler
    socket.on('updateRevealCount', (revealedCount) => {
        console.log(`Aktualisiere die Anzahl der revealed Spieler: ${revealedCount}`);
        updateRevealCount(revealedCount); // Rufe die aktualisierte Funktion auf
    });

    // Socket.io Ereignis für die Auswertung der Antworten
    socket.on('evaluateAnswers', (revealedWords) => {
        console.log('Beginne mit der Auswertung der Antworten...');
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('evaluation-screen').classList.remove('hidden');

        const revealedWordsDiv = document.getElementById('revealed-words');
        revealedWordsDiv.innerHTML = ''; // Leere vorherige Wörter
        revealedWords.forEach(({ word, name }) => {
            const wordBox = document.createElement('div');
            wordBox.classList.add('word-box');
            wordBox.innerHTML = `<strong>${name}:</strong> ${word}`; // Setze den Text des Wortes mit Spielernamen
            revealedWordsDiv.appendChild(wordBox); // Füge die Box hinzu
            console.log(`Wort hinzugefügt zur Auswertung: ${word}`);
        });

        // Blende das Eingabefeld und den Reveal-Button aus
        associationInput.classList.add('hidden');
        revealButton.classList.add('hidden');
        revealCountDisplay.classList.add('hidden'); // Blende die Anzahl der Reveals aus

        // Zeige die Antwort-Buttons nur für den Host an
        document.getElementById('answer-buttons').style.display = isHost ? 'flex' : 'none';
        console.log('Antwort-Buttons sichtbar für Host:', isHost);

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
        console.log('Korrekt-Button wurde geklickt.');
        streak++; // Erhöhe den Streak
        updateStreakDisplay(); // Aktualisiere die Streak-Anzeige
        nextWord(); // Gehe zum nächsten Wort
    }

    // Funktion für den falschen Button
    function handleWrong() {
        console.log('Falsch-Button wurde geklickt.');
        streak = 0; // Setze den Streak zurück
        updateStreakDisplay(); // Aktualisiere die Streak-Anzeige
        nextWord(); // Gehe zum nächsten Wort
    }

    // Funktion zur Aktualisierung der Streak-Anzeige
    function updateStreakDisplay() {
        document.getElementById('streak').textContent = `Streak: ${streak}`;
        console.log(`Streak aktualisiert: ${streak}`);
    }

    // Funktion für den nächsten Begriff
    function nextWord() {
        console.log('Gehe zum nächsten Wort...');
        // Blende die Antwort-Buttons aus und zeige den Weiter-Button an
        document.getElementById('answer-buttons').style.display = 'none';
        document.getElementById('next-word-button').classList.remove('hidden');

        // Event-Listener für den Weiter-Button
        document.getElementById('next-word-button').onclick = () => {
            console.log('Weiter-Button wurde geklickt. Starte das nächste Spiel...');
            // Resetiere alles
            resetEverything();
            socket.emit('startGame', lobbyCode); // Starte das nächste Spiel
            document.getElementById('next-word-button').classList.add('hidden'); // Blende den Button aus
        };
    }

    // Funktion zum Resetieren alles
    function resetEverything() {
        console.log('Resetiere alles...');
        // Sende eine Nachricht an den Server, um den Reset für alle Spieler auszulösen
        socket.emit('resetGame', lobbyCode);
    }

    // Socket.io Ereignis zum Resetieren des Spiels
    socket.on('resetGame', () => {
        // Blende den Auswertungsbildschirm aus
        document.getElementById('evaluation-screen').classList.add('hidden');
        // Leere die Tabelle mit den revealed words
        document.getElementById('revealed-words').innerHTML = '';
        // Resetiere den Button bei jedem Spieler
        const playerElements = document.querySelectorAll('.player');
        playerElements.forEach(playerElement => {
            const revealButton = playerElement.querySelector('.reveal-button');
            if (revealButton) {
                revealButton.textContent = 'Reveal';
                revealButton.classList.remove('revealed');
                revealButton.classList.add('not-revealed');
            }
            // Leere das Textfeld bei jedem Spieler
            const associationInput = playerElement.querySelector('.association-input');
            if (associationInput) {
                associationInput.value = '';
                associationInput.disabled = false;
            }
            // Setze den Spieler auf unrevealed
            const statusDot = playerElement.querySelector('.status-dot');
            if (statusDot) {
                statusDot.classList.remove('revealed');
                statusDot.classList.add('not-revealed');
            }
        });
    });

    // Aktualisiere die Anzahl der revealed Spieler
    function updateRevealCount(revealedCount) {
        console.log(`Aktualisiere die Anzahl der revealed Spieler: ${revealedCount}/${totalPlayers}`);
        revealCountDisplay.textContent = `Reveals: ${revealedCount}/${totalPlayers}`; // Zeige die Anzahl der revealed Spieler an

        // Überprüfen, ob alle Spieler revealed haben
        if (revealedCount === totalPlayers && totalPlayers > 1 && revealedCount > 0) {
            console.log('Alle Spieler haben revealed!');
            socket.emit('evaluateAnswers'); // Sende Event zur Auswertung der Antworten
        }
    }

    // Timer für das Stoppen des Spiels
    function stopGame() {
        console.log('Stoppe das Spiel...');
        clearTimeout(countdownTimer);
        const messageDiv = document.getElementById('error-message');
        messageDiv.textContent = 'Das Spiel wird in 30 Sekunden gestoppt, da weniger als 2 Spieler vorhanden sind.';
        messageDiv.classList.remove('hidden');

        let countdown = 30;
        countdownTimer = setInterval(() => {
            countdown--;
            messageDiv.textContent = `Das Spiel wird in ${countdown} Sekunden gestoppt.`;
            console.log(`Countdown: ${countdown} Sekunden verbleibend.`);
            if (countdown <= 0) {
                clearInterval(countdownTimer);
                console.log('Countdown abgelaufen. Stoppe das Spiel...');
                socket.emit('stopGame', lobbyCode); // Stoppe das Spiel und gehe zurück zur Lobby
            }
        }, 1000);
    }

    // Beispiel für die Fehlerbehandlung
    function showErrorMessage(message) {
        console.error('Fehler:', message);
        const messageDiv = document.getElementById('error-message');
        messageDiv.textContent = message;
        messageDiv.classList.remove('hidden');

        setTimeout(() => {
            messageDiv.classList.add('hidden');
            console.log('Fehlermeldung nach 5 Sekunden ausgeblendet.');
        }, 5000); // 5 Sekunden
    }

    // Funktion zum Abrufen eines Cookies
    function getCookie(name) {
        console.log(`Cookie abgerufen: ${name}`);
        return document.cookie.split('; ').reduce((r, v) => {
            const parts = v.split('=');
            return parts[0] === name ? decodeURIComponent(parts[1]) : r;
        }, '');
    }

    // Spieler verlassen das Spiel
    socket.on('playerLeft', (playerId) => {
        console.log(`Spieler hat das Spiel verlassen: ${playerId}`);
        if (gameActive) {
            totalPlayers--; // Spieleranzahl verringern
            updateRevealCount(); // Aktualisiere die Anzeige der Reveals
            if (totalPlayers < 2) {
                console.log('Weniger als 2 Spieler. Stoppe das Spiel...');
                stopGame(); // Stoppe das Spiel, wenn weniger als 2 Spieler
            }
        }
    });
});
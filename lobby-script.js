document.addEventListener('DOMContentLoaded', () => {
    const socket = io("https://assoziationsspiel-backend-dcf85e77dc96.herokuapp.com/");
    const playersDiv = document.getElementById('players');
    const startGameButton = document.getElementById('start-game');
    const lobbyCodeDisplay = document.getElementById('lobbyCode');
    const copyButton = document.getElementById('copy-button');
    const errorMessageDiv = document.getElementById('error-message');
    const popupMessage = document.getElementById('popup-message');

    // Lobby-Code aus der URL abrufen
    const lobbyCode = new URLSearchParams(window.location.search).get('lobbyCode');
    lobbyCodeDisplay.textContent = lobbyCode;

    // Nickname aus Cookies abrufen
    const nickname = getCookie('nickname'); // Stelle sicher, dass diese Funktion vorhanden ist

    // Spieler der Lobby beitreten
    socket.emit('joinLobby', { lobbyCode, nickname }); // Sende Lobby-Code und Nicknamen

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

    // Spielerliste aktualisieren
    socket.on('playerJoined', (playersList) => {
        playersDiv.innerHTML = ''; // Vorherige Spieler-Liste leeren
        playersList.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.classList.add('player');
            playerElement.textContent = player.name; // Spielername anzeigen
    
            // Host-Badge und Kick-Button nur für den Host anzeigen
            if (player.isHost) {
                const hostBadge = document.createElement('span');
                hostBadge.classList.add('host-badge');
                hostBadge.textContent = 'Host'; // Host-Badge
                playerElement.appendChild(hostBadge);
            } else {
                // Kick-Button nur für den Host anzeigen
                const isHost = playersList.some(p => p.id === socket.id && p.isHost);
                if (isHost) {
                    const kickButton = document.createElement('button');
                    kickButton.classList.add('kick-button');
                    kickButton.innerHTML = '<img src="kick-icon.png" alt="Kick" class="kick-icon" />';
                    kickButton.onclick = () => {
                        socket.emit('kickPlayer', player.id); // Kick-Event an den Server senden
                    };
                    playerElement.appendChild(kickButton);
                }
            }
    
            playersDiv.appendChild(playerElement); // Spieler-Element zur Liste hinzufügen
        });

        // Spieleranzahl aktualisieren
        const playerCountDiv = document.getElementById('player-count');
        const playerCount = playersList.length;
        playerCountDiv.textContent = `Spieler in der Lobby (${playerCount}/4):`;

        // Überprüfen, ob genügend Spieler vorhanden sind
        const isHost = playersList.some(player => player.id === socket.id && player.isHost);
        if (playerCount < 2) {
            startGameButton.style.display = 'none'; // Start-Button ausblenden
        } else {
            startGameButton.style.display = isHost ? 'block' : 'none'; // Spiel starten Button anzeigen, wenn Host
        }
    });

    // Fehlerbehandlung
    socket.on('error', (errorMessage) => {
        showErrorMessage(errorMessage);
    });

    socket.on('redirectToHome', (message) => {
        console.log('Redirecting to home with message:', message); // Debugging-Log
        const messageDiv = document.getElementById('error-message');
        messageDiv.textContent = message;
        messageDiv.classList.remove('hidden');
    
        // Nach 3 Sekunden zur Startseite weiterleiten
        setTimeout(() => {
            window.location.href = 'index.html'; // Zur Startseite weiterleiten
        }, 3000); // 3 Sekunden
    });

    // Spiel starten
    startGameButton.addEventListener('click', () => {
        socket.emit('startGame', lobbyCode);
        console.log('Spiel wird gestartet...');
    });

    // Beispiel für die Fehlerbehandlung
    function showErrorMessage(message) {
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = message;
        messageDiv.classList.remove('hidden'); // Fehleranzeige sichtbar machen

        // Nach 5 Sekunden die Nachricht ausblenden
        setTimeout(() => {
            messageDiv.classList.add('hidden'); // Nachricht ausblenden
        }, 5000); // 5 Sekunden
    }

    // Funktion zum Abrufen eines Cookies
    function getCookie(name) {
        return document.cookie.split('; ').reduce((r, v) => {
            const parts = v.split('=');
            return parts[0] === name ? decodeURIComponent(parts[1]) : r;
        }, '');
    }
});
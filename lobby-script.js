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
    
            // Kick-Button und Host-Badge nur für den Host anzeigen
            if (player.isHost) {
                const hostBadge = document.createElement('span');
                hostBadge.classList.add('host-badge');
                hostBadge.textContent = 'Host'; // Host-Badge
                playerElement.appendChild(hostBadge);
            }
    
            // Kick-Button nur für den Host anzeigen
            if (player.isHost) {
                const kickButton = document.createElement('button');
                kickButton.classList.add('kick-button');
                kickButton.innerHTML = '<img src="kick-icon.png" alt="Kick" class="kick-icon" />';
                kickButton.onclick = () => {
                    socket.emit('kickPlayer', player.id); // Kick-Event an den Server senden
                };
                playerElement.appendChild(kickButton);
            }
    
            playersDiv.appendChild(playerElement); // Spieler-Element zur Liste hinzufügen
        });
    
        // Überprüfen, ob der Spieler der Host ist
        const isHost = playersList.some(player => player.id === socket.id && player.isHost);
        startGameButton.style.display = isHost ? 'block' : 'none'; // Spiel starten Button anzeigen, wenn Host
    });

    // Fehlerbehandlung
    socket.on('error', (errorMessage) => {
        showErrorMessage(errorMessage);
    });

    // Spiel starten
    startGameButton.addEventListener('click', () => {
        socket.emit('startGame', lobbyCode);
        console.log('Spiel wird gestartet...');
    });

    // Funktion zur Anzeige von Fehlermeldungen
    function showErrorMessage(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.classList.remove('hidden'); // Fehleranzeige sichtbar machen
    }

    // Funktion zum Abrufen eines Cookies
    function getCookie(name) {
        return document.cookie.split('; ').reduce((r, v) => {
            const parts = v.split('=');
            return parts[0] === name ? decodeURIComponent(parts[1]) : r;
        }, '');
    }
});
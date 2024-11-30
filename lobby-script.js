document.addEventListener('DOMContentLoaded', () => {
    const socket = io("https://assoziationsspiel-backend-dcf85e77dc96.herokuapp.com/");
    const playersDiv = document.getElementById('players');
    const startGameButton = document.getElementById('start-game');
    const lobbyCodeDisplay = document.getElementById('lobbyCode'); // Das P-Element für den Lobby-Code
    const copyButton = document.getElementById('copy-button'); // Der Copy-Button
    const errorMessageDiv = document.getElementById('error-message');
    const popupMessage = document.getElementById('popup-message'); // Das Popup-Element

    // Lobby-Code aus der URL abrufen
    const lobbyCode = new URLSearchParams(window.location.search).get('lobbyCode');
    lobbyCodeDisplay.textContent = lobbyCode; // Lobby-Code anzeigen

    // Spieler der Lobby beitreten
    socket.emit('joinLobby', lobbyCode); // Spieler der Lobby beitreten

    // Weiterleitung zur Lobby-Seite
    socket.on('redirect', (url) => {
        window.location.href = url; // Weiterleitung zur Lobby-Seite
    });

    // Event-Listener für den Copy-Button
    copyButton.addEventListener('click', function() {
        const range = document.createRange();
        range.selectNode(lobbyCodeDisplay); // Wähle den Lobby-Code im P-Element aus
        window.getSelection().removeAllRanges(); // Entferne vorherige Auswahl
        window.getSelection().addRange(range); // Füge die neue Auswahl hinzu
        document.execCommand('copy'); // Kopiere den ausgewählten Text
        
        // Popup anzeigen
        popupMessage.textContent = 'Lobby-Code kopiert: ' + lobbyCodeDisplay.textContent; // Text setzen
        popupMessage.style.display = 'block'; // Popup anzeigen

        // Popup nach 3 Sekunden ausblenden
        setTimeout(() => {
            popupMessage.style.display = 'none'; // Popup ausblenden
        }, 3000);

        window.getSelection().removeAllRanges(); // Auswahl zurücksetzen
    });

    // Spielerliste aktualisieren
    socket.on('playerJoined', (playersList) => {
        playersDiv.innerHTML = ''; // Vorherige Liste leeren
        playersList.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.textContent = player;
            playersDiv.appendChild(playerElement);
        });

        // Überprüfen, ob der Spieler der Host ist
        const isHost = playersList[0] === socket.id; // Annahme: Der erste Spieler ist der Host
        startGameButton.style.display = isHost ? 'block' : 'none'; // Start-Button nur für den Host anzeigen
    });

    // Fehlerbehandlung
    socket.on('error', (errorMessage) => {
        showErrorMessage(errorMessage);
    });

    // Spiel starten
    startGameButton.addEventListener('click', () => {
        socket.emit('startGame', lobbyCode); // Spielstart an den Server senden
        console.log('Spiel wird gestartet...');
    });

    // Funktion zur Anzeige von Fehlermeldungen
    function showErrorMessage(message) {
        const errorMessageDiv = document.getElementById('error-message');
        if (errorMessageDiv) { // Überprüfen, ob das Element existiert
            errorMessageDiv.textContent = message;
        } else {
            console.error('Fehlermeldungselement nicht gefunden:', message);
        }
    }
});
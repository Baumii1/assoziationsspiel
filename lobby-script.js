document.addEventListener('DOMContentLoaded', () => {
    const socket = io("https://assoziationsspiel-backend-dcf85e77dc96.herokuapp.com/");
    const playersDiv = document.getElementById('players');
    const startGameButton = document.getElementById('start-game');
    const lobbyCodeDisplay = document.getElementById('lobbyCode'); // Das P-Element für den Lobby-Code
    const copyButton = document.getElementById('copy-button'); // Der Copy-Button
    const errorMessageDiv = document.getElementById('error-message');

    // Lobby-Code aus der URL abrufen
    const lobbyCode = new URLSearchParams(window.location.search).get('lobbyCode');
    lobbyCodeDisplay.textContent = lobbyCode; // Lobby-Code anzeigen

    // Event-Listener für den Copy-Button
    copyButton.addEventListener('click', function() {
        const range = document.createRange();
        range.selectNode(lobbyCodeDisplay); // Wähle den Lobby-Code im P-Element aus
        window.getSelection().removeAllRanges(); // Entferne vorherige Auswahl
        window.getSelection().addRange(range); // Füge die neue Auswahl hinzu
        document.execCommand('copy'); // Kopiere den ausgewählten Text
        alert('Lobby-Code kopiert: ' + lobbyCodeDisplay.textContent); // Bestätigungsnachricht
        window.getSelection().removeAllRanges(); // Auswahl zurücksetzen
    });

    socket.emit('joinLobby', lobbyCode); // Spieler der Lobby beitreten

    // Spielerliste aktualisieren
    socket.on('playerJoined', (playersList) => {
        playersDiv.innerHTML = ''; // Vorherige Liste leeren
        playersList.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.textContent = player;
            playersDiv.appendChild(playerElement);
        });
    });

    // Fehlerbehandlung
    socket.on('error', (errorMessage) => {
        showErrorMessage(errorMessage);
    });

    // Spiel starten
    startGameButton.addEventListener('click', () => {
        console.log('Spiel wird gestartet...');
    });

    // Funktion zur Anzeige von Fehlermeldungen
    function showErrorMessage(message) {
        errorMessageDiv.textContent = message;
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const socket = io("https://assoziationsspiel-backend-dcf85e77dc96.herokuapp.com/");
    const playersDiv = document.getElementById('players');
    const startGameButton = document.getElementById('start-game');
    const lobbyCodeDisplay = document.getElementById('lobby-code-display');
    const copyButton = document.getElementById('copy-button');
    const errorMessageDiv = document.getElementById('error-message');
    const lobbyCodeInput = document.getElementById('lobbyCode'); // Das Input-Feld für den Lobby-Code

    // Lobby-Code aus der URL abrufen
    const lobbyCode = new URLSearchParams(window.location.search).get('lobbyCode');
    lobbyCodeDisplay.textContent = lobbyCode; // Lobby-Code anzeigen
    lobbyCodeInput.value = lobbyCode; // Lobby-Code ins Input-Feld einfügen

    // Funktion zum Setzen des Lobby-Codes in das Eingabefeld
    function setLobbyCode() {
        lobbyCodeInput.value = lobbyCode; // Setze den aktuellen Lobby-Code
    }

    // Event-Listener für den Copy-Button
    copyButton.addEventListener('click', function() {
        lobbyCodeInput.select(); // Wähle den Lobby-Code im Input-Feld aus
        document.execCommand('copy'); // Kopiere den ausgewählten Text
        alert('Lobby-Code kopiert: ' + lobbyCodeInput.value); // Bestätigungsnachricht
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
        // Logik zum Starten des Spiels
        console.log('Spiel wird gestartet...');
    });

    // Funktion zur Anzeige von Fehlermeldungen
    function showErrorMessage(message) {
        errorMessageDiv.textContent = message;
    }

    // Setze den Lobby-Code beim Laden der Seite
    window.onload = setLobbyCode; // Dies ist redundant, da der Lobby-Code bereits gesetzt wurde
});
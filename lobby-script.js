document.addEventListener('DOMContentLoaded', () => {
    const socket = io("https://assoziationsspiel-backend-dcf85e77dc96.herokuapp.com/");
    const playersDiv = document.getElementById('players');
    const startGameButton = document.getElementById('start-game');
    const lobbyCodeDisplay = document.getElementById('lobby-code-display');
    const copyButton = document.getElementById('copy-button');
    const errorMessageDiv = document.getElementById('error-message');

    const lobbyCode = new URLSearchParams(window.location.search).get('lobbyCode');
    lobbyCodeDisplay.textContent = lobbyCode; // Lobby-Code anzeigen

    // Funktion zum Kopieren des Lobby-Codes in die Zwischenablage
    copyButton.addEventListener('click', function() {
        const lobbyCode = document.getElementById('lobby-code').textContent;
        navigator.clipboard.writeText(lobbyCode).then(() => {
            alert('Lobby-Code kopiert: ' + lobbyCode); // Optional: Benutzerfeedback
        }).catch(err => {
            console.error('Fehler beim Kopieren: ', err);
        });
    });

    socket.emit('joinLobby', lobbyCode);

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

    
});
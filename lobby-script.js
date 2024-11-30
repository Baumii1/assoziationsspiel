document.addEventListener('DOMContentLoaded', () => {
    const socket = io("https://assoziationsspiel-backend-dcf85e77dc96.herokuapp.com/");
    const playersDiv = document.getElementById('players');
    const startGameButton = document.getElementById('start-game');

    const lobbyCode = new URLSearchParams(window.location.search).get('lobbyCode');
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

    // Spiel starten
    startGameButton.addEventListener('click', () => {
        // Logik zum Starten des Spiels
        console.log('Spiel wird gestartet...');
    });
});
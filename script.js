document.addEventListener('DOMContentLoaded', () => {
    const createLobbyButton = document.getElementById('create-lobby');
    const joinLobbyButton = document.getElementById('join-lobby');
    const errorMessageDiv = document.getElementById('error-message');
    const socket = io("https://assoziationsspiel-backend-dcf85e77dc96.herokuapp.com/");

    // Lobby erstellen
    createLobbyButton.addEventListener('click', () => {
        socket.emit('createLobby');
    });

    // Lobby beitreten
    joinLobbyButton.addEventListener('click', () => {
        const lobbyCode = prompt('Gib den Lobby-Code ein:');
        if (lobbyCode) {
            socket.emit('joinLobby', lobbyCode);
        }
    });

    // Socket.io Ereignisse
    socket.on('lobbyCreated', (lobbyCode) => {
        // Weiterleitung zur Lobby-Seite
        window.location.href = `lobby.html?lobbyCode=${lobbyCode}`;
    });

    socket.on('error', (errorMessage) => {
        showErrorMessage(errorMessage);
    });

    // Funktion zur Anzeige von Fehlermeldungen
    function showErrorMessage(message) {
        errorMessageDiv.textContent = message;
    }
});
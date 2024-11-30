document.addEventListener('DOMContentLoaded', () => {
    const socket = io("https://assoziationsspiel-backend-dcf85e77dc96.herokuapp.com/");
    const lobbyCodeInput = document.getElementById('lobbyCode'); // Das Textfeld für den Lobby-Code
    const createLobbyButton = document.getElementById('create-lobby'); // Der Erstellen-Button
    const joinLobbyButton = document.getElementById('join-lobby'); // Der Beitreten-Button
    const messageDiv = document.getElementById('message'); // Das Nachrichtenelement

    // Lobby erstellen
    createLobbyButton.addEventListener('click', () => {
        socket.emit('createLobby');
    });

    // Lobby beitreten
    joinLobbyButton.addEventListener('click', () => {
        const lobbyCode = lobbyCodeInput.value.trim();
        if (lobbyCode) {
            socket.emit('joinLobby', lobbyCode);
        }
    });

    socket.on('lobbyJoined', (lobbyCode) => {
        // Weiterleitung zur Lobby-Seite
        window.location.href = `lobby.html?lobbyCode=${lobbyCode}`;
    });

    // Socket.io Ereignisse
    socket.on('lobbyCreated', (lobbyCode) => {
        // Weiterleitung zur Lobby-Seite
        window.location.href = `lobby.html?lobbyCode=${lobbyCode}`;
    });

    socket.on('error', (errorMessage) => {
        messageDiv.textContent = errorMessage;
        messageDiv.classList.remove('hidden');
    })

    // Aktivierung des Beitreten-Buttons, wenn ein Lobby-Code eingegeben wird
    lobbyCodeInput.addEventListener('input', function() {
        joinLobbyButton.disabled = this.value.trim() === ''; // Beitreten-Button aktivieren/deaktivieren
    });
});
document.addEventListener('DOMContentLoaded', () => {
    const createLobbyButton = document.getElementById('create-lobby');
    const joinLobbyButton = document.getElementById('join-lobby');
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
        alert(`Lobby erstellt! Code: ${lobbyCode}`);
        window.location.href = `lobby.html?lobbyCode=${lobbyCode}`; // Weiterleitung zur Lobby-Seite
    });

    socket.on('playerJoined', (playersList) => {
        console.log('Aktuelle Spieler:', playersList);
    });

    socket.on('error ', (errorMessage) => {
        alert(errorMessage);
    });
});
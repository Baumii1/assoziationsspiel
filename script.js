document.addEventListener('DOMContentLoaded', () => {
    const socket = io("https://assoziationsspiel-backend-dcf85e77dc96.herokuapp.com/");
    const lobbyCodeInput = document.getElementById('lobbyCode');
    const createLobbyButton = document.getElementById('create-lobby');
    const joinLobbyButton = document.getElementById('join-lobby');
    const nicknameInput = document.getElementById('nickname');
    const messageDiv = document.getElementById('message');

    // Überprüfen, ob ein Nickname in den Cookies gespeichert ist
    const savedNickname = getCookie('nickname');
    if (savedNickname) {
        nicknameInput.value = savedNickname; // Setze den gespeicherten Nickname
        updateButtons(); // Überprüfe die Schaltflächen
    }

    // Nickname Eingabe
    nicknameInput.addEventListener('input', function() {
        const nickname = this.value.trim();
        if (nickname) {
            setCookie('nickname', nickname, 30); // Speichere den Nickname in Cookies
        } else {
            showErrorMessage('Bitte geben Sie einen Nicknamen ein.');
        }
        updateButtons(); // Überprüfe die Schaltflächen
    });

    // Lobby erstellen
    createLobbyButton.addEventListener('click', () => {
        const nickname = nicknameInput.value.trim();
        if (nickname) {
            socket.emit('createLobby'); // Erstelle eine Lobby
        }
    });

    // Lobby beitreten
    joinLobbyButton.addEventListener('click', () => {
        const lobbyCode = lobbyCodeInput.value.trim();
        const nickname = getCookie('nickname'); // Nickname aus Cookies abrufen
        if (lobbyCode && nickname) {
            socket.emit('joinLobby', { lobbyCode, nickname }); // Nickname zusammen mit dem Lobby-Code senden
        } else {
            showErrorMessage('Bitte geben Sie einen Lobby-Code ein oder stellen Sie sicher, dass Sie einen Nicknamen haben.');
        }
    });

    socket.on('redirectToHome', (message) => {
        console.log('Redirecting to home with message:', message); // Debugging-Log
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = message;
        messageDiv.classList.remove('hidden');
    
        // Nach 5 Sekunden zur Startseite weiterleiten
        setTimeout(() => {
            window.location.href = 'index.html'; // Zur Startseite weiterleiten
        }, 1000); // 1 Sekunde
    });
    
    // Socket.IO Ereignis für Lobby-Beitritt
    socket.on('lobbyJoined', (lobbyCode) => {
        // Weiterleitung zur Lobby-Seite
        window.location.href = `lobby.html?lobbyCode=${lobbyCode}`;
    });

    // Socket.io Ereignisse
    socket.on('lobbyCreated', (lobbyCode) => {
        // Weiterleitung zur Lobby-Seite
        window.location.href = `lobby.html?lobbyCode=${lobbyCode}`;
    });

    // Aktivierung des Beitreten-Buttons, wenn ein Lobby-Code eingegeben wird
    lobbyCodeInput.addEventListener('input', function() {
        updateButtons(); // Überprüfe die Schaltflächen
    });

    socket.on('error', (errorMessage) => {
        showErrorMessage(errorMessage);
    });

    // Funktion um die Buttons zu aktivieren oder zu deaktivieren
    function updateButtons() {
        const nickname = nicknameInput.value.trim();
        const lobbyCode = lobbyCodeInput.value.trim();
        createLobbyButton.disabled = !nickname; // Erstelle Button aktivieren, wenn Nickname vorhanden
        joinLobbyButton.disabled = !nickname || !lobbyCode; // Beitreten Button aktivieren, wenn Nickname und Lobby-Code vorhanden
    }

    // Funktion zum Setzen eines Cookies
    function setCookie(name, value, days) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
    }

    // Funktion zum Abrufen eines Cookies
    function getCookie(name) {
        return document.cookie.split('; ').reduce((r, v) => {
            const parts = v.split('=');
            return parts[0] === name ? decodeURIComponent(parts[1]) : r;
        }, '');
    }

    // Beispiel für die Fehlerbehandlung
    function showErrorMessage(message) {
        messageDiv.textContent = message;
        messageDiv.classList.remove('hidden'); // Fehleranzeige sichtbar machen

        // Nach 5 Sekunden die Nachricht ausblenden
        setTimeout(() => {
            messageDiv.classList.add('hidden'); // Nachricht ausblenden
        }, 5000); // 5 Sekunden
    }
});
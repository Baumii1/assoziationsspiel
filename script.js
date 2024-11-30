document.addEventListener('DOMContentLoaded', () => {
    const socket = io("https://assoziationsspiel-backend-dcf85e77dc96.herokuapp.com/");
    const lobbyCodeInput = document.getElementById('lobbyCode');
    const createLobbyButton = document.getElementById('create-lobby');
    const joinLobbyButton = document.getElementById('join-lobby');
    const nicknameInput = document.getElementById('nickname');
    const nicknameMessage = document.getElementById('nickname-message');
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
            nicknameMessage.classList.add('hidden'); // Verstecke die Nachricht
        } else {
            nicknameMessage.textContent = 'Bitte geben Sie einen Nicknamen ein.';
            nicknameMessage.classList.remove('hidden'); // Zeige die Nachricht
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
        const nickname = nicknameInput.value.trim();
        if (lobbyCode && nickname) {
            socket.emit('joinLobby', lobbyCode); // Beitreten zur Lobby
        }
    });

    // Aktivierung des Beitreten-Buttons, wenn ein Lobby-Code eingegeben wird
    lobbyCodeInput.addEventListener('input', function() {
        updateButtons(); // Überprüfe die Schaltflächen
    });

    // Funktion um die Buttons zu aktiv ieren oder zu deaktivieren
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
});
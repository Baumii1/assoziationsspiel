const socket = io(); // Verbindung zum Server herstellen

document.getElementById('createLobby').onclick = () => {
    socket.emit('createLobby'); // Lobby erstellen
};

document.getElementById('joinLobby').onclick = () => {
    const code = document.getElementById('lobbyCode').value; // Lobby-Code aus dem Eingabefeld
    socket.emit('joinLobby', code); // Lobby beitreten
};

socket.on('lobbyCreated', (lobbyCode) => {
    alert(`Lobby erstellt! URL: https://deinbenutzername.github.io/assoziationsspiel/${lobbyCode}`);
    window.location.href = `/${lobbyCode}`; // Weiterleitung zur Lobby-URL
});

socket.on('lobbyJoined', (category) => {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    document.getElementById('category').innerText = category; // Kategorie anzeigen
});

document.getElementById('reveal').onclick = () => {
    const input = document.getElementById('userInput').value; // Eingabe des Benutzers
    socket.emit('reveal', input); // Eingabe an den Server senden
};

socket.on('showResults', (results) => {
    document.getElementById('results').innerHTML = results.join(', '); // Ergebnisse anzeigen
    document.getElementById('loading').style.display = 'none'; // Ladeanzeige ausblenden
});

document.getElementById('next').onclick = () => {
    socket.emit('nextRound'); // Nächste Runde an den Server senden
};


const socket = io();

        document.getElementById('createLobby').onclick = () => {
            socket.emit('createLobby');
        };

        document.getElementById('joinLobby').onclick = () => {
            const lobbyCode = document.getElementById('lobbyCode').value;
            socket.emit('joinLobby', lobbyCode);
        };

        socket.on('lobbyCreated', (lobbyCode) => {
            alert(`Lobby erstellt! Lobby-Code: ${lobbyCode}`);
        });

        socket.on('playerJoined', (players) => {
            console.log('Spieler in der Lobby:', players);
        });

        socket.on('gameStarted', (currentWord) => {
            document.getElementById('lobby').style.display = 'none';
            document.getElementById('game').style.display = 'block';
            document.getElementById('currentWord').innerText = currentWord;
        });

        document.getElementById('revealButton').onclick = () => {
            const association = document.getElementById('associationInput').value;
            socket.emit('reveal', lobbyCode, association);
        };

        socket.on('revealAssociation', (association) => {
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML += `<p>${association}</p>`;
        });

        socket.on('answerResult', (result, streak) => {
            if (result === 'correct') {
                alert(`Richtig! Streak: ${streak}`);
            } else {
                alert(`Falsch! Streak zurückgesetzt.`);
            }
            document.getElementById('nextWordButton').style.display = 'block';
        });

        document.getElementById('nextWordButton').onclick = () => {
            socket.emit('nextWord', lobbyCode);
        };

        socket.on('nextWord', (newWord) => {
            document.getElementById('currentWord').innerText = newWord;
            document.getElementById('results').innerHTML = ''; // Ergebnisse zurücksetzen
            document.getElementById('nextWordButton').style.display = 'none';
        });
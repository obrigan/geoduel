const firebaseConfig = {
  apiKey: "AIzaSyDYrThCjHvqKg7Gs932_1wdOor8eMNBhO4",
  authDomain: "geoduel-a0623.firebaseapp.com",
  projectId: "geoduel-a0623",
  storageBucket: "geoduel-a0623.firebasestorage.app",
  messagingSenderId: "898063594475",
  appId: "1:898063594475:web:ba6516fbcaf9c9bf455fae",
  measurementId: "G-4PKB9FD7TQ",
  // ИСПРАВЛЕННЫЙ URL (специально для твоего региона Belgium)
  databaseURL: "https://geoduel-a0623-default-rtdb.europe-west1.firebasedatabase.app/"
};

// Инициализация
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const gameData = [
    { map: 'images/map1.jpg', correct: 0, images: ['images/r1_1.jpg', 'images/r1_2.jpg', 'images/r1_3.jpg', 'images/r1_4.jpg'] },
    { map: 'images/map2.jpg', correct: 1, images: ['images/r2_1.jpg', 'images/r2_2.jpg', 'images/r2_3.jpg', 'images/r2_4.jpg'] },
    { map: 'images/map3.jpg', correct: 0, images: ['images/r3_1.jpg', 'images/r3_2.jpg', 'images/r3_3.jpg', 'images/r3_4.jpg'] },
    { map: 'images/map4.jpg', correct: 3, images: ['images/r4_1.jpg', 'images/r4_2.jpg', 'images/r4_3.jpg', 'images/r4_4.jpg'] },
    { map: 'images/map5.jpg', correct: 2, images: ['images/r5_1.jpg', 'images/r5_2.jpg', 'images/r5_3.jpg', 'images/r5_4.jpg'] },
    { map: 'images/map6.jpg', correct: 2, images: ['images/r6_1.jpg', 'images/r6_2.jpg', 'images/r6_3.jpg', 'images/r6_4.jpg'] },
    { map: 'images/map7.jpg', correct: 1, images: ['images/r7_1.jpg', 'images/r7_2.jpg', 'images/r7_3.jpg', 'images/r7_4.jpg'] },
    { map: 'images/map8.jpg', correct: 3, images: ['images/r8_1.jpg', 'images/r8_2.jpg', 'images/r8_3.jpg', 'images/r8_4.jpg'] }
];

let roomID = "";
let myID = "u_" + Math.random().toString(36).substr(2, 4);
let isHost = false;
let myNickname = "Я";
let currentRound = 0;
let timer, timeLeft = 90;

// === ЛОГИКА ЛОББИ ===

window.createRoom = function() {
    roomID = Math.floor(1000 + Math.random() * 9000).toString();
    isHost = true;
    myNickname = document.getElementById('nick-input').value || "Хост";
    
    db.ref('duels/' + roomID).set({
        state: 'lobby',
        currentRound: 0,
        players: { [myID]: { name: myNickname, score: 0, ready: false, choice: -1 } }
    }).then(() => {
        document.getElementById('menu-initial').style.display = 'none';
        document.getElementById('lobby-panel').style.display = 'block';
        document.getElementById('display-room-code').innerText = roomID;
        listenToRoom();
    }).catch(err => alert("Ошибка базы данных: " + err.message));
};

window.joinRoom = function() {
    roomID = document.getElementById('room-input').value;
    myNickname = document.getElementById('nick-input').value || "Игрок";
    if(!roomID) return alert("Введите код!");

    db.ref('duels/' + roomID + '/players/' + myID).set({
        name: myNickname, score: 0, ready: false, choice: -1
    }).then(() => {
        document.getElementById('menu-initial').style.display = 'none';
        document.getElementById('lobby-panel').style.display = 'block';
        document.getElementById('display-room-code').innerText = roomID;
        listenToRoom();
    }).catch(err => alert("Ошибка входа: " + err.message));
};

function listenToRoom() {
    db.ref('duels/' + roomID).on('value', (snap) => {
        const data = snap.val();
        if (!data) return;

        const playersObj = data.players || {};
        const pIDs = Object.keys(playersObj);
        document.getElementById('lobby-status').innerText = `Игроков: ${pIDs.length}/2`;
        
        if (isHost && pIDs.length === 2 && data.state === 'lobby') {
            document.getElementById('btn-start').style.display = 'block';
        }

        if (data.state === 'playing') {
            startClientGame(data);
        }
    });
}

// === ЛОГИКА ИГРЫ ===

window.startGame = function() {
    db.ref('duels/' + roomID).update({ state: 'playing' });
};

function startClientGame(data) {
    document.getElementById('setup-overlay').style.display = 'none';
    document.getElementById('main-game-container').style.display = 'flex';
    
    const pIDs = Object.keys(data.players);
    const oppID = pIDs.find(id => id !== myID);
    
    document.getElementById('name-me').innerText = myNickname;
    document.getElementById('name-opp').innerText = oppID ? data.players[oppID].name : "Соперник";
    document.getElementById('score-me').innerText = data.players[myID].score;
    document.getElementById('score-opp').innerText = oppID ? data.players[oppID].score : 0;

    syncRound(data);
}

function syncRound(data) {
    currentRound = data.currentRound;
    const round = gameData[currentRound];
    const me = data.players[myID];
    const oppID = Object.keys(data.players).find(id => id !== myID);
    const opp = data.players[oppID];

    document.getElementById('round-num').innerText = currentRound + 1;
    document.getElementById('map-preview').src = round.map;

    if (!me.ready || (opp && !opp.ready)) {
        document.getElementById('prep-screen').style.display = 'block';
        document.getElementById('round-screen').style.display = 'none';
        document.getElementById('ready-btn').disabled = me.ready;
        document.getElementById('ready-status').innerText = me.ready ? "Ждем соперника..." : "Нажми кнопку!";
    } 
    else if (me.ready && opp.ready) {
        document.getElementById('prep-screen').style.display = 'none';
        document.getElementById('round-screen').style.display = 'flex';
        
        if (me.choice === -1) {
            for (let i = 0; i < 4; i++) {
                document.getElementById(`img${i}`).src = round.images[i];
                document.getElementById(`img${i}`).parentElement.className = 'option';
            }
            document.getElementById('status').innerText = "Твой ход!";
            startTimer();
        } else {
            document.getElementById('status').innerText = opp.choice === -1 ? "Ждем соперника..." : "Раунд завершен!";
            revealLogic(me.choice, opp.choice, round.correct);
        }
    }

    // Если оба ответили - хост переключает раунд
    if (me.choice !== -1 && opp && opp.choice !== -1) {
        clearInterval(timer);
        if (isHost) {
            setTimeout(() => {
                nextRound(data);
            }, 3500);
        }
    }
}

window.setReady = function() {
    db.ref(`duels/${roomID}/players/${myID}`).update({ ready: true });
};

function startTimer() {
    clearInterval(timer);
    timeLeft = 90;
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-val').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            selectChoice(-1);
        }
    }, 1000);
}

window.selectChoice = function(idx) {
    if (document.getElementById('img0').parentElement.classList.contains('dimmed')) return;
    clearInterval(timer);
    const correct = gameData[currentRound].correct;
    let scoreAdd = (idx === correct) ? 1 : 0;
    
    db.ref(`duels/${roomID}/players/${myID}`).update({ 
        choice: idx,
        score: firebase.database.ServerValue.increment(scoreAdd)
    });
};

function revealLogic(meIdx, oppIdx, correct) {
    const options = document.querySelectorAll('.option');
    options.forEach((opt, i) => {
        opt.classList.add('dimmed');
        if (i === correct) opt.classList.add('correct-choice');
        if (i === meIdx && i !== correct) opt.classList.add('wrong-choice');
        if (i === meIdx || i === correct) opt.classList.remove('dimmed');
    });
}

function nextRound(data) {
    let next = currentRound + 1;
    const pIDs = Object.keys(data.players);
    const updates = {};
    
    if (next < gameData.length) {
        updates['currentRound'] = next;
        pIDs.forEach(id => {
            updates[`players/${id}/ready`] = false;
            updates[`players/${id}/choice`] = -1;
        });
        db.ref('duels/' + roomID).update(updates);
    } else {
        alert("ИГРА ОКОНЧЕНА!");
        db.ref('duels/' + roomID).remove();
        location.reload();
    }
}

// НАСТРОЙКИ FIREBASE (С правильным бельгийским URL)
const firebaseConfig = {
  apiKey: "AIzaSyDYrThCjHvqKg7Gs932_1wdOor8eMNBhO4",
  authDomain: "geoduel-a0623.firebaseapp.com",
  projectId: "geoduel-a0623",
  storageBucket: "geoduel-a0623.firebasestorage.app",
  messagingSenderId: "898063594475",
  appId: "1:898063594475:web:ba6516fbcaf9c9bf455fae",
  measurementId: "G-4PKB9FD7TQ",
  databaseURL: "https://geoduel-a0623-default-rtdb.europe-west1.firebasedatabase.app/"
};

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

// ЗВУКОВЫЕ ЭФФЕКТЫ
const bgmMenu = new Audio('sounds/menu.mp3'); bgmMenu.loop = true; bgmMenu.volume = 0.07;
const bgmHurry = new Audio('sounds/hurry.mp3'); bgmHurry.loop = true; bgmHurry.volume = 0.13;
const sfxPowerup = new Audio('sounds/powerup.mp3'); sfxPowerup.volume = 0.2;
const sfxVictory = new Audio('sounds/victory.mp3'); sfxVictory.volume = 0.3; // Добавил, раз вызывается в showResults

let roomID = "";
let myID = "u_" + Math.random().toString(36).substr(2, 5);
let isHost = false;
let myNickname = "Я", oppNickname = "Соперник";

let currentRound = 0, myScore = 0, oppScore = 0;
let hasAnswered = false, oppHasAnswered = false;
let timer, timeLeft = 90;
let tempSelectedIdx = -1;

let used5050 = false, usedTimeBoost = false, hintUsedThisRound = false;

document.body.addEventListener('click', () => {
    if (document.getElementById('setup-overlay').style.display !== 'none' && bgmMenu.paused) {
        bgmMenu.play().catch(() => console.log("Автоплей заблокирован"));
    }
}, { once: true });

// === ЛОББИ ===
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
    });
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
    }).catch(() => alert("Комната не найдена"));
};

function listenToRoom() {
    db.ref('duels/' + roomID).on('value', (snap) => {
        const data = snap.val();
        if (!data) return;

        const pIDs = Object.keys(data.players || {});
        document.getElementById('lobby-status').innerText = `Игроков: ${pIDs.length}/2`;
        
        if (isHost && pIDs.length === 2 && data.state === 'lobby') {
            document.getElementById('btn-start').style.display = 'block';
        }

        if (data.state === 'playing') {
            syncGame(data);
        }
    });
}

// === ИГРА ===
window.startGame = function() {
    db.ref('duels/' + roomID).update({ state: 'playing' });
};

function syncGame(data) {
    // Выключаем меню
    if (document.getElementById('setup-overlay').style.display !== 'none') {
        document.getElementById('setup-overlay').style.display = 'none';
        document.getElementById('main-game-container').style.display = 'block';
        bgmMenu.pause();
    }

    currentRound = data.currentRound;
    
    // Проверка на конец игры
    if (currentRound >= gameData.length) {
        showResults(data);
        return;
    }

    const round = gameData[currentRound];
    const me = data.players[myID];
    const oppID = Object.keys(data.players).find(id => id !== myID);
    const opp = oppID ? data.players[oppID] : null;

    if (opp) oppNickname = opp.name;
    myScore = me.score;
    oppScore = opp ? opp.score : 0;

    document.getElementById('name-me').innerText = myNickname;
    document.getElementById('name-opp').innerText = oppNickname;
    document.getElementById('score-me').innerText = myScore;
    document.getElementById('score-opp').innerText = oppScore;
    
    document.getElementById('round-num').innerText = currentRound + 1;
    document.getElementById('map-preview').src = round.map;

    if (!me.ready || (opp && !opp.ready)) {
        document.getElementById('prep-screen').style.display = 'flex';
        document.getElementById('round-screen').style.display = 'none';
        document.getElementById('ready-btn').disabled = me.ready;
        document.getElementById('ready-status').innerText = me.ready ? "Ожидание..." : "Нажми готовность!";
    } 
    else if (me.ready && opp.ready) {
        document.getElementById('prep-screen').style.display = 'none';
        document.getElementById('round-screen').style.display = 'block'; // Старый дизайн
        
        if (me.choice === -1) {
            if (!timer) { // Запуск раунда
                for (let i = 0; i < 4; i++) {
                    document.getElementById(`img${i}`).src = round.images[i];
                    document.querySelectorAll('.option')[i].className = 'option';
                }
                hintUsedThisRound = false;
                hasAnswered = false;
                updatePowerupUI();
                document.getElementById('status').innerText = "Твой ход!";
                document.getElementById('game-grid').style.pointerEvents = 'auto';
                startTimer();
            }
        } else {
            hasAnswered = true;
            document.getElementById('status').innerText = (!opp || opp.choice === -1) ? "Ждем соперника..." : "Раунд завершен!";
            revealAnswers(me.choice, opp.choice, round.correct);
        }
    }

    if (me.choice !== -1 && opp && opp.choice !== -1 && isHost) {
        clearInterval(timer);
        bgmHurry.pause(); bgmHurry.currentTime = 0;
        setTimeout(() => {
            const updates = { currentRound: currentRound + 1 };
            Object.keys(data.players).forEach(id => {
                updates[`players/${id}/ready`] = false;
                updates[`players/${id}/choice`] = -1;
            });
            db.ref('duels/' + roomID).update(updates);
        }, 4000);
    }
}

window.setReady = function() {
    db.ref(`duels/${roomID}/players/${myID}`).update({ ready: true });
};

// === ТАЙМЕР И ПОДСКАЗКИ (ОРИГИНАЛ) ===
function startTimer() {
    clearInterval(timer);
    timeLeft = 90;
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-val').innerText = timeLeft;
        if (timeLeft === 10 && !hasAnswered) bgmHurry.play().catch(()=>{});
        if (timeLeft <= 0) { 
            clearInterval(timer); 
            if (!hasAnswered) { closeZoom(); sendChoice(-1); } 
        }
    }, 1000);
}

window.use5050 = function() {
    if (used5050 || hintUsedThisRound || hasAnswered) return;
    used5050 = true; hintUsedThisRound = true;
    sfxPowerup.play().catch(()=>{}); updatePowerupUI();
    const correct = gameData[currentRound].correct;
    let wrongIndices = [0, 1, 2, 3].filter(i => i !== correct);
    wrongIndices.sort(() => Math.random() - 0.5);
    const toRemove = wrongIndices.slice(0, 2);
    toRemove.forEach(idx => {
        document.querySelectorAll('.option')[idx].classList.add('eliminated');
    });
};

window.useTimeBoost = function() {
    if (usedTimeBoost || hintUsedThisRound || hasAnswered) return;
    usedTimeBoost = true; hintUsedThisRound = true;
    sfxPowerup.play().catch(()=>{}); updatePowerupUI();
    timeLeft += 30;
    document.getElementById('timer-val').innerText = timeLeft;
    if (timeLeft > 10) { bgmHurry.pause(); bgmHurry.currentTime = 0; }
    document.getElementById('timer-header').style.color = '#3498db';
    setTimeout(() => document.getElementById('timer-header').style.color = '#fff', 1000); // Поправил цвет
};

function updatePowerupUI() {
    const btn50 = document.getElementById('btn-5050');
    const btnTime = document.getElementById('btn-time');
    if (used5050 || hintUsedThisRound || hasAnswered) btn50.classList.add('disabled');
    else btn50.classList.remove('disabled');
    if (usedTimeBoost || hintUsedThisRound || hasAnswered) btnTime.classList.add('disabled');
    else btnTime.classList.remove('disabled');
}

// === ЗУМ И ВЫБОР (ОРИГИНАЛ) ===
window.selectCard = function(index) {
    if (hasAnswered) return;
    if (document.querySelectorAll('.option')[index].classList.contains('eliminated')) return;

    tempSelectedIdx = index;
    const imgSrc = document.getElementById(`img${index}`).src;

    document.getElementById('zoomed-img').src = imgSrc;
    document.getElementById('zoom-overlay').style.display = 'flex';

    document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected-state'));
    document.querySelectorAll('.option')[index].classList.add('selected-state');
};

window.closeZoom = function() {
    document.getElementById('zoom-overlay').style.display = 'none';
};

window.confirmChoice = function() {
    if (tempSelectedIdx === -1) return;
    closeZoom();
    sendChoice(tempSelectedIdx);
};

function sendChoice(index) {
    if (hasAnswered) return;
    hasAnswered = true;
    clearInterval(timer);
    bgmHurry.pause(); bgmHurry.currentTime = 0;
    document.getElementById('game-grid').style.pointerEvents = 'none';
    updatePowerupUI();

    const correct = gameData[currentRound].correct;
    let scoreAdd = (index === correct) ? 1 : 0;
    
    db.ref(`duels/${roomID}/players/${myID}`).update({ 
        choice: index,
        score: firebase.database.ServerValue.increment(scoreAdd)
    });
}

function revealAnswers(myChoice, oppChoice, correctChoice) {
    const options = document.querySelectorAll('.option');
    options.forEach(opt => {
        opt.classList.add('dimmed');
        opt.classList.remove('selected-state');
    });
    
    options[correctChoice].classList.remove('dimmed');
    options[correctChoice].classList.add('correct-choice');
    
    if (myChoice !== correctChoice && myChoice !== -1) {
        options[myChoice].classList.remove('dimmed');
        options[myChoice].classList.add('wrong-choice');
    }
}

// === ИТОГИ (ОРИГИНАЛ) ===
function showResults(data) {
    sfxVictory.play().catch(()=>{}); 
    const pIDs = Object.keys(data.players);
    const me = data.players[myID];
    const oppID = pIDs.find(id => id !== myID);
    const opp = data.players[oppID];

    document.getElementById('ui-layer').style.display = 'none';
    document.getElementById('round-screen').style.display = 'none';
    document.getElementById('prep-screen').style.display = 'none';
    
    const resultsScreen = document.getElementById('results-screen');
    const winnerNameSpan = document.getElementById('winner-name');
    const winnerCircle = document.getElementById('winner-circle-element');
    const finalScoresSpan = document.getElementById('final-scores');
    
    // Вывод счета как "Мой : Соперника"
    finalScoresSpan.innerText = `${me.score} : ${opp.score}`;
    resultsScreen.style.display = 'flex';
    
    if (me.score > opp.score) {
        winnerNameSpan.innerText = myNickname;
    } else if (opp.score > me.score) {
        winnerNameSpan.innerText = opp.name;
    } else {
        winnerNameSpan.innerText = "НИЧЬЯ!";
        winnerCircle.classList.add('tie'); 
    }
    
    setTimeout(() => resultsScreen.classList.add('active'), 50);

    // Удаляем комнату из БД
    if (isHost) db.ref('duels/' + roomID).remove();
}

// FIREBASE CONFIG (Твой бельгийский сервер)
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

// ДАННЫЕ ИГРЫ
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

// ЗВУКИ
const bgmMenu = new Audio('sounds/menu.mp3'); bgmMenu.loop = true; bgmMenu.volume = 0.07;
const bgmHurry = new Audio('sounds/hurry.mp3'); bgmHurry.loop = true; bgmHurry.volume = 0.13;
const sfxPowerup = new Audio('sounds/powerup.mp3'); sfxPowerup.volume = 0.2;
const sfxVictory = new Audio('sounds/victory.mp3'); sfxVictory.volume = 0.3;
const sfxCorrect = new Audio('sounds/correct.mp3'); sfxCorrect.volume = 0.5;
const sfxWrong = new Audio('sounds/wrong.mp3'); sfxWrong.volume = 0.5;

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let roomID = "";
let myID = "u_" + Math.random().toString(36).substr(2, 5);
let isHost = false;
let myNickname = "Я", oppNickname = "Соперник";

let currentRound = 0, myScore = 0, oppScore = 0;
let timer, timeLeft = 90;
let hasAnswered = false;
let tempSelectedIdx = -1;
let used5050 = false, usedTimeBoost = false, hintUsedThisRound = false;
let lastRevealedRound = -1;
let transitionTimeout = null;

// АВТОПЛЕЙ МУЗЫКИ
document.body.addEventListener('click', () => {
    if (document.getElementById('screen-setup').style.display !== 'none' && bgmMenu.paused) {
        bgmMenu.play().catch(e => console.log("Audio block:", e));
    }
}, { once: true });

// ==========================================
// ЛОББИ И ПОДКЛЮЧЕНИЕ
// ==========================================
window.createRoom = function() {
    roomID = Math.floor(1000 + Math.random() * 9000).toString();
    isHost = true;
    myNickname = document.getElementById('nick-input').value || "Хост";
    
    db.ref('duels/' + roomID).set({
        state: 'lobby',
        currentRound: 0,
        players: { [myID]: { name: myNickname, score: 0, ready: false, choice: -1 } }
    }).then(() => {
        document.getElementById('setup-controls').style.display = 'none';
        document.getElementById('lobby-controls').style.display = 'flex';
        document.getElementById('display-room-code').innerText = roomID;
        listenToRoom();
    });
};

window.joinRoom = function() {
    roomID = document.getElementById('room-input').value.trim();
    myNickname = document.getElementById('nick-input').value || "Игрок";
    if(!roomID) return alert("Введите код!");

    db.ref('duels/' + roomID + '/players/' + myID).set({
        name: myNickname, score: 0, ready: false, choice: -1
    }).then(() => {
        document.getElementById('setup-controls').style.display = 'none';
        document.getElementById('lobby-controls').style.display = 'flex';
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
            document.getElementById('btn-start').style.display = 'flex';
        }

        if (data.state !== 'lobby') {
            syncGameState(data);
        }
    });
}

// ==========================================
// ОСНОВНАЯ ИГРА
// ==========================================
window.startGame = function() {
    db.ref('duels/' + roomID).update({ state: 'playing' });
};

function syncGameState(data) {
    // Переключение экранов при старте
    if (document.getElementById('screen-setup').style.display !== 'none') {
        document.getElementById('screen-setup').style.display = 'none';
        document.getElementById('screen-game').style.display = 'flex';
        bgmMenu.pause();
    }

    if (data.state === 'finished') {
        showResults(data);
        return;
    }

    currentRound = data.currentRound;
    const roundData = gameData[currentRound];
    const me = data.players[myID];
    const oppID = Object.keys(data.players).find(id => id !== myID);
    const opp = oppID ? data.players[oppID] : null;

    // Обновление шапки
    if (opp) oppNickname = opp.name;
    document.getElementById('name-me').innerText = myNickname;
    document.getElementById('name-opp').innerText = oppNickname;
    document.getElementById('score-me').innerText = me.score;
    document.getElementById('score-opp').innerText = opp ? opp.score : 0;
    document.getElementById('round-num').innerText = currentRound + 1;
    document.getElementById('map-preview').src = roundData.map;

    // ОБРАБОТКА КОНЦА РАУНДА
    if (data.state === 'round_end') {
        clearInterval(timer);
        bgmHurry.pause(); bgmHurry.currentTime = 0;
        document.getElementById('game-status').innerText = "Раунд завершен!";
        
        revealAnswers(me.choice, opp ? opp.choice : -1, roundData.correct);

        // Хост отвечает за переход на следующий раунд через 4 секунды
        if (isHost && !transitionTimeout) {
            transitionTimeout = setTimeout(() => {
                transitionTimeout = null;
                const next = currentRound + 1;
                if (next < gameData.length) {
                    const updates = { state: 'playing', currentRound: next };
                    Object.keys(data.players).forEach(id => {
                        updates[`players/${id}/ready`] = false;
                        updates[`players/${id}/choice`] = -1;
                    });
                    db.ref('duels/' + roomID).update(updates);
                } else {
                    db.ref('duels/' + roomID).update({ state: 'finished' });
                }
            }, 4000);
        }
        return;
    }

    // ОБРАБОТКА: ОЖИДАНИЕ ГОТОВНОСТИ
    if (!me.ready || (opp && !opp.ready)) {
        document.getElementById('phase-prep').style.display = 'flex';
        document.getElementById('phase-cards').style.display = 'none';
        
        const rBtn = document.getElementById('ready-btn');
        const rStatus = document.getElementById('ready-status');
        rBtn.disabled = me.ready;
        rBtn.innerText = me.ready ? "ОЖИДАНИЕ..." : "Я ГОТОВ!";
        rStatus.innerText = me.ready ? "Ожидаем готовности соперника..." : "Внимательно изучи карту!";
        document.getElementById('game-status').innerText = "Подготовка...";
    } 
    // ОБРАБОТКА: АКТИВНЫЙ РАУНД (ВЫБОР)
    else if (me.ready && opp.ready) {
        document.getElementById('phase-prep').style.display = 'none';
        document.getElementById('phase-cards').style.display = 'flex';
        
        if (me.choice === -1) {
            // Раунд только начался для меня
            if (!timer) {
                // Сброс визуала карточек
                for (let i = 0; i < 4; i++) {
                    const card = document.querySelectorAll('.card-item')[i];
                    card.className = 'card-item';
                    document.getElementById(`img${i}`).src = roundData.images[i];
                }
                hintUsedThisRound = false;
                hasAnswered = false;
                tempSelectedIdx = -1;
                updatePowerupUI();
                document.getElementById('game-status').innerText = "Твой ход!";
                startTimer();
            }
        } else {
            // Я ответил, жду соперника
            hasAnswered = true;
            document.getElementById('game-status').innerText = "Ждем ответ соперника...";
            // Подсвечиваем локально
            document.querySelectorAll('.card-item').forEach((card, i) => {
                card.classList.add('dimmed');
                if (i === me.choice) {
                    card.classList.remove('dimmed');
                    card.classList.add('selected-state');
                }
            });
        }
    }
}

window.setReady = function() {
    db.ref(`duels/${roomID}/players/${myID}`).update({ ready: true });
};

// ==========================================
// ЗУМ И ВЫБОР
// ==========================================
window.openZoom = function(index) {
    if (hasAnswered) return;
    const card = document.querySelectorAll('.card-item')[index];
    if (card.classList.contains('eliminated')) return;

    tempSelectedIdx = index;
    document.getElementById('zoomed-image').src = document.getElementById(`img${index}`).src;
    document.getElementById('zoom-modal').style.display = 'flex';
};

window.closeZoom = function(e) {
    if (e && e.target.id === 'confirm-btn') return;
    document.getElementById('zoom-modal').style.display = 'none';
};

window.confirmChoice = function() {
    if (tempSelectedIdx === -1 || hasAnswered) return;
    document.getElementById('zoom-modal').style.display = 'none';
    
    hasAnswered = true;
    clearInterval(timer);
    bgmHurry.pause(); bgmHurry.currentTime = 0;
    updatePowerupUI();

    const correct = gameData[currentRound].correct;
    const scoreAdd = (tempSelectedIdx === correct) ? 1 : 0;
    
    db.ref(`duels/${roomID}/players/${myID}`).update({ 
        choice: tempSelectedIdx,
        score: firebase.database.ServerValue.increment(scoreAdd)
    }).then(() => {
        // Проверка: ответили ли оба?
        db.ref(`duels/${roomID}/players`).once('value', snap => {
            const p = snap.val();
            const keys = Object.keys(p);
            if (keys.length === 2 && p[keys[0]].choice !== -1 && p[keys[1]].choice !== -1) {
                db.ref(`duels/${roomID}`).update({ state: 'round_end' });
            }
        });
    });
};

function revealAnswers(myChoice, oppChoice, correctChoice) {
    const cards = document.querySelectorAll('.card-item');
    cards.forEach((card, i) => {
        card.className = 'card-item dimmed'; // Сброс всего
        if (i === correctChoice) {
            card.classList.remove('dimmed');
            card.classList.add('correct-choice');
        }
        if (i === myChoice && i !== correctChoice) {
            card.classList.remove('dimmed');
            card.classList.add('wrong-choice');
        }
    });

    // Одиночное воспроизведение звука
    if (lastRevealedRound !== currentRound) {
        lastRevealedRound = currentRound;
        if (myChoice === correctChoice) sfxCorrect.play().catch(()=>{});
        else if (myChoice !== -1) sfxWrong.play().catch(()=>{});
    }
}

// ==========================================
// ТАЙМЕР И БОНУСЫ
// ==========================================
function startTimer() {
    clearInterval(timer);
    timeLeft = 90;
    document.getElementById('timer-val').innerText = timeLeft;
    document.getElementById('timer-header').style.color = '#ff4d4d';

    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-val').innerText = timeLeft;
        
        if (timeLeft === 10 && !hasAnswered) bgmHurry.play().catch(()=>{});
        
        if (timeLeft <= 0) { 
            clearInterval(timer); 
            if (!hasAnswered) { 
                closeZoom(); 
                tempSelectedIdx = -1; // Не успел = неверный ответ
                confirmChoice(); // Отправляем -1 (или просто 0 баллов)
            } 
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
        document.querySelectorAll('.card-item')[idx].classList.add('eliminated');
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
    setTimeout(() => document.getElementById('timer-header').style.color = '#ff4d4d', 1000);
};

function updatePowerupUI() {
    const btn50 = document.getElementById('btn-5050');
    const btnTime = document.getElementById('btn-time');
    btn50.disabled = (used5050 || hintUsedThisRound || hasAnswered);
    btnTime.disabled = (usedTimeBoost || hintUsedThisRound || hasAnswered);
}

// ==========================================
// ИТОГИ ИГРЫ
// ==========================================
function showResults(data) {
    sfxVictory.play().catch(()=>{}); 
    const me = data.players[myID];
    const oppID = Object.keys(data.players).find(id => id !== myID);
    const opp = data.players[oppID];

    document.getElementById('phase-prep').style.display = 'none';
    document.getElementById('phase-cards').style.display = 'none';
    document.getElementById('game-header').style.display = 'none';
    
    const resultsScreen = document.getElementById('phase-results');
    const winnerNameSpan = document.getElementById('winner-name');
    const winnerCircle = document.getElementById('winner-circle');
    
    document.getElementById('final-scores').innerText = `${me.score} : ${opp.score}`;
    resultsScreen.style.display = 'flex';
    
    if (me.score > opp.score) {
        winnerNameSpan.innerText = myNickname;
    } else if (opp.score > me.score) {
        winnerNameSpan.innerText = opp.name;
    } else {
        winnerNameSpan.innerText = "НИЧЬЯ!";
        winnerCircle.classList.add('tie'); 
    }
    
    // Хост удаляет комнату, чтобы база не засорялась
    if (isHost) db.ref('duels/' + roomID).remove();
}

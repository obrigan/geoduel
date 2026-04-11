// --- НАСТРОЙКИ PUSHER ---
const PUSHER_KEY = 'f6a3d8976c501cb9197e';
const PUSHER_CLUSTER = 'eu';

// --- ДАННЫЕ ИГРЫ ---
const gameData = [
    { 
        map: 'images/map1.jpg', 
        correct: 0, 
        images: ['images/r1_1.jpg', 'images/r1_2.jpg', 'images/r1_3.jpg', 'images/r1_4.jpg'] 
    },
    { 
        map: 'images/map2.jpg', 
        correct: 1, 
        images: ['images/r2_1.jpg', 'images/r2_2.jpg', 'images/r2_3.jpg', 'images/r2_4.jpg'] 
    }
    // Добавь остальные раунды по аналогии ниже...
];

// --- ЛОГИКА КОМНАТЫ ---
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    window.history.pushState({}, '', `?room=${roomId}`);
}
document.getElementById('room-link').innerText = window.location.href;

// Инициализация Pusher
const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER, forceTLS: true });

// Используем 'cache-' для client-events без приватного сервера
const channel = pusher.subscribe(`cache-room-${roomId}`);

let currentRound = 0;
let myScore = 0;
let oppScore = 0;
let iAmReady = false;
let oppIsReady = false;
let hasAnswered = false;
let oppHasAnswered = false;
let timer;
let timeLeft = 90;

// --- ОБРАБОТКА СОБЫТИЙ СОПЕРНИКА ---

// Соперник нажал "Готов"
channel.bind('client-ready', () => {
    console.log("Соперник готов");
    oppIsReady = true;
    checkStartRound();
});

// Соперник ответил
channel.bind('client-answer', (data) => {
    if (data.round === currentRound) {
        oppHasAnswered = true;
        processOpponentAnswer(data.choice);
        checkRoundEnd();
    }
});

// --- ФУНКЦИИ ИГРЫ ---

function setReady() {
    iAmReady = true;
    document.getElementById('ready-btn').disabled = true;
    document.getElementById('ready-btn').innerText = "Готов!";
    document.getElementById('ready-status').innerText = "Ждем соперника...";
    
    // Отправляем сигнал готовности
    channel.trigger('client-ready', { ready: true });
    checkStartRound();
}

function checkStartRound() {
    if (iAmReady && oppIsReady) {
        startRound();
    }
}

function startRound() {
    document.getElementById('prep-screen').style.display = 'none';
    document.getElementById('game-grid').style.display = 'grid';
    loadRound();
}

function loadRound() {
    hasAnswered = false;
    oppHasAnswered = false;
    timeLeft = 90;
    
    document.getElementById('timer').innerText = `Время: ${timeLeft}`;
    document.getElementById('round-num').innerText = currentRound + 1;
    document.getElementById('status').innerText = "Твой ход!";
    document.getElementById('game-grid').classList.remove('disabled');
    
    const round = gameData[currentRound];
    for (let i = 0; i < 4; i++) {
        const img = document.getElementById(`img${i}`);
        img.src = round.images[i];
        img.parentElement.className = 'option';
    }
    
    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = `Время: ${timeLeft}`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            if (!hasAnswered) sendChoice(-1); // Время вышло - промах
        }
    }, 1000);
}

function sendChoice(index) {
    if (hasAnswered) return;
    hasAnswered = true;
    clearInterval(timer);

    const isCorrect = index === gameData[currentRound].correct;
    if (isCorrect) myScore++;
    
    if (index !== -1) highlightResult(index, isCorrect);
    
    channel.trigger('client-answer', {
        round: currentRound,
        choice: index
    });

    document.getElementById('status').innerText = "Ждем соперника...";
    checkRoundEnd();
}

function highlightResult(index, isCorrect) {
    const el = document.getElementById(`img${index}`).parentElement;
    el.classList.add(isCorrect ? 'correct' : 'wrong');
    document.getElementById('score-me').innerText = myScore;
}

function processOpponentAnswer(choice) {
    const isCorrect = choice === gameData[currentRound].correct;
    if (isCorrect) oppScore++;
    document.getElementById('score-opp').innerText = oppScore;
}

function checkRoundEnd() {
    if (hasAnswered && oppHasAnswered) {
        document.getElementById('status').innerText = "Раунд завершен!";
        
        setTimeout(() => {
            currentRound++;
            if (currentRound < gameData.length) {
                // Возвращаем экран карты для следующего раунда
                iAmReady = false;
                oppIsReady = false;
                document.getElementById('ready-btn').disabled = false;
                document.getElementById('ready-btn').innerText = "Я ГОТОВ";
                document.getElementById('ready-status').innerText = "Ждем готовности игроков...";
                document.getElementById('map-preview').src = gameData[currentRound].map;
                document.getElementById('prep-screen').style.display = 'flex';
                document.getElementById('game-grid').style.display = 'none';
            } else {
                showFinalResult();
            }
        }, 3000);
    }
}

function showFinalResult() {
    let resultText = myScore > oppScore ? "Ты победил! 🎉" : (myScore < oppScore ? "Ты проиграл... 💀" : "Ничья! 🤝");
    document.getElementById('status').innerHTML = `<b>${resultText}</b><br>Финальный счет: ${myScore} - ${oppScore}`;
}

// Показываем карту первого раунда при загрузке
document.getElementById('map-preview').src = gameData[0].map;

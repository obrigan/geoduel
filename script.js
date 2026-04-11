const PUSHER_KEY = 'f6a3d8976c501cb9197e';
const PUSHER_CLUSTER = 'eu';

const gameData = [
    { 
        map: 'images/map1.jpg', // Скриншот карты для 1 раунда
        correct: 0, 
        images: ['images/r1_1.jpg', 'images/r1_2.jpg', 'images/r1_3.jpg', 'images/r1_4.jpg'] 
    },
    { 
        map: 'images/map2.jpg', // Скриншот карты для 2 раунда
        correct: 1, 
        images: ['images/r2_1.jpg', 'images/r2_2.jpg', 'images/r2_3.jpg', 'images/r2_4.jpg'] 
    }
];

const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER, forceTLS: true });
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room') || Math.random().toString(36).substring(7);
if (!urlParams.get('room')) window.history.pushState({}, '', `?room=${roomId}`);
document.getElementById('room-link').innerText = window.location.href;

const channel = pusher.subscribe(`cache-room-${roomId}`);

let currentRound = 0;
let myScore = 0;
let oppScore = 0;
let iAmReady = false;
let oppIsReady = false;
let timer;
let timeLeft = 90;

// Слушаем события
channel.bind('client-ready', () => {
    oppIsReady = true;
    checkStartRound();
});

channel.bind('client-answer', (data) => {
    if (data.round === currentRound) {
        processOpponentAnswer(data.choice);
        checkRoundEnd();
    }
});

function setReady() {
    iAmReady = true;
    document.getElementById('ready-btn').disabled = true;
    document.getElementById('ready-btn').innerText = "Готов!";
    channel.trigger('client-ready', {});
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
    timeLeft = 90;
    startTimer();
    const round = gameData[currentRound];
    document.getElementById('round-num').innerText = currentRound + 1;
    document.getElementById('status').innerText = "Выбирай!";
    
    for (let i = 0; i < 4; i++) {
        const img = document.getElementById(`img${i}`);
        img.src = round.images[i];
        img.parentElement.className = 'option';
    }
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = `Время: ${timeLeft}`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            if (!hasAnswered) sendChoice(-1); // Авто-пропуск если время вышло
        }
    }, 1000);
}

// Функции sendChoice, processOpponentAnswer и checkRoundEnd остаются как раньше, 
// но в checkRoundEnd добавь очистку таймера и возврат экрана карты.

function checkRoundEnd() {
    // Если оба ответили (или время вышло)
    // Код для перехода к следующему раунду...
    // Перед переходом:
    // iAmReady = false; oppIsReady = false;
    // Показать снова prep-screen и обновить src у map-preview
}
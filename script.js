const gameData = [
    { map: 'images/map1.jpg', correct: 0, images: ['images/r1_1.jpg', 'images/r1_2.jpg', 'images/r1_3.jpg', 'images/r1_4.jpg'] },
    { map: 'images/map2.jpg', correct: 1, images: ['images/r2_1.jpg', 'images/r2_2.jpg', 'images/r2_3.jpg', 'images/r2_4.jpg'] }
];

const urlParams = new URLSearchParams(window.location.search);
let peerIdFromUrl = urlParams.get('peer');

const peer = new Peer();
let conn;

let currentRound = 0;
let myScore = 0;
let oppScore = 0;
let iAmReady = false;
let oppIsReady = false;
let hasAnswered = false;
let oppHasAnswered = false;
let timer;
let timeLeft = 90;

// СТИЛИ ДЛЯ ССЫЛКИ (чтобы она была поверх всего)
const linkEl = document.getElementById('room-link');
linkEl.style.position = 'fixed';
linkEl.style.top = '10px';
linkEl.style.left = '50%';
linkEl.style.transform = 'translateX(-50%)';
linkEl.style.zIndex = '9999';
linkEl.style.background = 'rgba(0,0,0,0.8)';
linkEl.style.padding = '10px';
linkEl.style.borderRadius = '5px';
linkEl.style.color = '#00ff00';
linkEl.style.border = '1px solid #00ff00';
linkEl.style.fontSize = '14px';

peer.on('open', (id) => {
    if (!peerIdFromUrl) {
        const gameUrl = window.location.origin + window.location.pathname + '?peer=' + id;
        
        linkEl.innerText = "КЛИКНИ ТУТ, ЧТОБЫ СКОПИРОВАТЬ ССЫЛКУ";
        linkEl.style.cursor = 'pointer';
        
        linkEl.onclick = () => {
            navigator.clipboard.writeText(gameUrl);
            linkEl.innerText = "СКОПИРОВАНО! ОТПРАВЛЯЙ ДРУГУ";
            setTimeout(() => { linkEl.innerText = "ССЫЛКА СКОПИРОВАНА"; }, 2000);
        };

        console.log("Ссылка для друга:", gameUrl);
        document.getElementById('status').innerText = "Скопируй ссылку вверху экрана и отправь другу!";
    } else {
        conn = peer.connect(peerIdFromUrl);
        linkEl.innerText = "ПОДКЛЮЧЕНИЕ К ХОСТУ...";
        setupConnection();
    }
});

peer.on('connection', (c) => {
    conn = c;
    setupConnection();
});

function setupConnection() {
    conn.on('open', () => {
        document.getElementById('status').innerText = "Противник в сети! Жми ГОТОВ.";
        linkEl.style.display = 'none'; // Скрываем ссылку, когда все в сборе
        
        conn.on('data', (data) => {
            if (data.type === 'ready') { oppIsReady = true; checkStartRound(); }
            if (data.type === 'answer') { oppHasAnswered = true; processOpponentAnswer(data.choice); checkRoundEnd(); }
        });
    });
}

function setReady() {
    iAmReady = true;
    document.getElementById('ready-btn').disabled = true;
    document.getElementById('ready-status').innerText = "Ждем соперника...";
    if (conn) conn.send({ type: 'ready' });
    checkStartRound();
}

function checkStartRound() {
    if (iAmReady && oppIsReady) {
        document.getElementById('prep-screen').style.display = 'none';
        document.getElementById('game-grid').style.display = 'grid';
        loadRound();
    }
}

function loadRound() {
    hasAnswered = false; oppHasAnswered = false; timeLeft = 90;
    const round = gameData[currentRound];
    document.getElementById('map-preview').src = round.map;
    for (let i = 0; i < 4; i++) {
        document.getElementById(`img${i}`).src = round.images[i];
        document.getElementById(`img${i}`).parentElement.className = 'option';
    }
    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = `Время: ${timeLeft}`;
        if (timeLeft <= 0) { clearInterval(timer); if (!hasAnswered) sendChoice(-1); }
    }, 1000);
}

function sendChoice(index) {
    if (hasAnswered) return;
    hasAnswered = true;
    clearInterval(timer);
    const isCorrect = index === gameData[currentRound].correct;
    if (isCorrect) myScore++;
    if (index !== -1) highlightResult(index, isCorrect);
    if (conn) conn.send({ type: 'answer', choice: index, round: currentRound });
    document.getElementById('status').innerText = "Ждем ответ соперника...";
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
        setTimeout(() => {
            currentRound++;
            if (currentRound < gameData.length) {
                iAmReady = false; oppIsReady = false;
                document.getElementById('ready-btn').disabled = false;
                document.getElementById('prep-screen').style.display = 'flex';
                document.getElementById('game-grid').style.display = 'none';
                document.getElementById('map-preview').src = gameData[currentRound].map;
            } else {
                alert(`Игра окончена! Счет: ${myScore} - ${oppScore}`);
            }
        }, 3000);
    }
}

document.getElementById('map-preview').src = gameData[0].map;

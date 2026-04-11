// --- КОНФИГУРАЦИЯ ДАННЫХ ---
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
    // Добавляй остальные раунды ниже по такому же шаблону
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

// Когда наш ID создан
peer.on('open', (id) => {
    if (!peerIdFromUrl) {
        // Мы — создатель комнаты
        const gameUrl = window.location.origin + window.location.pathname + '?peer=' + id;
        document.getElementById('room-link').innerText = gameUrl;
        document.getElementById('status').innerText = "Скинь новую ссылку другу!";
    } else {
        // Мы зашли по ссылке друга
        conn = peer.connect(peerIdFromUrl);
        document.getElementById('room-link').innerText = "Соединение...";
        setupConnection();
    }
});

// Когда кто-то подключается к нам
peer.on('connection', (c) => {
    conn = c;
    setupConnection();
});

function setupConnection() {
    conn.on('open', () => {
        document.getElementById('status').innerText = "Противник в сети!";
        
        conn.on('data', (data) => {
            if (data.type === 'ready') {
                oppIsReady = true;
                checkStartRound();
            }
            if (data.type === 'answer') {
                oppHasAnswered = true;
                processOpponentAnswer(data.choice);
                checkRoundEnd();
            }
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
    hasAnswered = false;
    oppHasAnswered = false;
    timeLeft = 90;
    document.getElementById('timer').innerText = `Время: ${timeLeft}`;
    document.getElementById('round-num').innerText = currentRound + 1;
    document.getElementById('status').innerText = "Твой ход!";
    document.getElementById('game-grid').style.pointerEvents = 'auto';
    
    const round = gameData[currentRound];
    document.getElementById('map-preview').src = round.map;
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
            if (!hasAnswered) sendChoice(-1);
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
    if (conn) conn.send({ type: 'answer', choice: index, round: currentRound });

    document.getElementById('status').innerText = "Ждем соперника...";
    document.getElementById('game-grid').style.pointerEvents = 'none';
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
                iAmReady = false;
                oppIsReady = false;
                document.getElementById('ready-btn').disabled = false;
                document.getElementById('ready-status').innerText = "Ждем готовности...";
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
    let resultText = myScore > oppScore ? "Победа! 🎉" : (myScore < oppScore ? "Поражение... 💀" : "Ничья! 🤝");
    document.getElementById('status').innerHTML = `<b>${resultText}</b><br>Счет: ${myScore} - ${oppScore}`;
}

// Показываем карту первого раунда
document.getElementById('map-preview').src = gameData[0].map;

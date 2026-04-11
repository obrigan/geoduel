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

// Экран настройки
const setupScreen = document.createElement('div');
setupScreen.id = "setup-overlay";
setupScreen.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:#1a1a1a; color:white; z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-family:Arial, sans-serif;";

peer.on('open', (id) => {
    if (!peerIdFromUrl) {
        document.body.appendChild(setupScreen);
        const gameUrl = window.location.origin + window.location.pathname + '?peer=' + id;
        
        setupScreen.innerHTML = `
            <h1 style="color:#2ecc71;">GeoDuel 1v1</h1>
            <p>Скопируй ссылку для друга:</p>
            <div style="background:#333; padding:15px; border-radius:8px; margin:20px 0; font-family:monospace; font-size:12px;">${gameUrl}</div>
            <button id="btn-copy" style="padding:15px 30px; background:#2ecc71; border:none; color:white; border-radius:5px; cursor:pointer; font-weight:bold;">СКОПИРОВАТЬ</button>
            <button id="btn-start" style="margin-top:30px; background:none; border:1px solid #555; color:#888; cursor:pointer;">Я отправил, к игре!</button>
        `;

        document.getElementById('btn-copy').onclick = () => {
            navigator.clipboard.writeText(gameUrl);
            document.getElementById('btn-copy').innerText = "СКОПИРОВАНО!";
        };

        document.getElementById('btn-start').onclick = () => {
            setupScreen.style.display = 'none';
            document.getElementById('main-game-container').style.display = 'block';
        };
    } else {
        conn = peer.connect(peerIdFromUrl);
        setupConnection();
    }
});

peer.on('connection', (c) => {
    conn = c;
    setupConnection();
});

function setupConnection() {
    conn.on('open', () => {
        document.getElementById('main-game-container').style.display = 'block';
        if (document.getElementById('setup-overlay')) document.getElementById('setup-overlay').style.display = 'none';
        document.getElementById('status').innerText = "Противник подключен!";
        
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
    document.getElementById('score-me').innerText = myScore;
    if (conn) conn.send({ type: 'answer', choice: index });
    document.getElementById('status').innerText = "Ждем соперника...";
    checkRoundEnd();
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
                alert("Игра окончена!");
            }
        }, 3000);
    }
}

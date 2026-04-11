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

// Оверлей для создания комнаты
const setupScreen = document.createElement('div');
setupScreen.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:#111; color:white; z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-family:sans-serif;";

peer.on('open', (id) => {
    if (!peerIdFromUrl) {
        document.body.appendChild(setupScreen);
        const gameUrl = window.location.origin + window.location.pathname + '?peer=' + id;
        setupScreen.innerHTML = `
            <h1 style="color:#2ecc71">GeoDuel 1v1</h1>
            <p>Отправь эту ссылку другу:</p>
            <div style="background:#222; padding:15px; border-radius:5px; margin:20px; font-size:14px; border:1px solid #444;">${gameUrl}</div>
            <button id="btn-copy" style="padding:15px 30px; background:#2ecc71; border:none; color:white; border-radius:5px; cursor:pointer; font-weight:bold;">СКОПИРОВАТЬ</button>
            <button id="btn-start" style="margin-top:40px; background:none; border:1px solid #555; color:#777; cursor:pointer;">Я отправил, начать игру</button>
        `;

        document.getElementById('btn-copy').onclick = () => {
            navigator.clipboard.writeText(gameUrl);
            document.getElementById('btn-copy').innerText = "ГОТОВО!";
        };

        document.getElementById('btn-start').onclick = () => {
            setupScreen.remove();
            document.getElementById('main-game-container').style.display = 'block';
            initReadyButton(); // Инициализируем кнопку при показе
        };
    } else {
        conn = peer.connect(peerIdFromUrl);
        setupConnection();
    }
});

function initReadyButton() {
    const btn = document.getElementById('ready-btn');
    if (btn) {
        btn.onclick = () => {
            iAmReady = true;
            btn.disabled = true;
            btn.style.opacity = "0.5";
            document.getElementById('ready-status').innerText = "Ты готов! Ждем соперника...";
            if (conn) conn.send({ type: 'ready' });
            checkStartRound();
        };
    }
}

peer.on('connection', (c) => {
    conn = c;
    setupConnection();
});

function setupConnection() {
    conn.on('open', () => {
        document.getElementById('main-game-container').style.display = 'block';
        setupScreen.remove();
        initReadyButton();
        document.getElementById('status').innerText = "Соперник в сети!";
        
        conn.on('data', (data) => {
            if (data.type === 'ready') { oppIsReady = true; checkStartRound(); }
            if (data.type === 'answer') { oppHasAnswered = true; processOpponentAnswer(data.choice); checkRoundEnd(); }
        });
    });
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
    document.getElementById('round-num').innerText = currentRound + 1;
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
        document.getElementById('timer-val').innerText = timeLeft;
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
                const btn = document.getElementById('ready-btn');
                btn.disabled = false;
                btn.style.opacity = "1";
                document.getElementById('prep-screen').style.display = 'flex';
                document.getElementById('game-grid').style.display = 'none';
                document.getElementById('map-preview').src = gameData[currentRound].map;
                document.getElementById('ready-status').innerText = "Ждем готовности игроков...";
            } else {
                alert(`Игра окончена! Финальный счет: ${myScore} - ${oppScore}`);
            }
        }, 3000);
    }
}

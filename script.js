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

const setupScreen = document.createElement('div');
setupScreen.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:#111; color:white; z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-family:sans-serif;";

peer.on('open', (id) => {
    if (!peerIdFromUrl) {
        document.body.appendChild(setupScreen);
        const gameUrl = window.location.origin + window.location.pathname + '?peer=' + id;
        setupScreen.innerHTML = `
            <h1 style="color:#2ecc71">GeoDuel 1v1</h1>
            <p>Отправь эту ссылку другу:</p>
            <div style="background:#222; padding:15px; border-radius:5px; margin:20px; font-size:14px; border:1px solid #444; word-break:break-all;">${gameUrl}</div>
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
        if (document.body.contains(setupScreen)) setupScreen.remove();
        document.getElementById('status').innerText = "Соперник подключился!";
        if (iAmReady && conn && conn.open) conn.send({ type: 'ready' });
        
        conn.on('data', (data) => {
            if (data.type === 'ready') { oppIsReady = true; checkStartRound(); }
            if (data.type === 'answer') { oppHasAnswered = true; processOpponentAnswer(data.choice); checkRoundEnd(); }
        });
    });
}

function setReady() {
    if (iAmReady) return;
    iAmReady = true;
    const btn = document.getElementById('ready-btn');
    btn.disabled = true;
    btn.style.opacity = "0.5";
    document.getElementById('ready-status').innerText = "Ты готов! Ждем соперника...";
    if (conn && conn.open) conn.send({ type: 'ready' });
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
    document.getElementById('game-grid').style.pointerEvents = 'auto'; // Разблокируем клики
    
    // Снимаем старую подсветку
    const options = document.querySelectorAll('.option');
    options.forEach(opt => opt.style.outline = "none");

    const round = gameData[currentRound];
    document.getElementById('round-num').innerText = currentRound + 1;
    document.getElementById('map-preview').src = round.map;
    for (let i = 0; i < 4; i++) {
        document.getElementById(`img${i}`).src = round.images[i];
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

// ОСНОВНАЯ ПРАВКА ТУТ
function sendChoice(index) {
    if (hasAnswered) return;
    hasAnswered = true;
    clearInterval(timer);
    
    document.getElementById('game-grid').style.pointerEvents = 'none'; // Блокируем сетку

    const correctIndex = gameData[currentRound].correct;
    const isCorrect = (index === correctIndex);

    if (isCorrect) {
        myScore++;
    }
    document.getElementById('score-me').innerText = myScore;

    // ВИЗУАЛИЗАЦИЯ
    revealAnswers(index, correctIndex);

    if (conn && conn.open) conn.send({ type: 'answer', choice: index });
    document.getElementById('status').innerText = "Ждем ответ соперника...";
    checkRoundEnd();
}

function revealAnswers(myChoice, correctChoice) {
    const options = document.querySelectorAll('.option');
    
    // 1. Подсвечиваем правильный ответ всегда (зеленым)
    options[correctChoice].style.outline = "8px solid #2ecc71";
    options[correctChoice].style.zIndex = "10";

    // 2. Если мы ошиблись, подсвечиваем наш выбор красным
    if (myChoice !== correctChoice && myChoice !== -1) {
        options[myChoice].style.outline = "8px solid #e74c3c";
        options[myChoice].style.zIndex = "5";
    }
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
                iAmReady = false; oppIsReady = false;
                const btn = document.getElementById('ready-btn');
                btn.disabled = false; btn.style.opacity = "1";
                document.getElementById('prep-screen').style.display = 'flex';
                document.getElementById('game-grid').style.display = 'none';
                document.getElementById('map-preview').src = gameData[currentRound].map;
                document.getElementById('ready-status').innerText = "Ждем готовности игроков...";
                document.getElementById('status').innerText = "Ожидание...";
            } else {
                alert(`Игра окончена! Финальный счет: ${myScore} - ${oppScore}`);
                location.reload(); // Перезагрузка для новой игры
            }
        }, 3000);
    }
}

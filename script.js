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

// Создаем "Экран ссылки", который перекроет ВООБЩЕ ВСЁ
const overlay = document.createElement('div');
overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:black; color:white; z-index:10000; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-family:sans-serif; padding:20px;";
overlay.innerHTML = `
    <h2 style="color:#00ff00">РЕЖИМ СОЗДАНИЯ КОМНАТЫ</h2>
    <p>Чтобы играть с другом, нажми на кнопку ниже и отправь ему ссылку:</p>
    <button id="copy-link-btn" style="padding:15px 30px; font-size:18px; cursor:pointer; background:#00ff00; border:none; border-radius:5px; font-weight:bold;">СКОПИРОВАТЬ ССЫЛКУ</button>
    <p id="copy-status" style="margin-top:15px; color:#aaa;"></p>
    <button id="close-overlay" style="margin-top:30px; background:none; border:1px solid #555; color:#555; cursor:pointer;">Продолжить к игре (нажми после отправки)</button>
`;

peer.on('open', (id) => {
    if (!peerIdFromUrl) {
        // Если мы хост — показываем оверлей со ссылкой
        document.body.appendChild(overlay);
        const gameUrl = window.location.origin + window.location.pathname + '?peer=' + id;
        
        document.getElementById('copy-link-btn').onclick = () => {
            navigator.clipboard.writeText(gameUrl);
            document.getElementById('copy-status').innerText = "ССЫЛКА СКОПИРОВАНА В БУФЕР!";
            document.getElementById('copy-link-btn').innerText = "ГОТОВО!";
        };

        document.getElementById('close-overlay').onclick = () => {
            overlay.style.display = 'none';
        };
        
        // Дублируем в старое поле на всякий случай
        document.getElementById('room-link').innerText = gameUrl;
    } else {
        // Если мы гость — подключаемся
        conn = peer.connect(peerIdFromUrl);
        document.getElementById('status').innerText = "Подключаемся к другу...";
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
        if (document.body.contains(overlay)) overlay.style.display = 'none';
        
        conn.on('data', (data) => {
            if (data.type === 'ready') { oppIsReady = true; checkStartRound(); }
            if (data.type === 'answer') { oppHasAnswered = true; processOpponentAnswer(data.choice); checkRoundEnd(); }
        });
    });
}

function setReady() {
    iAmReady = true;
    document.getElementById('ready-btn').disabled = true;
    document.getElementById('ready-status').innerText = "Ждем готовности соперника...";
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

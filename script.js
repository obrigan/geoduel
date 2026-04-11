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

// Оверлей для ссылки
const setupScreen = document.createElement('div');
setupScreen.id = "setup-overlay";

peer.on('open', (id) => {
    if (!peerIdFromUrl) {
        document.body.appendChild(setupScreen);
        const gameUrl = window.location.origin + window.location.pathname + '?peer=' + id;
        setupScreen.innerHTML = `
            <h1 style="color:#2ecc71; margin-bottom:10px;">GeoDuel 1v1</h1>
            <p>Скопируй ссылку и отправь другу:</p>
            <div style="background:#222; padding:15px; border-radius:8px; margin:20px; font-family:monospace; font-size:14px; border:1px solid #444; word-break:break-all; max-width:80%;">${gameUrl}</div>
            <button id="btn-copy" style="padding:15px 30px; background:#2ecc71; border:none; color:white; border-radius:8px; cursor:pointer; font-weight:bold; font-size:16px;">СКОПИРОВАТЬ</button>
            <button id="btn-start" style="margin-top:30px; background:none; border:1px solid #555; color:#777; cursor:pointer; border-radius:5px; padding:5px 15px;">Я отправил, к игре!</button>
        `;

        document.getElementById('btn-copy').onclick = () => {
            navigator.clipboard.writeText(gameUrl);
            document.getElementById('btn-copy').innerText = "СКОПИРОВАНО!";
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
        if (document.getElementById('setup-overlay')) setupScreen.remove();
        document.getElementById('status').innerText = "Соперник в сети!";
        if (iAmReady) conn.send({ type: 'ready' });
        
        conn.on('data', (data) => {
            if (data.type === 'ready') { oppIsReady = true; checkStartRound(); }
            if (data.type === 'answer') { 
                oppHasAnswered = true; 
                if (data.choice === gameData[currentRound].correct) oppScore++;
                document.getElementById('score-opp').innerText = oppScore;
                checkRoundEnd(); 
            }
        });
    });
}

window.setReady = function() {
    if (iAmReady) return;
    iAmReady = true;
    const btn = document.getElementById('ready-btn');
    btn.disabled = true;
    btn.style.opacity = "0.5";
    document.getElementById('ready-status').innerText = "Ты готов! Ждем соперника...";
    if (conn && conn.open) conn.send({ type: 'ready' });
    checkStartRound();
};

function checkStartRound() {
    if (iAmReady && oppIsReady) {
        document.getElementById('prep-screen').style.display = 'none';
        document.getElementById('game-grid').style.display = 'grid';
        loadRound();
    }
}

function loadRound() {
    hasAnswered = false; oppHasAnswered = false; timeLeft = 90;
    document.getElementById('game-grid').style.pointerEvents = 'auto';
    
    // Сброс анимаций
    document.querySelectorAll('.option').forEach(opt => opt.className = 'option');

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

function sendChoice(index) {
    if (hasAnswered) return;
    hasAnswered = true;
    clearInterval(timer);
    document.getElementById('game-grid').style.pointerEvents = 'none';

    const correctIndex = gameData[currentRound].correct;
    if (index === correctIndex) {
        myScore++;
        document.getElementById('score-me').innerText = myScore;
    }

    revealAnswers(index, correctIndex);

    if (conn && conn.open) conn.send({ type: 'answer', choice: index });
    document.getElementById('status').innerText = "Ждем ответ соперника...";
    checkRoundEnd();
}

function revealAnswers(myChoice, correctChoice) {
    const options = document.querySelectorAll('.option');
    options.forEach(opt => opt.classList.add('dimmed'));

    options[correctChoice].classList.remove('dimmed');
    options[correctChoice].classList.add('correct-choice');

    if (myChoice !== correctChoice && myChoice !== -1) {
        options[myChoice].classList.remove('dimmed');
        options[myChoice].classList.add('wrong-choice');
    }
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
                document.getElementById('ready-status').innerText = "Ждем готовности...";
                document.getElementById('status').innerText = "Ожидание...";
            } else {
                alert(`Игра окончена! Счет: ${myScore} - ${oppScore}`);
                location.reload();
            }
        }, 3000);
    }
}

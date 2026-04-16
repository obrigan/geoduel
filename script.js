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

const urlParams = new URLSearchParams(window.location.search);
let peerIdFromUrl = urlParams.get('peer');

// "БРОНЕБОЙНАЯ" КОНФИГУРАЦИЯ СЕТИ
const peerConfig = {
    host: '0.peerjs.com',
    port: 443,
    secure: true,
    debug: 1,
    config: {
        'iceServers': [
            { 'urls': 'stun:stun.l.google.com:19302' },
            { 'urls': 'stun:stun1.l.google.com:19302' },
            { 'urls': 'stun:stun2.l.google.com:19302' },
            { 'urls': 'stun:stun3.l.google.com:19302' },
            { 'urls': 'stun:stun4.l.google.com:19302' }
        ]
    }
};

let peer = new Peer(peerConfig);
let conn;
let myNickname = "Я", oppNickname = "Соперник";
let currentRound = 0, myScore = 0, oppScore = 0;
let iAmReady = false, oppIsReady = false, hasAnswered = false, oppHasAnswered = false;
let timer, timeLeft = 90;

// ТАЙМЕР ДЛЯ ПРОВЕРКИ ЗАВИСШЕГО ПОДКЛЮЧЕНИЯ
let connectionTimeout = setTimeout(() => {
    if (!peer.id) {
        document.getElementById('network-status').innerText = "ОШИБКА: Провайдер блокирует сеть.";
        document.getElementById('debug-info').innerText = "Попробуйте зайти с телефона или сменить браузер.";
    }
}, 12000);

window.onload = () => {
    if (!peerIdFromUrl) {
        document.getElementById('host-controls-ui').style.display = 'block';
    } else {
        document.getElementById('guest-controls-ui').style.display = 'block';
    }
};

peer.on('open', (id) => {
    clearTimeout(connectionTimeout);
    document.getElementById('network-status').innerText = "СЕТЬ: ГОТОВА";
    document.getElementById('network-status').style.color = "#2ecc71";
    document.getElementById('btn-start-game').disabled = false;
    
    if (!peerIdFromUrl) {
        const gameUrl = window.location.origin + window.location.pathname + '?peer=' + id;
        document.getElementById('game-url').innerText = gameUrl;
        document.getElementById('btn-copy').onclick = () => {
            navigator.clipboard.writeText(gameUrl);
            document.getElementById('btn-copy').innerText = "ССЫЛКА В БУФЕРЕ!";
        };
        document.getElementById('btn-start-game').onclick = () => {
            myNickname = document.getElementById('nick-input').value || "Хост";
            document.getElementById('name-me').innerText = myNickname;
            document.getElementById('setup-overlay').style.display = 'none';
            document.getElementById('main-game-container').style.display = 'flex';
        };
    }
});

peer.on('connection', (incoming) => {
    conn = incoming;
    setupConnection(conn);
});

peer.on('error', (err) => {
    console.error("PeerJS Error Type:", err.type);
    document.getElementById('network-status').innerText = "СЕТЬ: ОШИБКА (" + err.type + ")";
    document.getElementById('network-status').style.color = "#e74c3c";
});

window.joinDuel = function() {
    myNickname = document.getElementById('nick-input').value || "Гость";
    document.getElementById('name-me').innerText = myNickname;
    document.getElementById('setup-overlay').style.display = 'none';
    document.getElementById('main-game-container').style.display = 'flex';
    
    conn = peer.connect(peerIdFromUrl, { reliable: true });
    setupConnection(conn);
};

function setupConnection(c) {
    c.on('open', () => {
        c.send({ type: 'init-name', name: myNickname });
        
        c.on('data', (data) => {
            if (data.type === 'init-name') {
                oppNickname = data.name;
                document.getElementById('name-opp').innerText = oppNickname;
                document.getElementById('status').innerText = "Соперник подключился!";
                if (!peerIdFromUrl) c.send({ type: 'init-name', name: myNickname });
            }
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

// === ЛОГИКА ИГРЫ ===
window.setReady = function() {
    if (iAmReady) return;
    iAmReady = true;
    document.getElementById('ready-btn').disabled = true;
    document.getElementById('ready-status').innerText = "Ожидание соперника...";
    if (conn && conn.open) conn.send({ type: 'ready' });
    checkStartRound();
};

function checkStartRound() {
    if (iAmReady && oppIsReady) {
        document.getElementById('prep-screen').style.display = 'none';
        document.getElementById('round-screen').style.display = 'flex';
        loadRound();
    }
}

function loadRound() {
    hasAnswered = false; oppHasAnswered = false; timeLeft = 90;
    document.getElementById('status').innerText = "Твой ход!";
    document.getElementById('game-grid').style.pointerEvents = 'auto';
    
    const round = gameData[currentRound];
    document.getElementById('round-num').innerText = currentRound + 1;
    document.getElementById('map-preview').src = round.map;
    
    for (let i = 0; i < 4; i++) {
        const opt = document.querySelectorAll('.option')[i];
        opt.className = 'option';
        document.getElementById(`img${i}`).src = round.images[i];
    }
    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-val').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            if (!hasAnswered) sendChoice(-1);
        }
    }, 1000);
}

window.sendChoice = function(index) {
    if (hasAnswered) return;
    hasAnswered = true;
    clearInterval(timer);
    document.getElementById('game-grid').style.pointerEvents = 'none';

    const correct = gameData[currentRound].correct;
    if (index === correct) {
        myScore++;
        document.getElementById('score-me').innerText = myScore;
    }
    
    revealAnswers(index, correct);
    if (conn && conn.open) conn.send({ type: 'answer', choice: index });
    document.getElementById('status').innerText = "Ждем ответ...";
    checkRoundEnd();
};

function revealAnswers(myChoice, correctChoice) {
    const opts = document.querySelectorAll('.option');
    opts.forEach(o => o.classList.add('dimmed'));
    opts[correctChoice].classList.add('correct-choice');
    opts[correctChoice].classList.remove('dimmed');
    if (myChoice !== correctChoice && myChoice !== -1) {
        opts[myChoice].classList.add('wrong-choice');
        opts[myChoice].classList.remove('dimmed');
    }
}

function checkRoundEnd() {
    if (hasAnswered && oppHasAnswered) {
        setTimeout(() => {
            currentRound++;
            if (currentRound < gameData.length) {
                iAmReady = false; oppIsReady = false;
                document.getElementById('ready-btn').disabled = false;
                document.getElementById('ready-status').innerText = "Ждем готовности...";
                document.getElementById('prep-screen').style.display = 'flex';
                document.getElementById('round-screen').style.display = 'none';
                document.getElementById('map-preview').src = gameData[currentRound].map;
                document.getElementById('round-num').innerText = currentRound + 1;
            } else {
                alert(`ИГРА ОКОНЧЕНА! Счет: ${myScore} - ${oppScore}`);
                location.reload();
            }
        }, 3000);
    }
}

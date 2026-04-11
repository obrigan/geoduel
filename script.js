const gameData = [
    { map: 'images/map1.jpg', correct: 0, images: ['images/r1_1.jpg', 'images/r1_2.jpg', 'images/r1_3.jpg', 'images/r1_4.jpg'] },
    { map: 'images/map2.jpg', correct: 1, images: ['images/r2_1.jpg', 'images/r2_2.jpg', 'images/r2_3.jpg', 'images/r2_4.jpg'] }
];

const urlParams = new URLSearchParams(window.location.search);
let peerIdFromUrl = urlParams.get('peer');
const peer = new Peer();
let conn;

let myNickname = "";
let oppNickname = "Соперник";
let isGameStarted = false;

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
setupScreen.id = "setup-overlay";

peer.on('open', (id) => {
    document.body.appendChild(setupScreen);
    const gameUrl = window.location.origin + window.location.pathname + '?peer=' + id;

    if (!peerIdFromUrl) {
        setupScreen.innerHTML = `
            <h1>GeoDuel 1v1</h1>
            <input type="text" id="nick-input" placeholder="Твой никнейм" maxlength="12">
            <div class="url-box">${gameUrl}</div>
            <button id="btn-copy" class="menu-btn">СКОПИРОВАТЬ ССЫЛКУ</button>
            <button id="btn-start" class="menu-btn" style="background:transparent; border:1px solid #444; color:#777; margin-top:15px;">ПЕРЕЙТИ К ИГРЕ</button>
        `;
        document.getElementById('btn-copy').onclick = () => {
            navigator.clipboard.writeText(gameUrl);
            document.getElementById('btn-copy').innerText = "ССЫЛКА В БУФЕРЕ!";
        };
        document.getElementById('btn-start').onclick = () => {
            myNickname = document.getElementById('nick-input').value || "Хост";
            document.getElementById('name-me').innerText = myNickname;
            isGameStarted = true;
            setupScreen.style.display = 'none';
            document.getElementById('main-game-container').style.display = 'flex';
            if (conn && conn.open) conn.send({ type: 'init-name', name: myNickname });
        };
    } else {
        setupScreen.innerHTML = `
            <h1>GeoDuel 1v1</h1>
            <input type="text" id="nick-input" placeholder="Твой никнейм" maxlength="12">
            <button id="btn-join" class="menu-btn" style="margin-top:15px;">ПРИСОЕДИНИТЬСЯ</button>
        `;
        document.getElementById('btn-join').onclick = () => {
            myNickname = document.getElementById('nick-input').value || "Гость";
            document.getElementById('name-me').innerText = myNickname;
            isGameStarted = true;
            conn = peer.connect(peerIdFromUrl);
            setupConnectionListeners(conn);
        };
    }
});

peer.on('connection', (incomingConn) => {
    conn = incomingConn;
    setupConnectionListeners(conn);
});

function setupConnectionListeners(connection) {
    connection.on('open', () => {
        document.getElementById('main-game-container').style.display = 'flex';
        setupScreen.style.display = 'none';

        if (isGameStarted) {
            connection.send({ type: 'init-name', name: myNickname });
        }
        
        connection.on('data', (data) => {
            if (data.type === 'init-name') {
                oppNickname = data.name;
                document.getElementById('name-opp').innerText = oppNickname;
                if (!peerIdFromUrl && isGameStarted) {
                    connection.send({ type: 'init-name', name: myNickname });
                }
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
        document.getElementById('game-grid').style.display = 'grid';
        loadRound();
    }
}

function loadRound() {
    hasAnswered = false; oppHasAnswered = false; timeLeft = 90;
    document.getElementById('game-grid').style.pointerEvents = 'auto';
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
    document.getElementById('status').innerText = "Ждем соперника...";
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
                document.getElementById('ready-btn').disabled = false;
                document.getElementById('prep-screen').style.display = 'flex';
                document.getElementById('game-grid').style.display = 'none';
                document.getElementById('map-preview').src = gameData[currentRound].map;
                document.getElementById('ready-status').innerText = "Ждем готовности...";
                document.getElementById('status').innerText = "Ожидание...";
            } else {
                alert(`ФИНАЛ!\n${myNickname}: ${myScore}\n${oppNickname}: ${oppScore}`);
                location.reload();
            }
        }, 3000);
    }
}

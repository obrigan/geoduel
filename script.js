const gameData = [
    { map: 'images/map1.jpg', correct: 0, images: ['images/r1_1.jpg', 'images/r1_2.jpg', 'images/r1_3.jpg', 'images/r1_4.jpg'] },
    { map: 'images/map2.jpg', correct: 1, images: ['images/r2_1.jpg', 'images/r2_2.jpg', 'images/r2_3.jpg', 'images/r2_4.jpg'] }
];

const urlParams = new URLSearchParams(window.location.search);
let peerIdFromUrl = urlParams.get('peer');
const peer = new Peer();
let conn;

let myNickname = "Я";
let oppNickname = "Соперник";
let isGameStarted = false;

// Состояния бустов
let used5050 = false;
let usedTime = false;
let powerupUsedThisRound = false;

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
            <input type="text" id="nick-input" placeholder="Твой никнейм" maxlength="12" autocomplete="off">
            <div class="url-box">${gameUrl}</div>
            <button id="btn-copy" class="menu-btn">СКОПИРОВАТЬ ССЫЛКУ</button>
            <button id="btn-start" class="menu-btn secondary-btn">ПЕРЕЙТИ К ИГРЕ</button>
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
            <input type="text" id="nick-input" placeholder="Твой никнейм" maxlength="12" autocomplete="off">
            <button id="btn-join" class="menu-btn">ПРИСОЕДИНИТЬСЯ</button>
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
        if (isGameStarted) connection.send({ type: 'init-name', name: myNickname });
        
        connection.on('data', (data) => {
            if (data.type === 'init-name') {
                oppNickname = data.name;
                document.getElementById('name-opp').innerText = oppNickname;
                document.getElementById('status').innerText = "Соперник подключился!";
                if (!peerIdFromUrl && isGameStarted) { connection.send({ type: 'init-name', name: myNickname }); }
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
        const prepScreen = document.getElementById('prep-screen');
        const gameGrid = document.getElementById('game-grid');
        prepScreen.classList.remove('active');
        setTimeout(() => {
            prepScreen.style.display = 'none';
            gameGrid.style.display = 'grid';
            document.getElementById('powerups-panel').style.display = 'flex'; // Показываем бусты
            loadRound();
            setTimeout(() => gameGrid.classList.add('active'), 50);
        }, 500);
    }
}

// ЛОГИКА ПОДСКАЗОК
window.updatePowerupUI = function() {
    const btn5050 = document.getElementById('btn-5050');
    const btnTime = document.getElementById('btn-time');

    if (used5050 || powerupUsedThisRound || hasAnswered) btn5050.classList.add('powerup-disabled');
    else btn5050.classList.remove('powerup-disabled');

    if (usedTime || powerupUsedThisRound || hasAnswered) btnTime.classList.add('powerup-disabled');
    else btnTime.classList.remove('powerup-disabled');
};

window.use5050 = function() {
    if (used5050 || powerupUsedThisRound || hasAnswered) return;
    used5050 = true;
    powerupUsedThisRound = true;
    updatePowerupUI();

    const correctIndex = gameData[currentRound].correct;
    // Оставляем только неверные индексы, перемешиваем и берем 2 из них на удаление
    let wrongIndices = [0, 1, 2, 3].filter(i => i !== correctIndex);
    wrongIndices.sort(() => Math.random() - 0.5);
    const toEliminate = wrongIndices.slice(0, 2);

    const options = document.querySelectorAll('.option');
    toEliminate.forEach(index => {
        options[index].classList.add('dimmed', 'eliminated');
    });
};

window.useTime = function() {
    if (usedTime || powerupUsedThisRound || hasAnswered) return;
    usedTime = true;
    powerupUsedThisRound = true;
    updatePowerupUI();

    timeLeft += 30;
    document.getElementById('timer-val').innerText = timeLeft;
    
    // Эффект добавления времени
    const timerHeader = document.getElementById('timer-header');
    timerHeader.style.color = '#3498db';
    timerHeader.style.transform = 'scale(1.2)';
    setTimeout(() => {
        timerHeader.style.color = '#e74c3c';
        timerHeader.style.transform = 'scale(1)';
    }, 500);
};

function loadRound() {
    hasAnswered = false; oppHasAnswered = false; timeLeft = 90;
    powerupUsedThisRound = false; // Сбрасываем ограничение "одна на раунд"
    
    document.getElementById('status').innerText = "Твой ход!";
    document.getElementById('game-grid').style.pointerEvents = 'auto';
    
    // Снимаем затемнения с прошлого раунда
    document.querySelectorAll('.option').forEach(opt => opt.className = 'option');
    
    updatePowerupUI(); // Обновляем визуал кнопок

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
    // Блокируем клик по убранной 50/50 карточке
    if (index !== -1 && document.querySelectorAll('.option')[index].classList.contains('eliminated')) return;
    
    hasAnswered = true;
    clearInterval(timer);
    document.getElementById('game-grid').style.pointerEvents = 'none';
    updatePowerupUI(); // Гасим кнопки бустов

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
            const gameGrid = document.getElementById('game-grid');
            if (currentRound < gameData.length) {
                iAmReady = false; oppIsReady = false;
                document.getElementById('ready-btn').disabled = false;
                const prepScreen = document.getElementById('prep-screen');
                
                gameGrid.classList.remove('active');
                document.getElementById('powerups-panel').style.display = 'none'; // Прячем бусты

                setTimeout(() => {
                    gameGrid.style.display = 'none';
                    prepScreen.style.display = 'flex';
                    document.getElementById('round-num').innerText = currentRound + 1;
                    document.getElementById('map-preview').src = gameData[currentRound].map;
                    setTimeout(() => prepScreen.classList.add('active'), 50);
                    document.getElementById('ready-status').innerText = "Ждем готовности...";
                    document.getElementById('status').innerText = "Ожидание...";
                }, 500);
            } else {
                gameGrid.classList.remove('active');
                document.getElementById('powerups-panel').style.display = 'none'; // Прячем бусты
                setTimeout(() => {
                    gameGrid.style.display = 'none';
                    showResults();
                }, 500);
            }
        }, 3000);
    }
}

function showResults() {
    const resultsScreen = document.getElementById('results-screen');
    const winnerNameSpan = document.getElementById('winner-name');
    const winnerCircle = document.getElementById('winner-circle-element');
    const finalScoresSpan = document.getElementById('final-scores');
    
    document.getElementById('ui-layer').style.display = 'none';
    finalScoresSpan.innerText = `${myScore} : ${oppScore}`;
    resultsScreen.style.display = 'flex';
    
    let hostScore, guestScore, trueWinnerName;

    if (!peerIdFromUrl) {
        hostScore = myScore; guestScore = oppScore;
    } else {
        hostScore = oppScore; guestScore = myScore;
    }

    if (hostScore > guestScore) {
        trueWinnerName = !peerIdFromUrl ? myNickname : oppNickname;
        winnerNameSpan.innerText = trueWinnerName;
        winnerCircle.classList.add('winner-active'); 
    } else if (guestScore > hostScore) {
        trueWinnerName = !peerIdFromUrl ? oppNickname : myNickname;
        winnerNameSpan.innerText = trueWinnerName;
        winnerCircle.classList.add('winner-active'); 
    } else {
        winnerNameSpan.innerText = "НИЧЬЯ!";
        winnerCircle.classList.add('tie'); 
    }
    
    setTimeout(() => resultsScreen.classList.add('active'), 50);
}

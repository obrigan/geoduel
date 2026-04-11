const gameData = [
    { map: 'images/map1.jpg', correct: 0, images: ['images/r1_1.jpg', 'images/r1_2.jpg', 'images/r1_3.jpg', 'images/r1_4.jpg'] },
    { map: 'images/map2.jpg', correct: 1, images: ['images/r2_1.jpg', 'images/r2_2.jpg', 'images/r2_3.jpg', 'images/r2_4.jpg'] }
];

const urlParams = new URLSearchParams(window.location.search);
let peerIdFromUrl = urlParams.get('peer');
const peer = new Peer();
let conn;

// Создаем "Чистый экран" для ссылки
const setupScreen = document.createElement('div');
setupScreen.id = "setup-overlay";
setupScreen.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:#1a1a1a; color:white; z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:Arial, sans-serif;";

peer.on('open', (id) => {
    if (!peerIdFromUrl) {
        // МЫ ХОСТ - Показываем только экран копирования
        document.body.appendChild(setupScreen);
        const gameUrl = window.location.origin + window.location.pathname + '?peer=' + id;
        
        setupScreen.innerHTML = `
            <h1 style="color:#4CAF50;">Создание игры 1v1</h1>
            <p style="margin-bottom:20px;">Скопируйте ссылку и отправьте другу:</p>
            <div style="background:#333; padding:15px; border-radius:8px; margin-bottom:20px; font-family:monospace; word-break:break-all; max-width:80%;">${gameUrl}</div>
            <button id="btn-copy" style="padding:15px 30px; background:#4CAF50; border:none; color:white; border-radius:5px; cursor:pointer; font-weight:bold; font-size:18px;">СКОПИРОВАТЬ ССЫЛКУ</button>
            <button id="btn-start" style="margin-top:40px; background:none; border:1px solid #666; color:#888; cursor:pointer;">Я отправил, перейти к игре</button>
        `;

        document.getElementById('btn-copy').onclick = () => {
            navigator.clipboard.writeText(gameUrl);
            document.getElementById('btn-copy').innerText = "СКОПИРОВАНО!";
            document.getElementById('btn-copy').style.background = "#2E7D32";
        };

        document.getElementById('btn-start').onclick = () => {
            setupScreen.style.display = 'none';
            document.getElementById('main-game-container').style.display = 'block';
        };
    } else {
        // МЫ ГОСТЬ - Сразу подключаемся
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
        console.log("Соединение установлено!");
        document.getElementById('main-game-container').style.display = 'block';
        if (document.getElementById('setup-overlay')) document.getElementById('setup-overlay').style.display = 'none';
        
        conn.on('data', (data) => {
            if (data.type === 'ready') { oppIsReady = true; checkStartRound(); }
            if (data.type === 'answer') { oppHasAnswered = true; processOpponentAnswer(data.choice); checkRoundEnd(); }
        });
    });
}

// Функции игры остаются без изменений (setReady, loadRound и т.д.)
// Убедитесь, что они используют правильные ID из вашего HTML

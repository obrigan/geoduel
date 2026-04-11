body {
    background-color: #0b0b0b;
    color: white;
    font-family: 'Segoe UI', sans-serif;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
}

#main-game-container {
    width: 100%;
    max-width: 1000px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

#ui-layer {
    text-align: center;
    margin-bottom: 20px;
}

#timer-header { color: #e74c3c; margin: 5px 0; font-size: 32px; }

#game-info {
    background: rgba(255,255,255,0.05);
    padding: 10px 25px;
    border-radius: 30px;
    border: 1px solid rgba(255,255,255,0.1);
    font-size: 18px;
}

.prep-container { display: flex; flex-direction: column; align-items: center; gap: 20px; }
.map-container img { 
    border-radius: 15px; 
    box-shadow: 0 10px 40px rgba(0,0,0,0.6); 
    border: 2px solid #333;
}

#game-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    width: 100%;
    margin-top: 10px;
}

.option {
    position: relative;
    cursor: pointer;
    background: #1a1a1a;
    border-radius: 15px;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    border: 6px solid transparent;
}

.option:hover { transform: scale(1.02); }
.option img { width: 100%; height: 280px; object-fit: cover; display: block; }

/* АНИМАЦИИ ОТВЕТОВ */

.dimmed {
    opacity: 0.3;
    filter: grayscale(100%);
    transform: scale(0.95);
}

.correct-choice {
    border-color: #2ecc71 !important;
    box-shadow: 0 0 40px rgba(46, 204, 113, 0.6);
    z-index: 10;
    animation: popCorrect 0.5s ease forwards;
}

.wrong-choice {
    border-color: #e74c3c !important;
    box-shadow: 0 0 40px rgba(231, 76, 60, 0.6);
    z-index: 5;
    animation: shakeWrong 0.5s ease-in-out forwards;
}

@keyframes popCorrect {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1.05); }
}

@keyframes shakeWrong {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
}

#setup-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: #111; color: white; z-index: 99999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center;
}

@media (max-width: 600px) {
    #game-grid { grid-template-columns: 1fr; }
    .option img { height: 200px; }
}

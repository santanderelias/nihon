import { state, playerState, characterLevels, initializeProgress, updateHomeButton, getHelpContent, progress, dictionaryWorker, getAudioFilename, adjustFontSize, showToast } from './script.js';

export function startQuiz(type) {
    state.isSectionActive = true;
    state.currentQuizType = type;

    const userLevel = playerState.levels[type];
    const levelsForType = characterLevels[type];
    state.currentCharset = {};

    for (let i = 0; i <= userLevel && i < levelsForType.length; i++) {
        Object.assign(state.currentCharset, levelsForType[i].set);
    }

    initializeProgress(state.currentCharset);
    updateHomeButton(true);

    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div>
            <div class="card text-center shadow-sm">
                <div id="button-container" class="btn-group" style="position: absolute; top: 10px; right: 10px; z-index: 101;"></div>
                <div id="hint-display" class="card shadow-sm bg-info text-white" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 200; padding: 1rem;"></div>
                <div class="card-body">
                    <div id="feedback-area" class="mb-2" style="height: 24px;"></div>
                    <div id="char-display-container">
                        <h1 id="char-display" class="display-1"></h1>
                    </div>
                    <div id="example-word-area" class="mt-3"></div>
                    <div class="mb-3">
                        <input type="text" class="form-control text-center" id="answer-input" autocomplete="off">
                    </div>
                    <button class="btn btn-success" id="check-button">Check</button>
                </div>
                <div id="help-card" class="card shadow-sm" style="display: none; position: absolute; top: 40px; right: 10px; width: 350px; z-index: 100; font-family: 'Noto Sans JP Embedded', sans-serif;"></div>
            </div>
            <div id="kanji-suggestions" class="mt-2"></div>
        </div>
    `;

    const helpCard = document.getElementById('help-card');
    const helpContent = getHelpContent(type);
    if (helpContent) {
        helpCard.innerHTML = `<div class="card-body">${helpContent}</div>`;
    }

    const answerInput = document.getElementById('answer-input');
    wanakana.bind(answerInput, { IMEMode: true });
    answerInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            document.getElementById('check-button').click();
        }
    });

    prepareNextQuestion();
    loadQuestion(type);
}

function prepareNextQuestion() {
    state.nextChar = getNextCharacter();
}

function getNextCharacter() {
    const unlockedChars = Object.keys(state.currentCharset);
    const unseenChars = unlockedChars.filter(char => !progress[char] || !progress[char].seen);

    if (unseenChars.length > 0 && Math.random() < 0.75) {
        return unseenChars[Math.floor(Math.random() * unseenChars.length)];
    }

    const now = Date.now();
    let weightedList = [];
    let minReviewTime = Infinity;
    let fallbackChar = null;

    for (const char of unlockedChars) {
        const p = progress[char];
        if (!p) continue;

        if (p.nextReview <= now) {
            const weight = Math.max(1, 1 + (p.incorrect * 5) - (p.correct * 0.5) + (p.streak * 2));
            for (let i = 0; i < weight; i++) {
                weightedList.push(char);
            }
        }

        if (p.nextReview < minReviewTime) {
            minReviewTime = p.nextReview;
            fallbackChar = char;
        }
    }

    if (weightedList.length > 0) {
        return weightedList[Math.floor(Math.random() * weightedList.length)];
    }

    return fallbackChar || unlockedChars[Math.floor(Math.random() * unlockedChars.length)];
}

export async function loadQuestion(type) {
    const contentArea = document.getElementById('content-area');
    const charToTest = state.nextChar;

    if (!charToTest) {
        contentArea.innerHTML = `
            <div class="card text-center shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">Congratulations!</h5>
                    <p class="card-text">You have mastered this set.</p>
                    <button class="btn btn-secondary" id="back-to-home">Back to Home</button>
                </div>
            </div>`;
        document.getElementById('back-to-home').addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('quiz-complete'));
        });
        return;
    }

    const correctAnswer = (type === 'numbers') ? state.currentCharset[charToTest].romaji : state.currentCharset[charToTest];
    const answerInput = document.getElementById('answer-input');
    const charDisplay = document.getElementById('char-display');

    charDisplay.textContent = charToTest;

    charDisplay.className = 'display-1';
    if (type === 'words') charDisplay.className = 'quiz-word';
    if (type === 'sentences') charDisplay.className = 'quiz-sentence';
    adjustFontSize(charDisplay);

    const buttonContainer = document.getElementById('button-container');
    let buttonsHTML = '';
    const filename = getAudioFilename(charToTest, type);
    if (filename) {
        buttonsHTML += `<button id="play-char-audio" class="btn btn-secondary"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button>`;
    }
    buttonsHTML += `<button id="hint-button" class="btn btn-secondary"><img src="/nihon/icons/answer.png" alt="Hint" style="height: 1.5rem;"></button>`;
    const helpContent = getHelpContent(type);
    if (helpContent) {
        buttonsHTML += `<button id="help-icon" class="btn btn-secondary"><img src="/nihon/icons/help.png" alt="Help" style="height: 1.5rem;"></button>`;
    }
    buttonContainer.innerHTML = buttonsHTML;


    document.getElementById('feedback-area').innerHTML = '';
    const p = progress[charToTest];
    if (!p.seen || p.lastAnswer === 'incorrect') {
        const hintDisplay = document.getElementById('hint-display');
        hintDisplay.textContent = `Hint: ${correctAnswer}`;
        hintDisplay.style.display = 'block';
        setTimeout(() => {
            hintDisplay.style.display = 'none';
        }, 2000);
        p.seen = true;
        localStorage.setItem('nihon-progress', JSON.stringify(progress));
    }

    document.getElementById('kanji-suggestions').innerHTML = '';
    answerInput.value = '';
    answerInput.readOnly = false;

    document.getElementById('check-button').disabled = false;

    answerInput.focus();

    const exampleWordArea = document.getElementById('example-word-area');
    if (exampleWordArea) {
        if (!state.isDictionaryReady) {
            exampleWordArea.innerHTML = `<div class="d-flex justify-content-center align-items-center mt-3"><div class="spinner-grow text-secondary me-2" role="status"><span class="visually-hidden">Loading...</span></div><span class="dictionary-loading-message">${state.currentDictionaryStatusMessage || 'Dictionary loading...'}</span></div>`;
        } else {
            await state.dictionaryReadyPromise;
            dictionaryWorker.postMessage({ action: 'getExampleWord', character: charToTest });
        }
    }
}

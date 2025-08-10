let currentFlashcardChar = '';
let isCurrentCardCorrect = true;

function startFlashcardMode(type) {
    isSectionActive = true;
    currentQuizType = type;

    const userLevel = playerState.levels[type];
    const levelsForType = characterLevels[type];
    currentCharset = {};

    for (let i = 0; i <= userLevel && i < levelsForType.length; i++) {
        Object.assign(currentCharset, levelsForType[i].set);
    }

    initializeProgress(currentCharset);
    updateHomeButton(true);

    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="card text-center shadow-sm flashcard-container">
            <div id="button-container" class="btn-group" style="position: absolute; top: 10px; right: 10px; z-index: 101;"></div>
            <div id="hint-display" class="card shadow-sm bg-info text-white" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 200; padding: 1rem;"></div>
            <div class="card-body">
                <div id="feedback-area" class="mb-2" style="height: 24px;"></div>
                <div class="flashcard" id="flashcard">
                    <div class="flashcard-inner">
                        <div class="flashcard-front d-flex align-items-center justify-content-center">
                            <h1 id="flashcard-char" class="display-1"></h1>
                        </div>
                        <div class="flashcard-back d-flex flex-column align-items-center justify-content-center">
                            <h2 id="flashcard-reading" class="mb-2"></h2>
                            <p id="flashcard-meaning" class="lead"></p>
                        </div>
                    </div>
                </div>
                <div class="d-grid gap-2 mt-3">
                    <button class="btn btn-primary" id="flip-button">Flip</button>
                    <div class="d-flex justify-content-around">
                        <button class="btn btn-danger flex-fill me-2" id="false-button">False</button>
                        <button class="btn btn-success flex-fill ms-2" id="true-button">True</button>
                    </div>
                </div>
            </div>
            <div id="help-card" class="card shadow-sm" style="display: none; position: absolute; top: 40px; right: 10px; width: 350px; z-index: 100; font-family: 'Noto Sans JP Embedded', sans-serif;"></div>
        </div>
    `;

    const helpCard = document.getElementById('help-card');
    const helpContent = getHelpContent(type);
    if (helpContent) {
        helpCard.innerHTML = `<div class="card-body">${helpContent}</div>`;
    }

    loadFlashcard(type);
}


function loadFlashcard(type) {
    const contentArea = document.getElementById('content-area');
    const charToDisplay = getNextCharacter();

    if (!charToDisplay) {
        contentArea.innerHTML = `
            <div class="card text-center shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">Congratulations!</h5>
                    <p class="card-text">You have reviewed all characters in this set.</p>
                    <button class="btn btn-secondary" id="back-to-home">Back to Home</button>
                </div>
            </div>`;
        document.getElementById('back-to-home').addEventListener('click', showHomePage);
        return;
    }

    currentFlashcardChar = charToDisplay;
    const flashcardChar = document.getElementById('flashcard-char');
    const flashcardReading = document.getElementById('flashcard-reading');
    const flashcardMeaning = document.getElementById('flashcard-meaning');
    const flashcard = document.getElementById('flashcard');

    flashcardChar.textContent = charToDisplay;

    flashcardChar.className = 'display-1';
    if (type === 'words') flashcardChar.className = 'quiz-word';
    if (type === 'sentences') flashcardChar.className = 'quiz-sentence';
    adjustFontSize(flashcardChar);

    flashcardReading.textContent = '';
    flashcardMeaning.textContent = '';

    const buttonContainer = document.getElementById('button-container');
    let buttonsHTML = '';
    const filename = getAudioFilename(charToDisplay, type);
    if (filename) {
        buttonsHTML += `<button id="play-flashcard-audio" class="btn btn-secondary"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button>`;
    }
    buttonsHTML += `<button id="hint-button" class="btn btn-secondary"><img src="/nihon/icons/answer.png" alt="Hint" style="height: 1.5rem;"></button>`;
    const helpContent = getHelpContent(type);
    if (helpContent) {
        buttonsHTML += `<button id="help-icon" class="btn btn-secondary"><img src="/nihon/icons/help.png" alt="Help" style="height: 1.5rem;"></button>`;
    }
    buttonContainer.innerHTML = buttonsHTML;

    flashcard.classList.remove('flipped');
    isCurrentCardCorrect = Math.random() < 0.5;

    let reading = '';
    let meaning = '';

    if (isCurrentCardCorrect) {
        if (type === 'numbers') {
            reading = currentCharset[currentFlashcardChar].romaji;
            meaning = currentCharset[currentFlashcardChar].latin;
        } else {
            reading = currentCharset[currentFlashcardChar];
            meaning = '';
        }
    } else {
        const allReadings = Object.values(currentCharset);
        const correctReading = (type === 'numbers') ? currentCharset[currentFlashcardChar].romaji : currentCharset[currentFlashcardChar];
        let incorrectReading;
        do {
            const randomIndex = Math.floor(Math.random() * allReadings.length);
            incorrectReading = (typeof allReadings[randomIndex] === 'object') ? allReadings[randomIndex].romaji : allReadings[randomIndex];
        } while (incorrectReading === correctReading);
        reading = incorrectReading;
        meaning = '';
    }

    flashcardReading.textContent = reading;
    flashcardMeaning.textContent = meaning;
}

function flipFlashcard() {
    document.getElementById('flashcard').classList.toggle('flipped');
}

function checkFlashcardAnswer(userAnswer, type) {
    const isCorrect = (userAnswer === isCurrentCardCorrect);
    markFlashcardProgress(currentFlashcardChar, isCorrect, type);
}

function markFlashcardProgress(char, isCorrect, type) {
    const feedbackArea = document.getElementById('feedback-area');
    if (isCorrect) {
        progress[char].correct++;
        feedbackArea.innerHTML = `<span class="text-success">Correct!</span>`;
        gainXP(10);
    } else {
        progress[char].incorrect++;
        feedbackArea.innerHTML = `<span class="text-danger">Incorrect.</span>`;
    }
    localStorage.setItem('nihon-progress', JSON.stringify(progress));
    setTimeout(() => {
        feedbackArea.innerHTML = ''; // Clear feedback after a short delay
        loadFlashcard(type);
    }, 1200);
}

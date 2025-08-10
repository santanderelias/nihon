function startListeningQuiz() {
    isSectionActive = true;
    currentQuizType = 'listening';

    const userLevel = playerState.levels.listening || 0;
    const levelsForType = characterLevels.listening;
    currentCharset = {};
    for (let i = 0; i <= userLevel && i < levelsForType.length; i++) {
        Object.assign(currentCharset, levelsForType[i].set);
    }

    initializeProgress(currentCharset);
    updateHomeButton(true);

    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="card text-center shadow-sm">
            <div class="card-body">
                <div id="feedback-area" class="mb-2" style="height: 24px;"></div>
                <button class="btn btn-primary mb-3" id="play-audio-button">
                    <i class="fas fa-volume-up"></i> Play Audio
                </button>
                <div class="mb-3">
                    <input type="text" class="form-control text-center" id="answer-input" onkeypress="if(event.key === 'Enter') document.getElementById('check-button').click()">
                </div>
                <button class="btn btn-success" id="check-button">Check</button>
            </div>
        </div>
    `;

    const answerInput = document.getElementById('answer-input');
    wanakana.bind(answerInput, { IMEMode: true });

    loadListeningQuestion();
}

function loadListeningQuestion() {
    const contentArea = document.getElementById('content-area');
    const charToTest = getNextCharacter();

    if (!charToTest) {
        contentArea.innerHTML = `
            <div class="card text-center shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">Congratulations!</h5>
                    <p class="card-text">You have mastered this set.</p>
                    <button class="btn btn-secondary" id="back-to-home">Back to Home</button>
                </div>
            </div>`;
        document.getElementById('back-to-home').addEventListener('click', showHomePage);
        return;
    }

    const correctAnswer = currentCharset[charToTest];

    document.getElementById('feedback-area').innerHTML = '';

    const answerInput = document.getElementById('answer-input');
    answerInput.value = '';
    answerInput.readOnly = false;

    const checkButton = document.getElementById('check-button');
    checkButton.disabled = false;

    const playAudioButton = document.getElementById('play-audio-button');

    answerInput.focus();
}

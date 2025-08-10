// --- SHARED STATE & CONFIG ---
export const state = {
    isSectionActive: false,
    currentQuizType: '',
    currentCharset: {},
    nextChar: null,
    deferredPrompt: null,
    newWorker: null,
    dictionaryReadyPromise: null,
    resolveDictionaryReady: null,
    isDictionaryReady: false,
    currentDictionaryStatusMessage: '',
};

export let progress = JSON.parse(localStorage.getItem('nihon-progress')) || {};
export let playerState = JSON.parse(localStorage.getItem('nihon-player-state')) || {
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    levels: { hiragana: 0, katakana: 0, kanji: 0, numbers: 0, words: 0, sentences: 0, listening: 0 },
    unlockedAchievements: []
};

// --- DICTIONARY WORKER ---
export const dictionaryWorker = new Worker('/nihon/js/dictionary_worker.js');
dictionaryWorker.onmessage = (event) => {
    const data = event.data;
    switch (data.action) {
        case 'completed':
            state.isDictionaryReady = true;
            if (state.resolveDictionaryReady) state.resolveDictionaryReady();
            document.getElementById('dictionary-search-container').style.display = 'block';
            document.getElementById('dictionary-loading-status').innerHTML = '';
            const exampleWordArea = document.getElementById('example-word-area');
            if (exampleWordArea && exampleWordArea.innerHTML.includes('spinner-grow')) {
                exampleWordArea.innerHTML = '';
            }
            break;
        case 'progress':
            state.currentDictionaryStatusMessage = data.message;
            document.querySelectorAll('.dictionary-loading-message').forEach(el => el.textContent = state.currentDictionaryStatusMessage);
            break;
        case 'error':
            state.currentDictionaryStatusMessage = `Error: ${data.message}`;
            break;
        case 'exampleWordResult':
            const example = data.result;
            const exampleArea = document.getElementById('example-word-area');
            if (exampleArea) {
                if (example) {
                    const firstMeaning = example.meaning.split('|')[0].trim();
                    exampleArea.innerHTML = `<p class="card-text mt-3" style="font-family: 'Noto Sans JP Embedded', sans-serif;"><strong>Example:</strong> ${example.word} (${example.reading}) - <em>${firstMeaning}</em></p>`;
                } else {
                    exampleArea.innerHTML = '';
                }
            }
            break;
        case 'searchResult':
            const results = data.result;
            const dictionaryResultArea = document.getElementById('dictionary-result-area');
            if (dictionaryResultArea) {
                if (results.length > 0) {
                    let html = '<div>';
                    results.forEach((entry) => {
                        const romaji = wanakana.toRomaji(entry.reading);
                        html += `<div class="card mb-2 shadow-sm"><div class="card-body"><h5 class="card-title" style="font-family: 'Noto Sans JP Embedded', sans-serif;">${entry.kanji} <span class="text-muted">(${entry.reading})</span></h5><h6 class="card-subtitle mb-2 text-muted">${romaji}</h6><p class="card-text" style="font-family: 'Noto Sans JP Embedded', sans-serif;">${entry.gloss}</p></div></div>`;
                    });
                    if (results.length >= 100) {
                        html += `<p class="text-center mt-2">More than 100 results found. Please refine your search.</p>`;
                    }
                    html += '</div>';
                    dictionaryResultArea.innerHTML = html;
                } else {
                    dictionaryResultArea.innerHTML = 'No results found.';
                }
            }
            if (window.resolveSearch) {
                window.resolveSearch();
                window.resolveSearch = null;
            }
            break;
    }
};

export function setupDictionaryPromise() {
    state.dictionaryReadyPromise = new Promise(resolve => {
        state.resolveDictionaryReady = resolve;
    });
}

export function loadDictionary() {
    dictionaryWorker.postMessage({ action: 'loadDictionary' });
    state.currentDictionaryStatusMessage = 'Loading dictionary...';
    return state.dictionaryReadyPromise;
}

// --- CONSTANTS ---
export const achievements = { /* ... achievements object ... */ };
export const characterLevels = { /* ... characterLevels object ... */ };

// --- App Logic ---
export function patchPlayerState() { /* ... function body ... */ }
export function getXpForLevel(level) { return Math.floor(100 * Math.pow(1.2, level - 1)); }
export function gainXP(amount) { /* ... function body ... */ }
export function initializeProgress(characterSet) { /* ... function body ... */ }
export function getNextCharacter() { /* ... function body ... */ }
export function showHomePage() { /* ... function body ... */ }
export function getAudioFilename(char, type) { /* ... function body ... */ }
export function adjustFontSize(element) { /* ... function body ... */ }
export function getHelpContent(quizType) { /* ... function body ... */ }
export function showToast(title, message, showRestartButton = false) { /* ... function body ... */ }
export function updateHomeButton(isSection) { /* ... function body ... */ }
export function setDarkMode(isDark) { /* ... function body ... */ }
export function checkDevMode() { /* ... function body ... */ }

export function checkAnswer(char, correctAnswer, type, loadNextQuestionCallback) {
    const answerInput = document.getElementById('answer-input');
    let userAnswer = wanakana.toRomaji(answerInput.value.trim());
    const feedbackArea = document.getElementById('feedback-area');
    const now = Date.now();
    let p = progress[char];
    let isCorrect = (userAnswer.toLowerCase() === correctAnswer.toLowerCase());

    if (isCorrect) {
        p.correct++;
        p.streak = (p.streak || 0) + 1;
        p.lastAnswer = 'correct';
        p.nextReview = now + Math.pow(2, p.streak) * 60 * 60 * 1000;
        feedbackArea.innerHTML = `<span class="text-success">Correct!</span>`;
        gainXP(10);
    } else {
        p.incorrect++;
        p.streak = 0;
        p.lastAnswer = 'incorrect';
        p.nextReview = now;
        feedbackArea.innerHTML = `<span class="text-danger">Incorrect. It's "${correctAnswer}".</span>`;
    }
    localStorage.setItem('nihon-progress', JSON.stringify(progress));
    document.getElementById('check-button').disabled = true;
    setTimeout(() => {
        // This needs to call a function in quiz.js, which is not ideal
        // We'll handle this in the next step by passing a callback or using custom events
        // For now, let's assume a function `loadNextQuestion` exists globally, which we will fix.
        window.loadNextQuestion();
    }, 1200);
}

export function populateStatsModal() { /* ... function body ... */ }
export function populateReferencesModal() { /* ... function body ... */ }
export function playReferenceAudio(filename) { /* ... function body ... */ }
export function backupProgress() { /* ... function body ... */ }
export function restoreProgress(file) { /* ... function body ... */ }
export function searchDictionary(word) { /* ... function body ... */ }

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
        // ... (full onmessage logic)
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
export const characterLevels = { /* Full characterLevels object */ };
export const achievements = { /* Full achievements object */ };

// --- App Logic ---
export function patchPlayerState() {
    let updated = false;
    const defaultLevels = { hiragana: 0, katakana: 0, kanji: 0, numbers: 0, words: 0, sentences: 0, listening: 0 };
    for (const key in defaultLevels) {
        if (playerState.levels[key] === undefined) {
            playerState.levels[key] = defaultLevels[key];
            updated = true;
        }
    }
    if (!playerState.unlockedAchievements) {
        playerState.unlockedAchievements = [];
        updated = true;
    }
    if (updated) {
        localStorage.setItem('nihon-player-state', JSON.stringify(playerState));
    }
}

export function getXpForLevel(level) { return Math.floor(100 * Math.pow(1.2, level - 1)); }

export function gainXP(amount) {
    playerState.xp += amount;
    while (playerState.xp >= playerState.xpToNextLevel) {
        playerState.level++;
        playerState.xp -= playerState.xpToNextLevel;
        playerState.xpToNextLevel = getXpForLevel(playerState.level);
        showToast("Player Level Up!", `You've reached level ${playerState.level}!`);
    }
    localStorage.setItem('nihon-player-state', JSON.stringify(playerState));
}

export function initializeProgress(characterSet) {
    let updated = false;
    for (const char in characterSet) {
        if (!progress[char]) {
            progress[char] = { correct: 0, incorrect: 0, streak: 0, nextReview: 0, seen: false, lastAnswer: null };
            updated = true;
        }
    }
    if (updated) {
        localStorage.setItem('nihon-progress', JSON.stringify(progress));
    }
}

export function getNextCharacter() {
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

export function getAudioFilename(char, type) {
    if (!state.currentCharset || !state.currentCharset[char]) return null;
    let romajiString;
    switch (type) {
        case 'listening': romajiString = char; break;
        case 'numbers': romajiString = state.currentCharset[char].romaji; break;
        default: romajiString = state.currentCharset[char]; break;
    }
    if (typeof romajiString !== 'string') return null;
    let filename = romajiString.toLowerCase().replace(/ /g, '_').replace(/\.\.\./g, 'desu').replace(/[?!]/g, '');
    if (type === 'hiragana') filename = `h_${filename}`;
    else if (type === 'katakana') filename = `k_${filename}`;
    else if (type === 'kanji') filename = `kanji_${filename}`;
    else if (type === 'numbers') filename = `num_${filename}`;
    else if (type === 'words') filename = `word_${filename}`;
    else if (type === 'sentences') filename = `sentence_${filename}`;
    return filename;
}

export function adjustFontSize(element) {
    if (!element) return;
    const container = element.parentElement;
    let fontSize = parseFloat(window.getComputedStyle(element, null).getPropertyValue('font-size'));
    element.style.fontSize = '';
    fontSize = parseFloat(window.getComputedStyle(element, null).getPropertyValue('font-size'));
    while (element.scrollWidth > container.clientWidth && fontSize > 10) {
        fontSize -= 1;
        element.style.fontSize = `${fontSize}px`;
    }
}

export function getHelpContent(quizType) {
    // ...
}

export function showToast(title, message, showRestartButton = false) {
    // ...
}

export function updateHomeButton(isSection) {
    // ...
}

export function setDarkMode(isDark) {
    // ...
}

export function checkDevMode() {
    // ...
}

export function checkAnswer(char, correctAnswer, type, loadNextQuestionCallback) {
    // ...
}

export function populateStatsModal() {
    // ...
}
export function populateReferencesModal() {
    // ...
}
export function playReferenceAudio(filename) {
    // ...
}
export function backupProgress() {
    // ...
}
export function restoreProgress(file) {
    // ...
}
export function searchDictionary(word) {
    // ...
}

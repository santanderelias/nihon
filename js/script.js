import { startQuiz } from './quiz.js';
import { startFlashcardMode } from './flashcards.js';
// import { startListeningQuiz } from './listening.js'; // Assuming listening.js will also be a module

// --- SHARED STATE & CONFIG ---
export const state = {
    isSectionActive: false,
    currentQuizType: '',
    currentCharset: {},
    nextChar: null,
    deferredPrompt: null,
    newWorker: null,
    // Dictionary state
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
    levels: {
        hiragana: 0,
        katakana: 0,
        kanji: 0,
        numbers: 0,
        words: 0,
        sentences: 0,
        listening: 0
    },
    unlockedAchievements: []
};

// --- DICTIONARY WORKER ---
export const dictionaryWorker = new Worker('/nihon/js/dictionary_worker.js');
dictionaryWorker.onmessage = (event) => {
    const data = event.data;

    switch (data.action) {
        case 'completed':
            state.isDictionaryReady = true;
            if (state.resolveDictionaryReady) {
                state.resolveDictionaryReady();
            }
            const dictionarySearchContainer = document.getElementById('dictionary-search-container');
            if (dictionarySearchContainer) dictionarySearchContainer.style.display = 'block';
            const dictionaryLoadingStatus = document.getElementById('dictionary-loading-status');
            if (dictionaryLoadingStatus) dictionaryLoadingStatus.innerHTML = '';
            const exampleWordArea = document.getElementById('example-word-area');
            if (exampleWordArea && exampleWordArea.innerHTML.includes('spinner-grow')) {
                exampleWordArea.innerHTML = '';
            }
            break;

        case 'progress':
            state.currentDictionaryStatusMessage = data.message;
            const loadingElements = document.querySelectorAll('.dictionary-loading-message');
            loadingElements.forEach(el => el.textContent = state.currentDictionaryStatusMessage);
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
                    exampleArea.innerHTML = `
                        <p class="card-text mt-3" style="font-family: 'Noto Sans JP Embedded', sans-serif;">
                            <strong>Example:</strong> ${example.word} (${example.reading}) - <em>${firstMeaning}</em>
                        </p>
                    `;
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
                        html += `
                            <div class="card mb-2 shadow-sm">
                                <div class="card-body">
                                    <h5 class="card-title" style="font-family: 'Noto Sans JP Embedded', sans-serif;">
                                        ${entry.kanji} <span class="text-muted">(${entry.reading})</span>
                                    </h5>
                                    <h6 class="card-subtitle mb-2 text-muted">${romaji}</h6>
                                    <p class="card-text" style="font-family: 'Noto Sans JP Embedded', sans-serif;">${entry.gloss}</p>
                                </div>
                            </div>
                        `;
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

function setupDictionaryPromise() {
    state.dictionaryReadyPromise = new Promise(resolve => {
        state.resolveDictionaryReady = resolve;
    });
}

function loadDictionary() {
    dictionaryWorker.postMessage({ action: 'loadDictionary' });
    state.currentDictionaryStatusMessage = 'Loading dictionary...';
    return state.dictionaryReadyPromise;
}

// --- CONSTANTS ---
export const achievements = {
    // ... (achievements object remains the same)
};

export const characterLevels = {
    // ... (characterLevels object remains the same)
};


// --- App Logic ---
export function patchPlayerState() {
    let updated = false;
    const defaultLevels = {
        hiragana: 0,
        katakana: 0,
        kanji: 0,
        numbers: 0,
        words: 0,
        sentences: 0,
        listening: 0
    };

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

export function getXpForLevel(level) {
    return Math.floor(100 * Math.pow(1.2, level - 1));
}

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

export function showHomePage() {
    const contentArea = document.getElementById('content-area');
    updateHomeButton(false);

    const suggestionsContainer = document.getElementById('kanji-suggestions-card');
    if (suggestionsContainer) {
        suggestionsContainer.remove();
    }

    const sections = [
        { id: 'hiragana', title: 'Hiragana', description: 'The basic Japanese syllabary.' },
        { id: 'katakana', title: 'Katakana', description: 'Used for foreign words and emphasis.' },
        { id: 'kanji', title: 'Kanji', description: 'Logographic Chinese characters.' },
        { id: 'numbers', title: 'Numbers', description: 'Learn to count in Japanese.' },
        { id: 'listening', title: 'Listening', description: 'Train your ears to Japanese sounds.' },
        { id: 'words', title: 'Words', description: 'Practice with common vocabulary.' },
        { id: 'sentences', title: 'Sentences', description: 'Learn basic sentence structures.' }
    ];

    let cardsHTML = '';
    sections.forEach(section => {
        const capitalizedTitle = section.title.charAt(0).toUpperCase() + section.title.slice(1);
        cardsHTML += `
            <div class="col">
                <div class="card shadow-sm h-100">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${section.title}</h5>
                        <p class="card-text">${section.description}</p>
                        <div class="mt-auto btn-group">
                            <button type="button" class="btn btn-sm btn-outline-secondary" id="quiz${capitalizedTitle}">Quiz</button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" id="flashcard${capitalizedTitle}">Cards</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    contentArea.innerHTML = `
        <h2 class="pb-2 border-bottom">Learning Sections</h2>
        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3">
            ${cardsHTML}
        </div>
    `;
    setupHomePageListeners();
}

export function setupHomePageListeners() {
    document.getElementById('quizHiragana').addEventListener('click', () => startQuiz('hiragana'));
    document.getElementById('quizKatakana').addEventListener('click', () => startQuiz('katakana'));
    document.getElementById('quizKanji').addEventListener('click', () => startQuiz('kanji'));
    document.getElementById('quizNumbers').addEventListener('click', () => startQuiz('numbers'));
    // document.getElementById('quizListening').addEventListener('click', () => startListeningQuiz());
    document.getElementById('quizWords').addEventListener('click', () => startQuiz('words'));
    document.getElementById('quizSentences').addEventListener('click', () => startQuiz('sentences'));

    document.getElementById('flashcardHiragana').addEventListener('click', () => startFlashcardMode('hiragana'));
    document.getElementById('flashcardKatakana').addEventListener('click', () => startFlashcardMode('katakana'));
    document.getElementById('flashcardKanji').addEventListener('click', () => startFlashcardMode('kanji'));
    document.getElementById('flashcardNumbers').addEventListener('click', () => startFlashcardMode('numbers'));
    document.getElementById('flashcardListening').addEventListener('click', () => startFlashcardMode('listening'));
    document.getElementById('flashcardWords').addEventListener('click', () => startFlashcardMode('words'));
    document.getElementById('flashcardSentences').addEventListener('click', () => startFlashcardMode('sentences'));
}

export function getAudioFilename(char, type) {
    if (!state.currentCharset || !state.currentCharset[char]) return null;

    let romajiString;
    switch (type) {
        case 'listening':
            romajiString = char;
            break;
        case 'numbers':
            romajiString = state.currentCharset[char].romaji;
            break;
        default:
            romajiString = state.currentCharset[char];
            break;
    }

    if (typeof romajiString !== 'string') return null;

    let filename = romajiString.toLowerCase()
        .replace(/ /g, '_')
        .replace(/\.\.\./g, 'desu')
        .replace(/[?!]/g, '');

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
    // ... (getHelpContent remains the same)
}

export function showToast(title, message, showRestartButton = false) {
    const toastLiveExample = document.getElementById('liveToast');
    const toastTitle = document.getElementById('toast-title');
    const toastBody = document.getElementById('toast-body');

    if (!toastLiveExample || !toastTitle || !toastBody) return;

    toastTitle.textContent = title;
    toastBody.innerHTML = message;

    if (showRestartButton) {
        const restartButton = document.createElement('button');
        restartButton.className = 'btn btn-primary btn-sm mt-2';
        restartButton.textContent = 'Restart';
        restartButton.onclick = () => {
            if (state.newWorker) {
                state.newWorker.postMessage({ action: 'skipWaiting' });
            }
            window.location.reload();
        };
        toastBody.appendChild(document.createElement('br'));
        toastBody.appendChild(restartButton);
    }

    const toast = new bootstrap.Toast(toastLiveExample, { autohide: !showRestartButton, delay: 5000 });
    toast.show();
}

export function updateHomeButton(isSection) {
    const appTitle = document.getElementById('home-button');
    const installButton = document.getElementById('install-button');
    state.isSectionActive = isSection;

    if (isSection) {
        appTitle.innerHTML = '<img src="/nihon/icons/back.png" alt="Back" style="height: 1.5rem; vertical-align: middle;"> Back';
        appTitle.classList.add('back-button');
    } else {
        appTitle.textContent = 'Nihon';
        appTitle.classList.remove('back-button');
    }

    if (installButton) {
        installButton.style.display = state.deferredPrompt && !state.isSectionActive ? 'flex' : 'none';
    }
}

// --- UI AND EVENT LISTENERS (DOM-dependent) ---
document.addEventListener('DOMContentLoaded', () => {
    patchPlayerState();
    checkDevMode();
    showHomePage();
    setupDictionaryPromise();
    loadDictionary();

    // Service Worker and PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/nihon/sw.js')
                .then(reg => {
                    reg.onupdatefound = () => {
                        state.newWorker = reg.installing;
                        state.newWorker.onstatechange = () => {
                            if (state.newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                showToast('Update Available', 'A new version is available.', true);
                            }
                        };
                    };
                })
                .catch(err => console.error('Service Worker registration failed:', err));
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        state.deferredPrompt = e;
        updateHomeButton(state.isSectionActive);
    });

    // Dark Mode
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    if (themeToggleIcon) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('darkMode');
        setDarkMode(savedTheme !== null ? savedTheme === 'true' : prefersDark);
        themeToggleIcon.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
            setDarkMode(!isDark);
        });
    }

    // PWA Install Button
    const installButton = document.getElementById('install-button');
    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (!state.deferredPrompt) return;
            installButton.style.display = 'none';
            state.deferredPrompt.prompt();
            const { outcome } = await state.deferredPrompt.userChoice;
            showToast('Installation', outcome === 'accepted' ? 'App installed successfully!' : 'App installation cancelled.');
            state.deferredPrompt = null;
        });
    }

    // Home Button
    const homeButton = document.getElementById('home-button');
    if (homeButton) {
        homeButton.addEventListener('click', (event) => {
            event.preventDefault();
            if (state.isSectionActive) {
                showHomePage();
            }
        });
    }

    // ... (rest of the event listeners: Stats, Dev Tools, Dictionary, References, etc.)
});

function setDarkMode(isDark) {
    const htmlElement = document.documentElement;
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    htmlElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('darkMode', isDark);
    if (themeToggleIcon) {
        themeToggleIcon.src = isDark ? '/nihon/icons/theme_dark.png' : '/nihon/icons/theme_light.png';
        themeToggleIcon.alt = isDark ? 'Dark Theme Icon' : 'Light Theme Icon';
    }
}

function checkDevMode() {
    const devToolsButton = document.getElementById('dev-tools-button');
    if (localStorage.getItem('nihon-dev-mode') === 'true') {
        if (devToolsButton) devToolsButton.style.display = 'block';
    } else {
        if (devToolsButton) devToolsButton.style.display = 'none';
    }
}

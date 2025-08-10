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
export const characterLevels = {
    hiragana: [
        { name: "Vowels (a, i, u, e, o)", set: { 'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o' } },
        { name: "K-Group (ka, ki, ku, ke, ko)", set: { 'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko' } },
        { name: "S-Group (sa, shi, su, se, so)", set: { 'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so' } },
        { name: "T-Group (ta, chi, tsu, te, to)", set: { 'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to' } },
        { name: "N-Group (na, ni, nu, ne, no)", set: { 'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no' } },
        { name: "H-Group (ha, hi, fu, he, ho)", set: { 'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho' } },
        { name: "M-Group (ma, mi, mu, me, mo)", set: { 'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo' } },
        { name: "Y-Group (ya, yu, yo)", set: { 'や': 'ya', 'ゆ': 'yu', 'よ': 'yo' } },
        { name: "R-Group (ra, ri, ru, re, ro)", set: { 'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro' } },
        { name: "W-Group & N (wa, wo, n)", set: { 'わ': 'wa', 'を': 'wo', 'ん': 'n' } },
        { name: "G, Z, D-Group (Dakuten)", set: { 'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go', 'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo', 'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do' } },
        { name: "B, P-Group (Dakuten/Handakuten)", set: { 'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo', 'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po' } }
    ],
    katakana: [
        { name: "Vowels (a, i, u, e, o)", set: { 'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o' } },
        { name: "K-Group (ka, ki, ku, ke, ko)", set: { 'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko' } },
        { name: "S-Group (sa, shi, su, se, so)", set: { 'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so' } },
        { name: "T-Group (ta, chi, tsu, te, to)", set: { 'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to' } },
        { name: "N-Group (na, ni, nu, ne, no)", set: { 'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no' } },
        { name: "H-Group (ha, hi, fu, he, ho)", set: { 'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho' } },
        { name: "M-Group (ma, mi, mu, me, mo)", set: { 'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo' } },
        { name: "Y-Group (ya, yu, yo)", set: { 'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo' } },
        { name: "R-Group (ra, ri, ru, re, ro)", set: { 'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro' } },
        { name: "W-Group & N (wa, wo, n)", set: { 'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n' } },
        { name: "G, Z, D-Group (Dakuten)", set: { 'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go', 'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo', 'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do' } },
        { name: "B, P-Group (Dakuten/Handakuten)", set: { 'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo', 'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po' } }
    ],
    kanji: [
        { name: "Kanji Nature", set: { '金': 'kin', '土': 'do', '曜': 'you', '上': 'ue', '下': 'shita', '中': 'naka', '半': 'han', '山': 'yama', '川': 'kawa', '元': 'gen' } },
        { name: "Kanji People & Body", set: { '気': 'ki', '天': 'ten', '私': 'watashi', '今': 'ima', '田': 'ta', '女': 'onna', '男': 'otoko', '見': 'mi', '行': 'i', '食': 'ta', '飲': 'no' } },
    ],
    numbers: [
        { name: "Numbers 1-10", set: { '一': { latin: '1', romaji: 'ichi' }, '二': { latin: '2', romaji: 'ni' }, '三': { latin: '3', romaji: 'san' }, '四': { latin: '4', romaji: 'shi' }, '五': { latin: '5', romaji: 'go' }, '六': { latin: '6', romaji: 'roku' }, '七': { latin: '7', romaji: 'shichi' }, '八': { latin: '8', romaji: 'hachi' }, '九': { latin: '9', romaji: 'kyuu' }, '十': { latin: '10', romaji: 'juu' } } },
    ],
    listening: [
        { name: "Hiragana Vowels", set: { 'a': 'a', 'i': 'i', 'う': 'u', 'e': 'e', 'o': 'o' } },
    ],
    words: [
        { name: "People & Places", set: { '人': 'hito', '男': 'otoko', '女': 'onna', '家族': 'kazoku', '日本': 'nihon', '東京': 'tokyo', '店': 'mise' } },
    ],
    sentences: [
        { name: "Greetings", set: { 'おはようございます': 'ohayou gozaimasu', 'こんにちは': 'konnichiwa', 'こんばんは': 'konbanwa', 'さようなら': 'sayounara', 'おやすみなさい': 'oyasuminasai' } },
    ]
};
export const achievements = {
    'hiragana_apprentice': { name: 'Hiragana Apprentice', description: 'Answer all Hiragana vowels correctly 5 times.', requires: [], characters: () => characterLevels.hiragana[0].set },
};

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

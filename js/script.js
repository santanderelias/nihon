// --- Service Worker and PWA ---
const isWanakanaEnabled = () => true; // Always true as switch is removed

// --- Dark Mode ---
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const htmlElement = document.documentElement;

const setDarkMode = (isDark) => {
    htmlElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('darkMode', isDark);
    if (themeToggleIcon) {
        themeToggleIcon.src = isDark ? '/nihon/icons/theme_dark.png' : '/nihon/icons/theme_light.png';
        themeToggleIcon.alt = isDark ? 'Dark Theme Icon' : 'Light Theme Icon';
    }
};

if (themeToggleIcon) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('darkMode');

    const initialTheme = savedTheme !== null ? savedTheme === 'true' : prefersDark;
    setDarkMode(initialTheme); // Set initial state

    themeToggleIcon.addEventListener('click', () => {
        const isDark = htmlElement.getAttribute('data-bs-theme') === 'dark';
        setDarkMode(!isDark);
    });
}


// --- PWA Install Button ---
let deferredPrompt;
const installButton = document.getElementById('install-button');

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt fired', e);
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI notify the user they can install the PWA
    if (installButton) {
        installButton.style.display = 'block';
        console.log('Install button displayed. deferredPrompt set.');
    } else {
        console.log('Install button element not found.');
    }
});

if (installButton) {
    console.log('Install button element found.');
    installButton.addEventListener('click', async () => {
        console.log('Install button clicked. Prompting...');
        // Hide the app install button
        installButton.style.display = 'none';
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        // Optionally, send analytics event with outcome of user choice
        console.log(`User response to the install prompt: ${outcome}`);
        if (outcome === 'accepted') {
            showToast('Installation', 'App installed successfully!');
        } else {
            showToast('Installation', 'App installation cancelled.');
        }
        // We've used the prompt, and can't use it again, clear it.
        deferredPrompt = null;
    });
}


// --- App Logic ---
let dictionaryReadyPromise;
let resolveDictionaryReady;
let isDictionaryReady = false;
let currentDictionaryStatusMessage = '';

const dictionaryWorker = new Worker('/nihon/js/dictionary_worker.js');

// Centralized message handler for the dictionary worker
dictionaryWorker.onmessage = (event) => {
    const data = event.data;
    console.log('[SCRIPT.JS] Received message from DSW:', data.action);

    switch (data.action) {
        case 'completed':
            console.log('[SCRIPT.JS] DSW has completed loading the dictionary.');
            isDictionaryReady = true;
            //currentDictionaryStatusMessage = 'Dictionary loaded.';
            if (resolveDictionaryReady) {
                resolveDictionaryReady();
            }
            // Show search container and hide loading status in the modal
            const dictionarySearchContainer = document.getElementById('dictionary-search-container');
            if (dictionarySearchContainer) {
                dictionarySearchContainer.style.display = 'block';
            }
            const dictionaryLoadingStatus = document.getElementById('dictionary-loading-status');
            if (dictionaryLoadingStatus) {
                dictionaryLoadingStatus.innerHTML = '';
            }
            const exampleWordArea = document.getElementById('example-word-area');
            if (exampleWordArea && exampleWordArea.innerHTML.includes('spinner-grow')) {
                exampleWordArea.innerHTML = '';
            }
            break;

        case 'progress':
            currentDictionaryStatusMessage = data.message;
            console.log(`[SCRIPT.JS] DSW progress: ${data.message}`);
            // Update UI in dictionary modal and hints section
            const loadingElements = document.querySelectorAll('.dictionary-loading-message');
            loadingElements.forEach(el => el.textContent = currentDictionaryStatusMessage);
            break;

        case 'error':
            console.error('[SCRIPT.JS] DSW error:', data.message);
            currentDictionaryStatusMessage = `Error: ${data.message}`;
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
                    exampleArea.innerHTML = ''; // Clear if no example is found
                }
            }
            break;

        case 'searchResult':
            const results = data.result;
            const dictionaryResultArea = document.getElementById('dictionary-result-area');
            if (dictionaryResultArea) {
                if (results.length > 0) {
                    let html = '<div class="accordion" id="dictionary-accordion">';
                    results.forEach((entry, i) => {
                        const entryId = `entry-${i}`;
                        const romaji = wanakana.toRomaji(entry.reading);
                        html += `
                            <div class="accordion-item">
                                <h2 class="accordion-header" id="heading-${entryId}">
                                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${entryId}" aria-expanded="false" aria-controls="collapse-${entryId}">
                                        <div class="w-100">
                                            <strong style="font-family: 'Noto Sans JP Embedded', sans-serif;">${entry.kanji} (${entry.reading})</strong>
                                            <br>
                                            <small class="text-muted">${romaji}</small>
                                            <div class="text-truncate">${entry.gloss}</div>
                                        </div>
                                    </button>
                                </h2>
                                <div id="collapse-${entryId}" class="accordion-collapse collapse" aria-labelledby="heading-${entryId}" data-bs-parent="#dictionary-accordion">
                                    <div class="accordion-body">
                                        <p style="font-family: 'Noto Sans JP Embedded', sans-serif;">${entry.gloss}</p>
                                    </div>
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
    dictionaryReadyPromise = new Promise(resolve => {
        resolveDictionaryReady = resolve;
    });
}

var db;

async function loadDictionary() {
    dictionaryWorker.postMessage({ action: 'loadDictionary' });
    currentDictionaryStatusMessage = 'Loading dictionary...';
    return dictionaryReadyPromise;
}


const contentArea = document.getElementById('content-area');
const homeButton = document.getElementById('home-button');

const characterSets = {
    hiragana: {
        'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
        'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
        'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
        'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
        'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
        'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
        'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
        'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
        'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
        'わ': 'wa', 'を': 'wo',
        'ん': 'n'
    },
    dakuten: {
        'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
        'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
        'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
        'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo'
    },
    handakuten: {
        'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po'
    },
    katakana: {
        'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
        'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
        'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
        'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
        'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
        'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
        'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
        'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
        'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
        'ワ': 'wa', 'ヲ': 'wo',
        'ン': 'n'
    },
    kanji: {
        '一': 'ichi', '二': 'ni', '三': 'san', '四': 'shi', '五': 'go', '六': 'roku', '七': 'shichi', '八': 'hachi', '九': 'kyu', '十': 'juu',
        '人': 'hito', '日': 'hi', '月': 'tsuki', '火': 'hi', '水': 'mizu', '木': 'ki', '金': 'kin', '土': 'tsuchi', '年': 'toshi', '時': 'toki',
        '分': 'fun', '今': 'ima', '前': 'mae', '後': 'ato', '上': 'ue', '下': 'shita', '左': 'hidari', '右': 'migi', '中': 'naka', '外': 'soto',
        '大': 'dai', '小': 'shou', '高': 'taka', '安': 'yasu', '新': 'atara', '古': 'furu', '長': 'naga', '多': 'oo', '少': 'suku', '早': 'haya',
        '学': 'gaku', '校': 'kou', '生': 'sei', '先': 'sen', '何': 'nani', '私': 'watashi', '友': 'tomo', '達': 'dachi', '本': 'hon', '語': 'go',
        '話': 'hana', '見': 'mi', '聞': 'ki', '読': 'yo', '書': 'ka', '食': 'ta', '飲': 'no', '買': 'ka', '行': 'i', '来': 'ku', '出': 'de', '入': 'hai',
        '会': 'a', '休': 'yasu', '言': 'i', '思': 'omo', '持': 'mo', '待': 'ma', '作': 'tsuku', '使': 'tsuka', '知': 'shi', '死': 'shi', '住': 'su',
        '売': 'u', '立': 'ta', '歩': 'aru', '走': 'hashi', '乗': 'no', '降': 'o', '着': 'ki', '渡': 'wata', '通': 'kayo', '帰': 'kae', '働': 'hatara'
    },
    numbers: {
        '一': { latin: '1', romaji: 'ichi' }, '二': { latin: '2', romaji: 'ni' }, '三': { latin: '3', romaji: 'san' }, '四': { latin: '4', romaji: 'shi' }, '五': { latin: '5', romaji: 'go' },
        '六': { latin: '6', romaji: 'roku' }, '七': { latin: '7', romaji: 'shichi' }, '八': { latin: '8', romaji: 'hachi' }, '九': { latin: '9', romaji: 'kyuu' }, '十': { latin: '10', romaji: 'juu' },
        '十一': { latin: '11', romaji: 'juuichi' }, '十二': { latin: '12', romaji: 'juuni' }, '十三': { latin: '13', romaji: 'juusan' }, '十四': { latin: '14', romaji: 'juushi' }, '十五': { latin: '15', romaji: 'juugo' },
        '十六': { latin: '16', romaji: 'juuroku' }, '十七': { latin: '17', romaji: 'juushichi' }, '十八': { latin: '18', romaji: 'juuhachi' }, '十九': { latin: '19', romaji: 'juukyuu' }, '二十': { latin: '20', romaji: 'nijuu' },
        '二十一': { latin: '21', romaji: 'nijuuichi' }, '二十二': { latin: '22', romaji: 'nijuuni' }, '二十三': { latin: '23', romaji: 'nijuusan' }, '二十四': { latin: '24', romaji: 'nijuushi' }, '二十五': { latin: '25', romaji: 'nijuugo' },
        '二十六': { latin: '26', romaji: 'nijuuroku' }, '二十七': { latin: '27', romaji: 'nijuushichi' }, '二十八': { latin: '28', romaji: 'nijuuhachi' }, '二十九': { latin: '29', romaji: 'nijuukyuu' }, '三十': { latin: '30', romaji: 'sanjuu' },
        '三十一': { latin: '31', romaji: 'sanjuuichi' }, '三十二': { latin: '32', romaji: 'sanjuuni' }, '三十三': { latin: '33', romaji: 'sanjuusan' }, '三十四': { latin: '34', romaji: 'sanjuushi' }, '三十五': { latin: '35', romaji: 'sanjuugo' },
        '三十六': { latin: '36', romaji: 'sanjuuroku' }, '三十七': { latin: '37', romaji: 'sanjuushichi' }, '三十八': { latin: '38', romaji: 'sanjuuhachi' }, '三十九': { latin: '39', romaji: 'sanjuukyuu' }, '四十': { latin: '40', romaji: 'yonjuu' },
        '四十一': { latin: '41', romaji: 'yonjuuichi' }, '四十二': { latin: '42', romaji: 'yonjuuni' }, '四十三': { latin: '43', romaji: 'yonjuusan' }, '四十四': { latin: '44', romaji: 'yonjuushi' }, '四十五': { latin: '45', romaji: 'yonjuugo' },
        '四十六': { latin: '46', romaji: 'yonjuuroku' }, '四十七': { latin: '47', romaji: 'yonjuushichi' }, '四十八': { latin: '48', romaji: 'yonjuuhachi' }, '四十九': { latin: '49', romaji: 'yonjuukyuu' }, '五十': { latin: '50', romaji: 'gojuu' },
        '五十一': { latin: '51', romaji: 'gojuuichi' }, '五十二': { latin: '52', romaji: 'gojuuni' }, '五十三': { latin: '53', romaji: 'gojuusan' }, '五十四': { latin: '54', romaji: 'gojuushi' }, '五十五': { latin: '55', romaji: 'gojuugo' },
        '五十六': { latin: '56', romaji: 'gojuuroku' }, '五十七': { latin: '57', romaji: 'gojuushichi' }, '五十八': { latin: '58', romaji: 'gojuuhachi' }, '五十九': { latin: '59', romaji: 'gojuukyuu' }, '六十': { latin: '60', romaji: 'rokujuu' },
        '六十一': { latin: '61', romaji: 'rokujuuichi' }, '六十二': { latin: '62', romaji: 'rokujuuni' }, '六十三': { latin: '63', romaji: 'rokujuusan' }, '六十四': { latin: '64', romaji: 'rokujuushi' }, '六十五': { latin: '65', romaji: 'rokujuugo' },
        '六十六': { latin: '66', romaji: 'rokujuuroku' }, '六十七': { latin: '67', romaji: 'rokujuushichi' }, '六十八': { latin: '68', romaji: 'rokujuuhachi' }, '六十九': { latin: '69', romaji: 'rokujuukyuu' }, '七十': { latin: '70', romaji: 'nanajuu' },
        '七十一': { latin: '71', romaji: 'nanajuuichi' }, '七十二': { latin: '72', romaji: 'nanajuuni' }, '七十三': { latin: '73', romaji: 'nanajuusan' }, '七十四': { latin: '74', romaji: 'nanajuushi' }, '七十五': { latin: '75', romaji: 'nanajuugo' },
        '七十六': { latin: '76', romaji: 'nanajuuroku' }, '七十七': { latin: '77', romaji: 'nanajuushichi' }, '七十八': { latin: '78', romaji: 'nanajuuhachi' }, '七十九': { latin: '79', romaji: 'nanajuukyuu' }, '八十': { latin: '80', romaji: 'hachijuu' },
        '八十一': { latin: '81', romaji: 'hachijuuichi' }, '八十二': { latin: '82', romaji: 'hachijuuni' }, '八十三': { latin: '83', romaji: 'hachijuusan' }, '八十四': { latin: '84', romaji: 'hachijuushi' }, '八十五': { latin: '85', romaji: 'hachijuugo' },
        '八十六': { latin: '86', romaji: 'hachijuuroku' }, '八十七': { latin: '87', romaji: 'hachijuushichi' }, '八十八': { latin: '88', romaji: 'hachijuuhachi' }, '八十九': { latin: '89', romaji: 'hachijuukyuu' }, '九十': { latin: '90', romaji: 'kyuujuu' },
        '九十一': { latin: '91', romaji: 'kyuujuuichi' }, '九十二': { latin: '92', romaji: 'kyuujuuni' }, '九十三': { latin: '93', romaji: 'kyuujuusan' }, '九十四': { latin: '94', romaji: 'kyuujuushi' }, '九十五': { latin: '95', romaji: 'kyuujuugo' },
        '九十六': { latin: '96', romaji: 'kyuujuuroku' }, '九十七': { latin: '97', romaji: 'kyuujuushichi' }, '九十八': { latin: '98', romaji: 'kyuujuuhachi' }, '九十九': { latin: '99', romaji: 'kyuujuukyuu' }, '百': { latin: '100', romaji: 'hyaku' }
    }
};

let progress = JSON.parse(localStorage.getItem('nihon-progress')) || {};
let currentCharset = {};

function initializeProgress(characterSet) {
    let updated = false;
    for (const char in characterSet) {
        if (!progress[char]) {
            progress[char] = { correct: 0, incorrect: 0 };
            updated = true;
        }
    }
    if (updated) {
        localStorage.setItem('nihon-progress', JSON.stringify(progress));
    }
}

function getNextCharacter() {
    let now = new Date().getTime();
    let items = Object.keys(currentCharset);
    let weightedList = [];

    for (const item of items) {
        let p = progress[item];
        if (!p.nextReview) p.nextReview = now;

        if (p.nextReview <= now) {
            const weight = Math.max(1, 1 + (p.incorrect * 5) - p.correct);
            for (let i = 0; i < weight; i++) {
                weightedList.push(item);
            }
        }
    }

    if (weightedList.length === 0) {
        // If no items are due for review, find the one with the soonest review time
        let soonestItem = null;
        let soonestTime = Infinity;
        for (const item of items) {
            let p = progress[item];
            if (p.nextReview < soonestTime) {
                soonestTime = p.nextReview;
                soonestItem = item;
            }
        }
        return soonestItem;
    }

    const randomIndex = Math.floor(Math.random() * weightedList.length);
    return weightedList[randomIndex];
}

function showHomePage() {
    updateHomeButton(false); // No section is active
    contentArea.innerHTML = `
        <div class="row">
            <div class="col-md-6 mb-3">
                <div class="card shadow-sm h-100">
                    <div class="card-body">
                        <h5 class="card-title">Quizzes</h5>
                        <p class="card-text">Test your knowledge with quizzes.</p>
                        <div class="d-grid gap-2">
                            <button class="btn btn-secondary" id="quizHiragana">Hiragana</button>
                            <button class="btn btn-secondary" id="quizHiraganaSpecial">Hiragana Special</button>
                            <button class="btn btn-secondary" id="quizKatakana">Katakana</button>
                            <button class="btn btn-secondary" id="quizKanji">Kanji</button>
                            <button class="btn btn-secondary" id="quizNumbers">Numbers</button>
                            <button class="btn btn-secondary" id="quizListening">Listening</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-3">
                <div class="card shadow-sm h-100">
                    <div class="card-body">
                        <h5 class="card-title">Flashcards</h5>
                        <p class="card-text">Practice with flashcards.</p>
                        <div class="d-grid gap-2">
                            <button class="btn btn-secondary" id="flashcardHiragana">Cards Hiragana</button>
                            <button class="btn btn-secondary" id="flashcardHiraganaSpecial">Cards Hiragana Special</button>
                            <button class="btn btn-secondary" id="flashcardKatakana">Cards Katakana</button>
                            <button class="btn btn-secondary" id="flashcardKanji">Cards Kanji</button>
                            <button class="btn btn-secondary" id="flashcardNumbers">Cards Numbers</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    setupHomePageListeners();
}


function startQuiz(type) {
    isSectionActive = true;
    if (type === 'hiraganaSpecial') {
        currentCharset = { ...characterSets.hiragana, ...characterSets.dakuten, ...characterSets.handakuten };
    } else {
        currentCharset = characterSets[type];
    }
    initializeProgress(currentCharset);
    updateHomeButton(true); // A section is now active

    contentArea.innerHTML = `
        <div class="card text-center shadow-sm">
            <div class="card-body">
                <div id="feedback-area" class="mb-2" style="height: 24px;"></div>
                <h1 id="char-display" class="display-1"></h1>
                <div id="example-word-area" class="mt-3"></div>
                <div class="mb-3">
                    <input type="text" class="form-control text-center" id="answer-input" onkeypress="if(event.key === 'Enter') document.getElementById('check-button').click()">
                </div>
                <button class="btn btn-success" id="check-button">Check</button>
                <button class="btn btn-secondary" id="skip-button">Skip</button>
            </div>
        </div>
    `;
    
    

    const answerInput = document.getElementById('answer-input');
    if (isWanakanaEnabled()) {
        console.log('[SCRIPT.JS] Wanakana is enabled. Attempting to bind to input.');
        console.log('[SCRIPT.JS] wanakana object:', typeof wanakana, wanakana);
        if (type === 'katakana') {
            wanakana.bind(answerInput, { to: 'katakana' });
        } else {
            wanakana.bind(answerInput, { to: 'hiragana' });
        }
    }

    loadQuestion(type);
}





function startFlashcardMode(type) {
    isSectionActive = true;
    if (type === 'hiraganaSpecial') {
        currentCharset = { ...characterSets.hiragana, ...characterSets.dakuten, ...characterSets.handakuten };
    } else {
        currentCharset = characterSets[type];
    }
    initializeProgress(currentCharset);
    updateHomeButton(true); // A section is now active

    contentArea.innerHTML = `
        <div class="card text-center shadow-sm flashcard-container">
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
        </div>
    `;

    updateHomeButton(true);
    currentFlashcardType = type;
    loadFlashcard(type);
}

let currentFlashcardChar = '';
let currentFlashcardType = '';
let isCurrentCardCorrect = true;

function loadFlashcard(type) {
    const charToDisplay = getNextCharacter();

    if (!charToDisplay) {
        contentArea.innerHTML = `
            <div class="card text-center shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">Congratulations!</h5>
                    <p class="card-text">You have reviewed all characters in this set.</p>
                    <button class="btn btn-secondary" onclick="showHomePage()">Back to Home</button>
                </div>
            </div>`;
        return;
    }

    currentFlashcardChar = charToDisplay;
    const flashcardChar = document.getElementById('flashcard-char');
    const flashcardReading = document.getElementById('flashcard-reading');
    const flashcardMeaning = document.getElementById('flashcard-meaning');
    const flashcard = document.getElementById('flashcard');

    flashcardChar.textContent = charToDisplay;
    flashcardReading.textContent = '';
    flashcardMeaning.textContent = '';

    // Reset flip state
    flashcard.classList.remove('flipped');

    // Decide if the card should be correct or incorrect
    isCurrentCardCorrect = Math.random() < 0.5;

    // Set up event listeners
    document.getElementById('flip-button').onclick = () => flipFlashcard();
    document.getElementById('flashcard').onclick = () => flipFlashcard();
    document.getElementById('true-button').onclick = () => checkFlashcardAnswer(true, type);
    document.getElementById('false-button').onclick = () => checkFlashcardAnswer(false, type);

    let reading = '';
    let meaning = '';

    if (isCurrentCardCorrect) {
        if (type === 'numbers') {
            reading = currentCharset[currentFlashcardChar].romaji;
            meaning = currentCharset[currentFlashcardChar].latin;
        } else {
            reading = currentCharset[currentFlashcardChar];
            meaning = ''; // For hiragana/katakana/kanji, meaning is the reading
        }
    } else {
        // Get a random incorrect reading
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





function startListeningQuiz() {
    isSectionActive = true;
    currentCharset = { ...characterSets.hiragana, ...characterSets.dakuten, ...characterSets.handakuten, ...characterSets.katakana, ...characterSets.kanji, ...characterSets.numbers };
    initializeProgress(currentCharset);
    updateHomeButton(true);

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
                <button class="btn btn-secondary" id="skip-button">Skip</button>
            </div>
        </div>
    `;

    const answerInput = document.getElementById('answer-input');
    if (isWanakanaEnabled()) {
        wanakana.bind(answerInput, { to: 'hiragana' });
    }

    loadListeningQuestion();
}

function loadListeningQuestion() {
    const charToTest = getNextCharacter();

    if (!charToTest) {
        contentArea.innerHTML = `
            <div class="card text-center shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">Congratulations!</h5>
                    <p class="card-text">You have mastered this set.</p>
                    <button class="btn btn-secondary" onclick="showHomePage()">Back to Home</button>
                </div>
            </div>`;
        return;
    }

    const correctAnswer = currentCharset[charToTest].romaji || currentCharset[charToTest];

    document.getElementById('feedback-area').innerHTML = '';

    const answerInput = document.getElementById('answer-input');
    answerInput.value = '';
    answerInput.readOnly = false;

    const checkButton = document.getElementById('check-button');
    checkButton.disabled = false;
    checkButton.onclick = () => checkAnswer(charToTest, correctAnswer, 'listening');

    const skipButton = document.getElementById('skip-button');
    skipButton.onclick = () => loadListeningQuestion();

    const playAudioButton = document.getElementById('play-audio-button');
    playAudioButton.onclick = () => {
        const utterance = new SpeechSynthesisUtterance(charToTest);
        utterance.lang = 'ja-JP';
        speechSynthesis.speak(utterance);
    };

    answerInput.focus();
}

function setupHomePageListeners() {
    document.getElementById('quizHiragana').addEventListener('click', () => startQuiz('hiragana'));
    document.getElementById('quizHiraganaSpecial').addEventListener('click', () => startQuiz('hiraganaSpecial'));
    document.getElementById('quizKatakana').addEventListener('click', () => startQuiz('katakana'));
    document.getElementById('quizKanji').addEventListener('click', () => startQuiz('kanji'));
    document.getElementById('quizNumbers').addEventListener('click', () => startQuiz('numbers'));
    document.getElementById('quizListening').addEventListener('click', () => startListeningQuiz());

    document.getElementById('flashcardHiragana').addEventListener('click', () => startFlashcardMode('hiragana'));
    document.getElementById('flashcardHiraganaSpecial').addEventListener('click', () => startFlashcardMode('hiraganaSpecial'));
    document.getElementById('flashcardKatakana').addEventListener('click', () => startFlashcardMode('katakana'));
    document.getElementById('flashcardKanji').addEventListener('click', () => startFlashcardMode('kanji'));
    document.getElementById('flashcardNumbers').addEventListener('click', () => startFlashcardMode('numbers'));
}

async function loadQuestion(type) {
    const charToTest = getNextCharacter();

    if (!charToTest) {
        contentArea.innerHTML = `
            <div class="card text-center shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">Congratulations!</h5>
                    <p class="card-text">You have mastered this set.</p>
                    <button class="btn btn-secondary" onclick="showHomePage()">Back to Home</button>
                </div>
            </div>`;
        return;
    }

    const correctAnswer = (type === 'numbers') ? currentCharset[charToTest].romaji : currentCharset[charToTest];
    
    document.getElementById('char-display').textContent = charToTest;
    document.getElementById('feedback-area').innerHTML = '';
    
    const answerInput = document.getElementById('answer-input');
    answerInput.value = '';
    answerInput.readOnly = false;
    
    const checkButton = document.getElementById('check-button');
    checkButton.disabled = false;
    checkButton.onclick = () => checkAnswer(charToTest, correctAnswer, type);

    const skipButton = document.getElementById('skip-button');
    skipButton.onclick = () => loadQuestion(type);

    answerInput.focus();

    // Fetch and display an example word
    const exampleWordArea = document.getElementById('example-word-area');
    if (exampleWordArea) {
        if (!isDictionaryReady) {
            exampleWordArea.innerHTML = `
                <div class="d-flex justify-content-center align-items-center mt-3">
                    <div class="spinner-grow text-secondary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="dictionary-loading-message">${currentDictionaryStatusMessage || 'Dictionary loading...'}</span>
                </div>`;
        } else {
            await dictionaryReadyPromise;
            dictionaryWorker.postMessage({ action: 'getExampleWord', character: charToTest });
        }
    }
}

function checkAnswer(char, correctAnswer, type) {
    const answerInput = document.getElementById('answer-input');
    let userAnswer = answerInput.value.trim();
    const feedbackArea = document.getElementById('feedback-area');
    let now = new Date().getTime();
    let p = progress[char];

    // Convert user input to Romaji if Wanakana is enabled
    if (isWanakanaEnabled()) {
        userAnswer = wanakana.toRomaji(userAnswer);
    }

    if (userAnswer === correctAnswer) {
        if (!p) {
            p = { correct: 0, incorrect: 0, streak: 0, nextReview: now };
            progress[char] = p;
        }
        p.correct++;
        p.streak = (p.streak || 0) + 1;
        p.nextReview = now + Math.pow(2, p.streak) * 60 * 60 * 1000; // Exponential backoff
        feedbackArea.innerHTML = `<span class="text-success">Correct!</span>`;
    } else {
        if (!p) {
            p = { correct: 0, incorrect: 0, streak: 0, nextReview: now };
            progress[char] = p;
        }
        p.incorrect++;
        p.streak = 0;
        p.nextReview = now + 60 * 60 * 1000; // Review in 1 hour
        feedbackArea.innerHTML = `<span class="text-danger">Incorrect. It's "${correctAnswer}".</span>`;
    }
    
    localStorage.setItem('nihon-progress', JSON.stringify(progress));

    document.getElementById('check-button').disabled = true;

    if (type === 'listening') {
        setTimeout(() => loadListeningQuestion(), 1200);
    } else {
        setTimeout(() => loadQuestion(type), 1200);
    }
}

async function main() {
    showHomePage();
    updateHomeButton(false);

    setupDictionaryPromise();

    loadDictionary();
}


document.addEventListener('DOMContentLoaded', main);


// --- Toast Notification Helper ---
function showToast(title, message, showRestartButton = false) {
    const toastLiveExample = document.getElementById('liveToast');
    const toastTitle = document.getElementById('toast-title');
    const toastBody = document.getElementById('toast-body');
    const toastContainer = document.querySelector('.toast-container');

    if (toastLiveExample && toastTitle && toastBody) {
        toastTitle.textContent = title;
        toastBody.innerHTML = message;

        if (showRestartButton) {
            const restartButton = document.createElement('button');
            restartButton.className = 'btn btn-primary btn-sm mt-2';
            restartButton.textContent = 'Restart';
            restartButton.onclick = () => {
                if (newWorker) {
                    newWorker.postMessage({ action: 'skipWaiting' });
                }
                window.location.reload();
            };
            toastBody.appendChild(document.createElement('br'));
            toastBody.appendChild(restartButton);
        }

        const toast = new bootstrap.Toast(toastLiveExample, { autohide: !showRestartButton, delay: 5000 });
        toast.show();
    }
}

// --- Stats Modal Logic ---
const statsModal = document.getElementById('stats-modal');
const wrongCharsTableBody = document.getElementById('wrong-chars-table-body');
const correctCharsTableBody = document.getElementById('correct-chars-table-body');

if (statsModal) {
    statsModal.addEventListener('show.bs.modal', () => {
        wrongCharsTableBody.innerHTML = ''; // Clear previous content
        correctCharsTableBody.innerHTML = ''; // Clear previous content

        const wrongItems = [];
        const correctItems = [];

        for (const item in progress) {
            if (progress[item].incorrect > 0) {
                let reading = '';
                for (const setKey in characterSets) {
                    if (characterSets[setKey][item]) {
                        if (setKey === 'numbers') {
                            reading = characterSets[setKey][item].romaji;
                        } else {
                            reading = characterSets[setKey][item];
                        }
                        break;
                    }
                }
                wrongItems.push({ item: item, reading: reading, count: progress[item].incorrect });
            }
            if (progress[item].correct > 0) {
                let reading = '';
                for (const setKey in characterSets) {
                    if (characterSets[setKey][item]) {
                        if (setKey === 'numbers') {
                            reading = characterSets[setKey][item].romaji;
                        } else {
                            reading = characterSets[setKey][item];
                        }
                        break;
                    }
                }
                correctItems.push({ item: item, reading: reading, count: progress[item].correct });
            }
        }

        // Sort by incorrect count in descending order
        wrongItems.sort((a, b) => b.count - a.count);
        // Sort by correct count in descending order
        correctItems.sort((a, b) => b.count - a.count);

        if (wrongItems.length === 0) {
            wrongCharsTableBody.innerHTML = '<tr><td colspan="3">No items answered incorrectly yet!</td></tr>';
        } else {
            wrongItems.forEach(item => {
                const row = wrongCharsTableBody.insertRow();
                const itemCell = row.insertCell();
                const readingCell = row.insertCell();
                const countCell = row.insertCell();
                itemCell.textContent = item.item;
                readingCell.textContent = item.reading;
                countCell.textContent = item.count;
                itemCell.style.fontFamily = "'Noto Sans JP Embedded', sans-serif";
                readingCell.style.fontFamily = "'Noto Sans JP Embedded', sans-serif";
            });
        }

        if (correctItems.length === 0) {
            correctCharsTableBody.innerHTML = '<tr><td colspan="3">No items answered correctly yet!</td></tr>';
        } else {
            correctItems.forEach(item => {
                const row = correctCharsTableBody.insertRow();
                const itemCell = row.insertCell();
                const readingCell = row.insertCell();
                const countCell = row.insertCell();
                itemCell.textContent = item.item;
                readingCell.textContent = item.reading;
                countCell.textContent = item.count;
                itemCell.style.fontFamily = "'Noto Sans JP Embedded', sans-serif";
                readingCell.style.fontFamily = "'Noto Sans JP Embedded', sans-serif";
            });
        }
    });
}


// --- Dictionary Modal Logic ---
const dictionaryModal = document.getElementById('dictionary-modal');
const dictionarySearchInput = document.getElementById('dictionary-search-input');
const dictionarySearchButton = document.getElementById('dictionary-search-button');
const dictionaryResultArea = document.getElementById('dictionary-result-area');
const dictionaryLoadingStatus = document.getElementById('dictionary-loading-status');

if (dictionaryModal) {
    dictionaryModal.addEventListener('show.bs.modal', () => {
        if (!isDictionaryReady) {
            dictionaryLoadingStatus.innerHTML = `
                <div class="d-flex justify-content-center align-items-center mt-3">
                    <div class="spinner-grow text-secondary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="dictionary-loading-message">${currentDictionaryStatusMessage || 'Dictionary loading...'}</span>
                </div>`;
        } else {
            dictionaryLoadingStatus.innerHTML = '';
        }
        dictionaryResultArea.innerHTML = ''; // Clear previous search results
    });
}

// --- Grammar Modal Logic ---
const grammarModal = document.getElementById('grammar-modal');

if (grammarModal) {
    grammarModal.addEventListener('show.bs.modal', () => {
        const grammarBody = grammarModal.querySelector('.modal-body');
        grammarBody.innerHTML = `
            <div class="accordion" id="grammarAccordion">
                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingOne">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="false" aria-controls="collapseOne">
                            Basic Sentence Structure
                        </button>
                    </h2>
                    <div id="collapseOne" class="accordion-collapse collapse" aria-labelledby="headingOne" data-bs-parent="#grammarAccordion">
                        <div class="accordion-body" style="font-family: 'Noto Sans JP Embedded', sans-serif;">
                            <p>The basic sentence structure in Japanese is Subject-Object-Verb (SOV).</p>
                            <p>Example: 私はリンゴを食べます (Watashi wa ringo o tabemasu) - I eat an apple.</p>
                            <ul>
                                <li>私 (Watashi) - I (Subject)</li>
                                <li>リンゴ (ringo) - apple (Object)</li>
                                <li>を食べます (o tabemasu) - eat (Verb)</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingTwo">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                            Particles
                        </button>
                    </h2>
                    <div id="collapseTwo" class="accordion-collapse collapse" aria-labelledby="headingTwo" data-bs-parent="#grammarAccordion">
                        <div class="accordion-body" style="font-family: 'Noto Sans JP Embedded', sans-serif;">
                            <p>Particles are used to mark the grammatical function of a word.</p>
                            <ul>
                                <li>は (wa) - topic marker</li>
                                <li>が (ga) - subject marker</li>
                                <li>を (o) - object marker</li>
                                <li>に (ni) - place/time marker</li>
                                <li>へ (e) - direction marker</li>
                                <li>で (de) - place of action marker</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingThree">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
                            Verb Conjugation (Present Tense)
                        </button>
                    </h2>
                    <div id="collapseThree" class="accordion-collapse collapse" aria-labelledby="headingThree" data-bs-parent="#grammarAccordion">
                        <div class="accordion-body" style="font-family: 'Noto Sans JP Embedded', sans-serif;">
                            <p>Verbs are conjugated based on their group and politeness level.</p>
                            <p><strong>Group 1 (u-verbs):</strong></p>
                            <ul>
                                <li>Nomu (飲む - to drink) -> Nomimasu (飲みます - polite)</li>
                                <li>Kaku (書く - to write) -> Kakimasu (書きます - polite)</li>
                            </ul>
                            <p><strong>Group 2 (ru-verbs):</strong></p>
                            <ul>
                                <li>Taberu (食べる - to eat) -> Tabemasu (食べます - polite)</li>
                                <li>Miru (見る - to see) -> Mimasu (見ます - polite)</li>
                            </ul>
                            <p><strong>Group 3 (irregular verbs):</strong></p>
                            <ul>
                                <li>Suru (する - to do) -> Shimasu (します - polite)</li>
                                <li>Kuru (来る - to come) -> Kimasu (来ます - polite)</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingFour">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFour" aria-expanded="false" aria-controls="collapseFour">
                            Common Phrases
                        </button>
                    </h2>
                    <div id="collapseFour" class="accordion-collapse collapse" aria-labelledby="headingFour" data-bs-parent="#grammarAccordion">
                        <div class="accordion-body" style="font-family: 'Noto Sans JP Embedded', sans-serif;">
                            <div class="accordion" id="phrasesAccordion">
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="phrasesHeadingOne">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#phrasesCollapseOne" aria-expanded="false" aria-controls="phrasesCollapseOne">
                                            Greetings
                                        </button>
                                    </h2>
                                    <div id="phrasesCollapseOne" class="accordion-collapse collapse" aria-labelledby="phrasesHeadingOne" data-bs-parent="#phrasesAccordion">
                                        <div class="accordion-body">
                                            <ul>
                                                <li>おはようございます (Ohayou gozaimasu) - Good morning</li>
                                                <li>こんにちは (Konnichiwa) - Hello/Good afternoon</li>
                                                <li>こんばんは (Konbanwa) - Good evening</li>
                                                <li>さようなら (Sayounara) - Goodbye</li>
                                                <li>おやすみなさい (Oyasuminasai) - Good night</li>
                                                <li>はじめまして (Hajimemashite) - Nice to meet you</li>
                                                <li>どうぞよろしく (Douzo yoroshiku) - Pleased to make your acquaintance</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="phrasesHeadingTwo">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#phrasesCollapseTwo" aria-expanded="false" aria-controls="phrasesCollapseTwo">
                                            Time-related Expressions
                                        </button>
                                    </h2>
                                    <div id="phrasesCollapseTwo" class="accordion-collapse collapse" aria-labelledby="phrasesHeadingTwo" data-bs-parent="#phrasesAccordion">
                                        <div class="accordion-body">
                                            <ul>
                                                <li>今何時ですか (Ima nanji desu ka?) - What time is it now?</li>
                                                <li>今日は何日ですか (Kyou wa nannichi desu ka?) - What is the date today?</li>
                                                <li>明日は何曜日ですか (Ashita wa nanyoubi desu ka?) - What day of the week is it tomorrow?</li>
                                                <li>きのう (Kinou) - Yesterday</li>
                                                <li>あした (Ashita) - Tomorrow</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="phrasesHeadingThree">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#phrasesCollapseThree" aria-expanded="false" aria-controls="phrasesCollapseThree">
                                            General
                                        </button>
                                    </h2>
                                    <div id="phrasesCollapseThree" class="accordion-collapse collapse" aria-labelledby="phrasesHeadingThree" data-bs-parent="#phrasesAccordion">
                                        <div class="accordion-body">
                                            <ul>
                                                <li>はい (Hai) - Yes</li>
                                                <li>いいえ (Iie) - No</li>
                                                <li>お願いします (Onegaishimasu) - Please</li>
                                                <li>ありがとうございます (Arigatou gozaimasu) - Thank you</li>
                                                <li>すみません (Sumimasen) - Excuse me/I'm sorry</li>
                                                <li>ごめんなさい (Gomennasai) - I'm sorry</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="phrasesHeadingFour">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#phrasesCollapseFour" aria-expanded="false" aria-controls="phrasesCollapseFour">
                                            Food/Restaurant
                                        </button>
                                    </h2>
                                    <div id="phrasesCollapseFour" class="accordion-collapse collapse" aria-labelledby="phrasesHeadingFour" data-bs-parent="#phrasesAccordion">
                                        <div class="accordion-body">
                                            <ul>
                                                <li>メニューをください (Menyuu o kudasai) - Please give me the menu.</li>
                                                <li>これをください (Kore o kudasai) - I'll have this one, please.</li>
                                                <li>お勘定をお願いします (Okanjou o onegaishimasu) - Check, please.</li>
                                                <li>いただきます (Itadakimasu) - Said before eating.</li>
                                                <li>ごちそうさまでした (Gochisousama deshita) - Said after eating.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="phrasesHeadingFive">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#phrasesCollapseFive" aria-expanded="false" aria-controls="phrasesCollapseFive">
                                            Shopping
                                        </button>
                                    </h2>
                                    <div id="phrasesCollapseFive" class="accordion-collapse collapse" aria-labelledby="phrasesHeadingFive" data-bs-parent="#phrasesAccordion">
                                        <div class="accordion-body">
                                            <ul>
                                                <li>これはいくらですか (Kore wa ikura desu ka?) - How much is this?</li>
                                                <li>これをください (Kore o kudasai) - I'll take this, please.</li>
                                                <li>クレジットカードは使えますか (Kurejitto kaado wa tsukaemasu ka?) - Can I use a credit card?</li>
                                                <li>袋をください (Fukuro o kudasai) - Can I have a bag, please?</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="phrasesHeadingSix">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#phrasesCollapseSix" aria-expanded="false" aria-controls="phrasesCollapseSix">
                                            Directions
                                        </button>
                                    </h2>
                                    <div id="phrasesCollapseSix" class="accordion-collapse collapse" aria-labelledby="phrasesHeadingSix" data-bs-parent="#phrasesAccordion">
                                        <div class="accordion-body">
                                            <ul>
                                                <li>駅はどこですか (Eki wa doko desu ka?) - Where is the station?</li>
                                                <li>まっすぐ行ってください (Massugu itte kudasai) - Please go straight.</li>
                                                <li>右に曲がってください (Migi ni magatte kudasai) - Please turn right.</li>
                                                <li>左に曲がってください (Hidari ni magatte kudasai) - Please turn left.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="phrasesHeadingSeven">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#phrasesCollapseSeven" aria-expanded="false" aria-controls="phrasesCollapseSeven">
                                            Weather
                                        </button>
                                    </h2>
                                    <div id="phrasesCollapseSeven" class="accordion-collapse collapse" aria-labelledby="phrasesHeadingSeven" data-bs-parent="#phrasesAccordion">
                                        <div class="accordion-body">
                                            <ul>
                                                <li>今日の天気はどうですか (Kyou no tenki wa dou desu ka?) - How is the weather today?</li>
                                                <li>晴れです (Hare desu) - It's sunny.</li>
                                                <li>曇りです (Kumori desu) - It's cloudy.</li>
                                                <li>雨です (Ame desu) - It's raining.</li>
                                                <li>雪です (Yuki desu) - It's snowing.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="phrasesHeadingEight">
                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#phrasesCollapseEight" aria-expanded="false" aria-controls="phrasesCollapseEight">
                                            Health/Emergencies
                                        </button>
                                    </h2>
                                    <div id="phrasesCollapseEight" class="accordion-collapse collapse" aria-labelledby="phrasesHeadingEight" data-bs-parent="#phrasesAccordion">
                                        <div class="accordion-body">
                                            <ul>
                                                <li>助けて (Tasukete) - Help!</li>
                                                <li>救急車を呼んでください (Kyuukyuusha o yonde kudasai) - Please call an ambulance.</li>
                                                <li>病院はどこですか (Byouin wa doko desu ka?) - Where is the hospital?</li>
                                                <li>気分が悪いです (Kibun ga warui desu) - I feel sick.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

// --- References Modal Logic ---
const referencesModal = document.getElementById('references-modal');

if (referencesModal) {
    referencesModal.addEventListener('show.bs.modal', () => {
        populateReferencesModal();
    });
}

function populateReferencesModal() {
    const hiraganaTabPane = document.getElementById('hiragana');
    const dakutenTabPane = document.getElementById('dakuten');
    const handakutenTabPane = document.getElementById('handakuten');
    const katakanaTabPane = document.getElementById('katakana');
    const kanjiTabPane = document.getElementById('kanji');
    const numbersTabPane = document.getElementById('numbers');

    hiraganaTabPane.innerHTML = generateCharacterCards(characterSets.hiragana);
    dakutenTabPane.innerHTML = generateCharacterCards(characterSets.dakuten);
    handakutenTabPane.innerHTML = generateCharacterCards(characterSets.handakuten);
    katakanaTabPane.innerHTML = generateCharacterCards(characterSets.katakana);
    kanjiTabPane.innerHTML = generateCharacterCards(characterSets.kanji);
    numbersTabPane.innerHTML = generateCharacterCards(characterSets.numbers);
}

function generateCharacterCards(characterSet) {
    let html = '<div class="row row-cols-3 row-cols-md-4 row-cols-lg-5 g-2">';
    for (const char in characterSet) {
        let displayChar = char;
        let displayRomaji = characterSet[char];
        let latinNumber = '';

        // Special handling for numbers
        if (characterSet === characterSets.numbers) {
            // 'char' is the Japanese character
            // characterSet[char] is now an object { latin: '...', romaji: '...' }
            displayChar = char; // Japanese character
            latinNumber = characterSet[char].latin; // Latin number
            displayRomaji = characterSet[char].romaji; // Romaji
        }

        html += `
            <div class="col">
                <div class="card text-center h-100">
                    <div class="card-body d-flex flex-column justify-content-center align-items-center">
                        <h3 class="card-title" style="font-family: 'Noto Sans JP Embedded', sans-serif;">${displayChar}</h3>
                        <p class="card-text">${displayRomaji}${latinNumber ? ` (${latinNumber})` : ''}</p>
                    </div>
                </div>
            </div>
        `;
    }
    html += '</div>';
    return html;
}

async function searchDictionary(word) {
    const dictionaryLoadingStatus = document.getElementById('dictionary-loading-status');
    if (!isDictionaryReady) {
        dictionaryResultArea.innerHTML = `
            <div class="d-flex justify-content-center align-items-center mt-3">
                <div class="spinner-grow text-secondary me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span class="dictionary-loading-message">Waiting for dictionary...</span>
            </div>`;
        return;
    }

    dictionaryResultArea.innerHTML = `
        <div class="d-flex justify-content-center align-items-center mt-3">
            <div class="spinner-grow text-secondary me-2" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <span>Searching Dictionary...</span>
        </div>`;

    dictionaryWorker.postMessage({ action: 'searchDictionary', word: word });

    return new Promise((resolve) => {
        window.resolveSearch = resolve;
    });
}

if (dictionarySearchButton && dictionarySearchInput) {
    dictionarySearchButton.addEventListener('click', () => {
        const searchTerm = dictionarySearchInput.value.trim();
        if (searchTerm) {
            searchDictionary(searchTerm);
        }
    });

    dictionarySearchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            dictionarySearchButton.click();
        }
    });
}

// --- Back to Home Logic ---
let isSectionActive = false; // Flag to track if a section is active

function updateHomeButton(isSection) {
    const appTitle = document.getElementById('home-button');
    if (isSection) {
        appTitle.innerHTML = '<img src="/nihon/icons/back.png" alt="Back" style="height: 1.5rem; vertical-align: middle;"> Back';
        appTitle.classList.add('back-button');
        appTitle.style.fontSize = ''; // Reset font size as image handles size
        isSectionActive = true;
        appTitle.addEventListener('click', (event) => { showHomePage() });
    } else {
        appTitle.textContent = 'Nihon';
        appTitle.classList.remove('back-button');
        appTitle.style.fontSize = '';
        isSectionActive = false;
    }
}


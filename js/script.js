// --- Service Worker and PWA ---
const devModeSwitch = document.getElementById('dev-mode-switch');

const isDevMode = () => localStorage.getItem('devMode') === 'true';
const isWanakanaEnabled = () => localStorage.getItem('wanakanaEnabled') === 'true';

if (devModeSwitch) {
    devModeSwitch.checked = isDevMode();
    devModeSwitch.addEventListener('change', () => {
        localStorage.setItem('devMode', devModeSwitch.checked);
        alert('Developer mode setting changed. Please reload the page for it to take effect.');
        location.reload();
    });
}

const wanakanaSwitch = document.getElementById('wanakana-switch');
if (wanakanaSwitch) {
    wanakanaSwitch.checked = isWanakanaEnabled();
    wanakanaSwitch.addEventListener('change', () => {
        localStorage.setItem('wanakanaEnabled', wanakanaSwitch.checked);
    });
}

if ('serviceWorker' in navigator && !isDevMode()) {
    let newWorker;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/nihon/sw.js', {scope: '/nihon/'})
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);

                // Request version from service worker
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ action: 'get-version' });
                }

                registration.addEventListener('updatefound', () => {
                    newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showToast('Update Available', 'A new version is available.', true);
                        }
                    });
                });
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });

    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.version) {
            const versionSpan = document.querySelector('#settings-modal .modal-footer .text-muted');
            if (versionSpan) {
                versionSpan.textContent = `Version: ${event.data.version}`;
            }
        } else if (event.data.action === 'show-toast') {
            showToast(event.data.title, event.data.message);
        }
    });

    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
    });
}

// --- Dark Mode ---
const darkModeSwitch = document.getElementById('dark-mode-switch');
const htmlElement = document.documentElement;

const setDarkMode = (isDark) => {
    htmlElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('darkMode', isDark);
};

if (darkModeSwitch) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('darkMode');

    const initialTheme = savedTheme !== null ? savedTheme === 'true' : prefersDark;
    darkModeSwitch.checked = initialTheme;
    setDarkMode(initialTheme);

    darkModeSwitch.addEventListener('change', () => {
        setDarkMode(darkModeSwitch.checked);
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





// --- Clear Data Button ---
const clearDataButton = document.getElementById('clear-data-button');

if (clearDataButton) {
    clearDataButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all your progress data? This cannot be undone.')) {
            localStorage.removeItem('nihon-progress');
            progress = {}; // Reset in-memory progress
            showToast('Data Cleared', 'All progress data has been cleared.');
            showHomePage(); // Go back to home page after clearing data
            // Optionally, close the modal
            const settingsModal = bootstrap.Modal.getInstance(document.getElementById('settings-modal'));
            if (settingsModal) {
                settingsModal.hide();
            }
        }
    });
}

// --- Reset App Completely Button ---
const resetAppButton = document.getElementById('reset-app-button');

if (resetAppButton) {
    resetAppButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to completely reset the app? This will delete all data, caches, and service workers.')) {
            // Unregister all service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                    console.log('Service Worker unregistered:', registration.scope);
                }
            }

            // Clear all caches
            const cacheNames = await caches.keys();
            for (let cacheName of cacheNames) {
                await caches.delete(cacheName);
                console.log('Cache deleted:', cacheName);
            }

            // Clear all localStorage data
            localStorage.clear();
            console.log('All localStorage data cleared.');

            // Clear IndexedDB
            const dbRequest = indexedDB.deleteDatabase('nihonDictionary');
            dbRequest.onsuccess = () => console.log('IndexedDB deleted.');
            dbRequest.onerror = (event) => console.error('Error deleting IndexedDB:', event.target.error);


            showToast('App Reset', 'App has been completely reset. Please refresh the page.');
            location.reload();
        }
    });
}

// --- Uninstall App Button ---
const uninstallAppButton = document.getElementById('uninstall-app-button');

if (uninstallAppButton) {
    uninstallAppButton.addEventListener('click', () => {
        showToast('Uninstall App', 'To uninstall the app, please go to your browser\'s settings (e.g., Chrome: Settings > Apps > Manage apps > Nihon) or your device\'s app management settings and uninstall it from there.');
    });
} else {
    console.log('Install button element not found at script load.');
}

// --- Check for Updates Button ---
const checkUpdatesButton = document.getElementById('check-updates-button');

if (checkUpdatesButton) {
    checkUpdatesButton.addEventListener('click', () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) {
                    reg.update().then(updated => {
                        if (updated) {
                            showToast('Update Found', 'A new version of the app is available. Please restart the app to update.');
                        } else {
                            showToast('No Updates', 'You are on the latest version of the app.');
                        }
                    });
                } else {
                    showToast('Error', 'Service worker not registered.');
                }
            });
        } else {
            showToast('Error', 'Service workers are not supported in this browser.');
        }
    });
}


// --- App Logic ---
let dictionaryLoadPromise = null; // This will now resolve when IndexedDB is ready

const DB_NAME = 'nihonDictionary';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

let db;

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'seq' });
                objectStore.createIndex('word', 'word', { unique: false });
                objectStore.createIndex('reading', 'reading', { unique: false });
                objectStore.createIndex('meaning', 'meaning', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };
    });
}

async function getDictFileCount() {
    let count = 0;
    let fileExists = true;
    while (fileExists) {
        const nextFileIndex = count + 1;
        try {
            const response = await fetch(`js/dict/dict-${nextFileIndex}.js`, { method: 'HEAD' });
            if (response.ok) {
                count++;
            } else {
                fileExists = false;
            }
        } catch (error) {
            // Expected 404 for the last file, or other network errors
            fileExists = false;
        }
    }
    return count;
}

async function loadDictionary() {
    try {
        db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const countRequest = objectStore.count();

        return new Promise(async (resolve, reject) => {
            countRequest.onsuccess = async () => {
                if (countRequest.result > 0) {
                    console.log('Dictionary already loaded in IndexedDB.');
                    resolve();
                    return;
                }

                console.log('Populating IndexedDB with dictionary data...');
                const totalLibraries = await getDictFileCount();
                console.log(`Found ${totalLibraries} dictionary files.`);
                if (totalLibraries === 0) {
                    console.log("No dictionary files found.");
                    showToast('Dictionary', 'No dictionary files found.');
                    resolve();
                    return;
                }

                const parser = new DOMParser();

                for (let i = 1; i <= totalLibraries; i++) {
                    const response = await fetch(`js/dict/dict-${i}.js`);
                    if (!response.ok) {
                        console.warn(`Failed to fetch dict-${i}.js. Status: ${response.status}. Skipping.`);
                        continue;
                    }
                    const scriptContent = await response.text();
                    
                    const DICT = eval(scriptContent.replace('const DICT =', ''));

                    if (typeof DICT !== 'undefined' && Array.isArray(DICT)) {
                        const addTransaction = db.transaction(STORE_NAME, 'readwrite');
                        const addObjectStore = addTransaction.objectStore(STORE_NAME);
                        DICT.forEach(entryStr => {
                            try {
                                const xmlDoc = parser.parseFromString(entryStr, "text/xml");
                                const entryElement = xmlDoc.getElementsByTagName('entry')[0];
                                if (!entryElement) return;

                                const seq = entryElement.getElementsByTagName('ent_seq')[0]?.textContent;
                                if (!seq) return;

                                const kebNode = entryElement.getElementsByTagName('keb')[0];
                                const rebNode = entryElement.getElementsByTagName('reb')[0];
                                
                                const word = kebNode?.textContent || rebNode?.textContent;
                                const reading = rebNode?.textContent;
                                
                                const senseNode = entryElement.getElementsByTagName('sense')[0];
                                const glossNode = senseNode?.getElementsByTagName('gloss')[0];
                                const meaning = glossNode?.textContent;

                                if (word && reading && meaning) {
                                    addObjectStore.add({ seq, word, reading, meaning });
                                }
                            } catch (e) {
                                console.error("Failed to parse dictionary entry:", e);
                            }
                        });
                        await new Promise(res => addTransaction.oncomplete = res); // Wait for transaction to complete
                    }
                }
                console.log('Dictionary loaded successfully into IndexedDB.');
                resolve();
            };

            countRequest.onerror = (event) => {
                console.error('IndexedDB count error:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        showToast('Dictionary', 'An error occurred while loading dictionary.');
        console.error('Failed to load dictionary:', error);
    }
}

dictionaryLoadPromise = loadDictionary();

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
        '1': 'ichi', '2': 'ni', '3': 'san', '4': 'yon', '5': 'go', '6': 'roku', '7': 'nana', '8': 'hachi', '9': 'kyuu', '10': 'juu',
        '11': 'juuichi', '12': 'juuni', '13': 'juusan', '14': 'juuyon', '15': 'juugo', '16': 'juuroku', '17': 'juunana', '18': 'juuhachi', '19': 'juukyuu', '20': 'nijuu',
        '21': 'nijuuichi', '22': 'nijuuni', '23': 'nijuusan', '24': 'nijuuyon', '25': 'nijuugo', '26': 'nijuuroku', '27': 'nijuunana', '28': 'nijuuhachi', '29': 'nijuukyuu', '30': 'sanjuu',
        '31': 'sanjuuichi', '32': 'sanjuuni', '33': 'sanjuusan', '34': 'sanjuuyon', '35': 'sanjuugo', '36': 'sanjuuroku', '37': 'sanjuunana', '38': 'sanjuuhachi', '39': 'sanjuukyuu', '40': 'yonjuu',
        '41': 'yonjuuichi', '42': 'yonjuuni', '43': 'yonjuusan', '44': 'yonjuuyon', '45': 'yonjuugo', '46': 'yonjuuroku', '47': 'yonjuunana', '48': 'yonjuuhachi', '49': 'yonjuukyuu', '50': 'gojuu',
        '51': 'gojuuichi', '52': 'gojuuni', '53': 'gojuusan', '54': 'gojuuyon', '55': 'gojuugo', '56': 'gojuuroku', '57': 'gojuunana', '58': 'gojuuhachi', '59': 'gojuukyuu', '60': 'rokujuu',
        '61': 'rokujuuichi', '62': 'rokujuuni', '63': 'rokujuusan', '64': 'rokujuuyon', '65': 'rokujuugo', '66': 'rokujuuroku', '67': 'rokujuunana', '68': 'rokujuuhachi', '69': 'rokujuukyuu', '70': 'nanajuu',
        '71': 'nanajuuichi', '72': 'nanajuuni', '73': 'nanajuusan', '74': 'nanajuuyon', '75': 'nanajuugo', '76': 'nanajuuroku', '77': 'nanajuunana', '78': 'nanajuuhachi', '79': 'nanajuukyuu', '80': 'hachijuu',
        '81': 'hachijuuichi', '82': 'hachijuuni', '83': 'hachijuusan', '84': 'hachijuuyon', '85': 'hachijuugo', '86': 'hachijuuroku', '87': 'hachijuunana', '88': 'hachijuuhachi', '89': 'hachijuukyuu', '90': 'kyuujuu',
        '91': 'kyuujuuichi', '92': 'kyuujuuni', '93': 'kyuujuusan', '94': 'kyuujuuyon', '95': 'kyuujuugo', '96': 'kyuujuuroku', '97': 'kyuujuunana', '98': 'kyuujuuhachi', '99': 'kyuujuukyuu', '100': 'hyaku'
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
    let weightedList = [];
    for (const char in currentCharset) {
        const stat = progress[char];
        const weight = Math.max(1, 1 + (stat.incorrect * 5) - stat.correct);
        for (let i = 0; i < weight; i++) {
            weightedList.push(char);
        }
    }

    if (weightedList.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * weightedList.length);
    return weightedList[randomIndex];
}

function showHomePage() {
    contentArea.innerHTML = `
        <div class="card shadow-sm">
            <div class="card-body">
                <h5 class="card-title">Welcome to Nihon</h5>
                <p class="card-text">Select a section to start your personalized quiz.</p>
                <div class="d-grid gap-2">
                    <button class="btn btn-primary" onclick="startQuiz('hiragana')">Hiragana</button>
                    <button class="btn btn-primary" onclick="startQuiz('dakuten')">Dakuten</button>
                    <button class="btn btn-primary" onclick="startQuiz('handakuten')">Han-dakuten</button>
                    <button class="btn btn-info" onclick="startQuiz('katakana')">Katakana</button>
                    <button class="btn btn-warning" onclick="startQuiz('kanji')">Kanji</button>
                    <button class="btn btn-success" onclick="startQuiz('numbers')">Numbers</button>
                </div>
            </div>
        </div>
    `;
}

function startQuiz(type) {
    currentCharset = characterSets[type];
    initializeProgress(currentCharset);

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
        const options = {
            customKanaMapping: {
                shi: 'し',
                chi: 'ち',
                tsu: 'つ',
                fu: 'ふ',
                ji: 'じ',
                zu: 'ず'
            }
        };

        if (type === 'katakana') {
            wanakana.bind(answerInput, { ...options, to: 'katakana' });
        } else {
            wanakana.bind(answerInput, { ...options, to: 'hiragana' });
        }
    }

    loadQuestion(type);
}

async function getExampleWord(character) {
    await dictionaryLoadPromise; // Ensure dictionary is loaded
    // Find an entry where the word starts with the character being quizzed.
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const wordIndex = objectStore.index('word');
    const request = wordIndex.openCursor(IDBKeyRange.bound(character, character + '\uffff', false, true)); // Search for words starting with character
    
    return new Promise((resolve) => {
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                resolve(cursor.value);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => resolve(null);
    });
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

    const correctAnswer = currentCharset[charToTest];
    
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
    const example = await getExampleWord(charToTest);
    const exampleWordArea = document.getElementById('example-word-area');
    if (example && exampleWordArea) {
        exampleWordArea.innerHTML = `
            <p class="card-text mt-3" style="font-family: 'Noto Sans JP Embedded', sans-serif;">
                <strong>Example:</strong> ${example.word} (${example.reading}) - <em>${example.meaning}</em>
            </p>
        `;
    } else if (exampleWordArea) {
        exampleWordArea.innerHTML = ''; // Clear if no example is found
    }
}

function checkAnswer(char, correctAnswer, type) {
    const answerInput = document.getElementById('answer-input');
    let userAnswer = answerInput.value.trim();
    const feedbackArea = document.getElementById('feedback-area');

    // Convert user input to Romaji if Wanakana is enabled
    if (isWanakanaEnabled()) {
        userAnswer = wanakana.toRomaji(userAnswer);
    }

    if (userAnswer === correctAnswer) {
        progress[char].correct++;
        feedbackArea.innerHTML = `<span class="text-success">Correct!</span>`;
    } else {
        progress[char].incorrect++;
        feedbackArea.innerHTML = `<span class="text-danger">Incorrect. It's "${correctAnswer}".</span>`;
    }
    
    localStorage.setItem('nihon-progress', JSON.stringify(progress));

    document.getElementById('check-button').disabled = true;

    setTimeout(() => loadQuestion(type), 1200);
}

showHomePage();

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
                newWorker.postMessage({ action: 'skipWaiting' });
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

if (statsModal) {
    statsModal.addEventListener('show.bs.modal', () => {
        wrongCharsTableBody.innerHTML = ''; // Clear previous content
        const wrongCharacters = [];
        for (const char in progress) {
            if (progress[char].incorrect > 0) {
                // Find the romaji for the character
                let romaji = '';
                for (const setKey in characterSets) {
                    if (characterSets[setKey][char]) {
                        romaji = characterSets[setKey][char];
                        break;
                    }
                }
                wrongCharacters.push({ char: char, romaji: romaji, count: progress[char].incorrect });
            }
        }

        // Sort by incorrect count in descending order
        wrongCharacters.sort((a, b) => b.count - a.count);

        if (wrongCharacters.length === 0) {
            wrongCharsTableBody.innerHTML = '<tr><td colspan="3">No characters answered incorrectly yet!</td></tr>';
        } else {
            wrongCharacters.forEach(item => {
                const row = wrongCharsTableBody.insertRow();
                const charCell = row.insertCell();
                const romajiCell = row.insertCell();
                const countCell = row.insertCell();
                charCell.textContent = item.char;
                romajiCell.textContent = item.romaji;
                countCell.textContent = item.count;

                // Apply the font to the character and romaji cells
                charCell.style.fontFamily = "'Noto Sans JP Embedded', sans-serif";
                romajiCell.style.fontFamily = "'Noto Sans JP Embedded', sans-serif";
            });
        }
    });
}


// --- Dictionary Modal Logic ---
const dictionaryModal = document.getElementById('dictionary-modal');
const dictionarySearchInput = document.getElementById('dictionary-search-input');
const dictionarySearchButton = document.getElementById('dictionary-search-button');
const dictionaryResultArea = document.getElementById('dictionary-result-area');

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
            const japaneseNumbers = {
                '1': '一', '2': '二', '3': '三', '4': '四', '5': '五',
                '6': '六', '7': '七', '8': '八', '9': '九', '10': '十',
                '11': '十一', '12': '十二', '13': '十三', '14': '十四', '15': '十五',
                '16': '十六', '17': '十七', '18': '十八', '19': '十九', '20': '二十',
                '21': '二十一', '22': '二十二', '23': '二十三', '24': '二十四', '25': '二十五',
                '26': '二十六', '27': '二十七', '28': '二十八', '29': '二十九', '30': '三十',
                '31': '三十一', '32': '三十二', '33': '三十三', '34': '三十四', '35': '三十五',
                '36': '三十六', '37': '三十七', '38': '三十八', '39': '三十九', '40': '四十',
                '41': '四十一', '42': '四十二', '43': '四十三', '44': '四十四', '45': '四十五',
                '46': '四十六', '47': '四十七', '48': '四十八', '49': '四十九', '50': '五十',
                '51': '五十一', '52': '五十二', '53': '五十三', '54': '五十四', '55': '五十五',
                '56': '五十六', '57': '五十七', '58': '五十八', '59': '五十九', '60': '六十',
                '61': '六十一', '62': '六十二', '63': '六十三', '64': '六十四', '65': '六十五',
                '66': '六十六', '67': '六十七', '68': '六十八', '69': '六十九', '70': '七十',
                '71': '七十一', '72': '七十二', '73': '七十三', '74': '七十四', '75': '七十五',
                '76': '七十六', '77': '七十七', '78': '七十八', '79': '七十九', '80': '八十',
                '81': '八十一', '82': '八十二', '83': '八十三', '84': '八十四', '85': '八十五',
                '86': '八十六', '87': '八十七', '88': '八十八', '89': '八十九', '90': '九十',
                '91': '九十一', '92': '九十二', '93': '九十三', '94': '九十四', '95': '九十五',
                '96': '九十六', '97': '九十七', '98': '九十八', '99': '九十九', '100': '百'
            };
            displayChar = japaneseNumbers[char] || char; // Japanese character as main, fallback to Latin
            latinNumber = char; // Latin number for display below
        }

        html += `
            <div class="col">
                <div class="card text-center h-100">
                    <div class="card-body d-flex flex-column justify-content-center align-items-center">
                        <h3 class="card-title" style="font-family: 'Noto Sans JP Embedded', sans-serif;">${displayChar}</h3>
                        <p class="card-text">${latinNumber} - ${displayRomaji}</p>
                    </div>
                </div>
            </div>
        `;
    }
    html += '</div>';
    return html;
}

async function searchDictionary(word) {
    await dictionaryLoadPromise; // Ensure IndexedDB is ready
    dictionaryResultArea.innerHTML = 'Searching...';

    const searchTerm = word.toLowerCase();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const results = [];

    // Search by word, reading, and meaning
    const searchPromises = [];

    // Search by word
    searchPromises.push(new Promise(resolve => {
        const wordIndex = objectStore.index('word');
        const request = wordIndex.openCursor();
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.word.toLowerCase().includes(searchTerm)) {
                    results.push(cursor.value);
                }
                cursor.continue();
            } else {
                resolve();
            }
        };
        request.onerror = () => resolve();
    }));

    // Search by reading
    searchPromises.push(new Promise(resolve => {
        const readingIndex = objectStore.index('reading');
        const request = readingIndex.openCursor();
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.reading.toLowerCase().includes(searchTerm)) {
                    results.push(cursor.value);
                }
                cursor.continue();
            } else {
                resolve();
            }
        };
        request.onerror = () => resolve();
    }));

    // Search by meaning
    searchPromises.push(new Promise(resolve => {
        const meaningIndex = objectStore.index('meaning');
        const request = meaningIndex.openCursor();
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.meaning.toLowerCase().includes(searchTerm)) {
                    results.push(cursor.value);
                }
                cursor.continue();
            } else {
                resolve();
            }
        };
        request.onerror = () => resolve();
    }));

    await Promise.all(searchPromises);

    // Remove duplicates and sort for display
    const uniqueResults = Array.from(new Map(results.map(item => [item.seq, item])).values());

    // Simple sorting for now: exact matches first, then startsWith, then includes
    uniqueResults.sort((a, b) => {
        const aWordLower = a.word.toLowerCase();
        const bWordLower = b.word.toLowerCase();
        const aReadingLower = a.reading.toLowerCase();
        const bReadingLower = b.reading.toLowerCase();
        const aMeaningLower = a.meaning.toLowerCase();
        const bMeaningLower = b.meaning.toLowerCase();

        const searchTermLower = searchTerm.toLowerCase();

        // Exact matches
        if (aWordLower === searchTermLower || aReadingLower === searchTermLower) return -1;
        if (bWordLower === searchTermLower || bReadingLower === searchTermLower) return 1;

        // Starts with
        if (aWordLower.startsWith(searchTermLower) || aReadingLower.startsWith(searchTermLower)) return -1;
        if (bWordLower.startsWith(searchTermLower) || bReadingLower.startsWith(searchTermLower)) return 1;

        // Includes
        if (aWordLower.includes(searchTermLower) || aReadingLower.includes(searchTermLower) || aMeaningLower.includes(searchTermLower)) return -1;
        if (bWordLower.includes(searchTermLower) || bReadingLower.includes(searchTermLower) || bMeaningLower.includes(searchTermLower)) return 1;

        return 0;
    });


    if (uniqueResults.length > 0) {
        let html = '<div class="accordion" id="dictionary-accordion">';
        // Limit to 100 results for performance
        uniqueResults.slice(0, 100).forEach((entry, i) => {
            const entryId = `entry-${i}`;
            const romaji = wanakana.toRomaji(entry.reading);
            html += `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="heading-${entryId}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${entryId}" aria-expanded="false" aria-controls="collapse-${entryId}">
                            <div class="w-100">
                                <strong style="font-family: 'Noto Sans JP Embedded', sans-serif;">${entry.word} (${entry.reading})</strong>
                                <br>
                                <small class="text-muted">${romaji}</small>
                                <div class="text-truncate">${entry.meaning}</div>
                            </div>
                        </button>
                    </h2>
                    <div id="collapse-${entryId}" class="accordion-collapse collapse" aria-labelledby="heading-${entryId}" data-bs-parent="#dictionary-accordion">
                        <div class="accordion-body">
                            <p style="font-family: 'Noto Sans JP Embedded', sans-serif;">${entry.meaning}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        if (uniqueResults.length > 100) {
            html += `<p class="text-center mt-2">More than 100 results found. Please refine your search.</p>`;
        }
        html += '</div>';
        dictionaryResultArea.innerHTML = html;
    } else {
        dictionaryResultArea.innerHTML = 'No results found.';
    }
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
        appTitle.textContent = '◀️'; // Change to back emoji
        appTitle.classList.add('back-button'); // Add a class for potential styling
        appTitle.style.fontSize = '1.5rem'; // Increase font size
        isSectionActive = true;
    } else {
        appTitle.textContent = 'Nihon'; // Change back to title
        appTitle.classList.remove('back-button');
        appTitle.style.fontSize = ''; // Reset font size
        isSectionActive = false;
    }
}

// Modify startQuiz to update the home button
const originalStartQuiz = startQuiz;
startQuiz = function(type) {
    originalStartQuiz(type);
    updateHomeButton(true); // A section is now active
};

// Modify showHomePage to update the home button
const originalShowHomePage = showHomePage;
showHomePage = function() {
    originalShowHomePage();
    updateHomeButton(false); // No section is active
};

// Event listener for the home button
homeButton.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default link behavior
    if (isSectionActive) {
        showHomePage(); // Go back to home page
    } else {
        // If already on home page, do nothing or scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

// Initial call to set the home button state
updateHomeButton(false);
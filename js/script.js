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
                        if (setKey === 'numbers') {
                            romaji = characterSets[setKey][char].romaji;
                        } else {
                            romaji = characterSets[setKey][char];
                        }
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
                        <p class="card-text">${displayRomaji} (${latinNumber})</p>
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
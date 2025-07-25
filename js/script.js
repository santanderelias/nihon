// --- Service Worker and PWA ---
const devModeSwitch = document.getElementById('dev-mode-switch');

const isDevMode = () => localStorage.getItem('devMode') === 'true';

if (devModeSwitch) {
    devModeSwitch.checked = isDevMode();
    devModeSwitch.addEventListener('change', () => {
        localStorage.setItem('devMode', devModeSwitch.checked);
        alert('Developer mode setting changed. Please reload the page for it to take effect.');
        location.reload();
    });
}

if ('serviceWorker' in navigator && !isDevMode()) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/nihon/sw.js', {scope: '/nihon/'})
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);

                // Request version from service worker
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ action: 'get-version' });
                }
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
        }
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


// --- App Logic ---
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
        '一': 'ichi', '二': 'ni', '三': 'san', '四': 'shi', '五': 'go',
        '六': 'roku', '七': 'shichi', '八': 'hachi', '九': 'kyu', '十': 'juu'
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
                    <input type="text" class="form-control text-center" id="answer-input" autofocus oninput="this.value = this.value.toLowerCase()" onkeypress="if(event.key === 'Enter') document.getElementById('check-button').click()">
                </div>
                <button class="btn btn-success" id="check-button">Check</button>
                <button class="btn btn-secondary" id="skip-button">Skip</button>
            </div>
        </div>
    `;
    
    loadQuestion(type);
}

async function getExampleWord(character) {
    try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://jisho.org/api/v1/search/words?keyword=${character}`)}`);
        const data = await response.json();
        const jishoData = JSON.parse(data.contents);
        if (jishoData.data && jishoData.data.length > 0) {
            // Find an example that is not too long and preferably contains the character
            const example = jishoData.data.find(entry =>
                entry.japanese[0].word &&
                entry.japanese[0].word.includes(character) &&
                entry.senses[0].english_definitions[0].length < 50
            );
            if (example) {
                return {
                    word: example.japanese[0].word,
                    reading: example.japanese[0].reading,
                    meaning: example.senses[0].english_definitions.join(', ')
                };
            }
        }
        return null;
    } catch (error) {
        console.error('Failed to fetch example word:', error);
        return null;
    }
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
            <p class="card-text mt-3">
                <strong>Example:</strong> ${example.word} (${example.reading}) - <em>${example.meaning}</em>
            </p>
        `;
    } else if (exampleWordArea) {
        exampleWordArea.innerHTML = ''; // Clear if no example is found
    }
}

function checkAnswer(char, correctAnswer, type) {
    const answerInput = document.getElementById('answer-input');
    const userAnswer = answerInput.value.trim();
    const feedbackArea = document.getElementById('feedback-area');

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
function showToast(title, message) {
    const toastLiveExample = document.getElementById('liveToast');
    const toastTitle = document.getElementById('toast-title');
    const toastBody = document.getElementById('toast-body');
    const toastContainer = document.querySelector('.toast-container');

    if (toastLiveExample && toastTitle && toastBody) {
        toastTitle.textContent = title;
        toastBody.innerHTML = message;

        const toast = new bootstrap.Toast(toastLiveExample);
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

async function searchDictionary(word) {
    dictionaryResultArea.innerHTML = 'Searching...';
    try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://jisho.org/api/v1/search/words?keyword=${word}`)}`);
        const data = await response.json();
        const jishoData = JSON.parse(data.contents);

        if (jishoData.data && jishoData.data.length > 0) {
            let html = '<div class="accordion" id="dictionary-accordion">';
            jishoData.data.forEach((entry, i) => {
                const entryId = `entry-${i}`;
                const firstSense = entry.senses[0].english_definitions.join(', ');

                const romaji = wanakana.toRomaji(entry.japanese[0].reading);
                html += `
                    <div class="accordion-item">
                        <h2 class="accordion-header" id="heading-${entryId}">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${entryId}" aria-expanded="false" aria-controls="collapse-${entryId}">
                                <div>
                                    <strong style="font-family: 'Noto Sans JP Embedded', sans-serif;">${entry.japanese[0].word || ''} (${entry.japanese[0].reading || ''})</strong>
                                    <br>
                                    <small class="text-muted">${romaji}</small>
                                </div>
                                <div class="ms-auto">: ${firstSense}</div>
                            </button>
                        </h2>
                        <div id="collapse-${entryId}" class="accordion-collapse collapse" aria-labelledby="heading-${entryId}" data-bs-parent="#dictionary-accordion">
                            <div class="accordion-body">
                `;

                entry.senses.forEach((sense, index) => {
                    html += `<p class="card-text" style="font-family: 'Noto Sans JP Embedded', sans-serif;"><strong>${index + 1}.</strong> ${sense.english_definitions.join(', ')}</p>`;
                    if (sense.parts_of_speech.length > 0) {
                        html += `<p class="card-text text-muted" style="font-family: 'Noto Sans JP Embedded', sans-serif;"><em>${sense.parts_of_speech.join(', ')}</em></p>`;
                    }
                });

                html += `
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            dictionaryResultArea.innerHTML = html;
        } else {
            dictionaryResultArea.innerHTML = 'No results found.';
        }
    } catch (error) {
        console.error('Dictionary search failed:', error);
        dictionaryResultArea.innerHTML = 'Failed to fetch dictionary results. Please try again later.';
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

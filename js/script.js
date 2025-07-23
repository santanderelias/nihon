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
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
} else if ('serviceWorker' in navigator && isDevMode()) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
            console.log('ServiceWorker unregistered.');
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
        // We've used the prompt, and can't use it again, clear it.
        deferredPrompt = null;
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
                    <button class="btn btn-primary" onclick="startQuiz('hiragana')">Hiragana (Romaji)</button>
                    <button class="btn btn-primary" onclick="startQuiz('dakuten')">Dakuten</button>
                    <button class="btn btn-primary" onclick="startQuiz('handakuten')">Han-dakuten</button>
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
                <div class="mb-3">
                    <input type="text" class="form-control text-center" id="answer-input" autofocus oninput="this.value = this.value.toLowerCase()" onkeypress="if(event.key === 'Enter') document.getElementById('check-button').click()">
                </div>
                <button class="btn btn-success" id="check-button">Check</button>
            </div>
        </div>
    `;
    
    loadQuestion(type);
}

function loadQuestion(type) {
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

    answerInput.focus();
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
                charCell.style.fontFamily = 'Noto Sans JP Embedded, sans-serif';
                romajiCell.style.fontFamily = 'Noto Sans JP Embedded, sans-serif';
            });
        }
    });
}

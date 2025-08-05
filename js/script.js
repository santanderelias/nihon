// --- Service Worker and PWA ---

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
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI notify the user they can install the PWA
    updateHomeButton(isSectionActive);
});

if (installButton) {
    installButton.addEventListener('click', async () => {
        // Hide the app install button
        installButton.style.display = 'none';
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        // Optionally, send analytics event with outcome of user choice
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

    switch (data.action) {
        case 'completed':
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
            // Update UI in dictionary modal and hints section
            const loadingElements = document.querySelectorAll('.dictionary-loading-message');
            loadingElements.forEach(el => el.textContent = currentDictionaryStatusMessage);
            break;

        case 'error':
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
                    let html = '<div>'; // Use a simple div container
                    results.forEach((entry, i) => {
                        const romaji = wanakana.toRomaji(entry.reading); // Convert kana to romaji
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

const achievements = {
    // Hiragana Achievements
    'hiragana_apprentice': {
        name: 'Hiragana Apprentice',
        description: 'Answer all Hiragana vowels correctly 5 times.',
        requires: [],
        characters: () => characterLevels.hiragana[0].set
    },
    'hiragana_experienced': {
        name: 'Hiragana Experienced',
        description: 'Answer all basic Hiragana syllables correctly 5 times.',
        requires: ['hiragana_apprentice'],
        characters: () => {
            let sets = {};
            for (let i = 0; i < 10; i++) { // First 10 levels are basic hiragana
                Object.assign(sets, characterLevels.hiragana[i].set);
            }
            return sets;
        }
    },
    'hiragana_master': {
        name: 'Hiragana Master',
        description: 'Answer all Hiragana characters correctly 5 times.',
        requires: ['hiragana_experienced'],
        characters: () => {
            let sets = {};
            characterLevels.hiragana.forEach(level => Object.assign(sets, level.set));
            return sets;
        }
    },
    // Katakana Achievements
    'katakana_apprentice': {
        name: 'Katakana Apprentice',
        description: 'Answer all Katakana vowels correctly 5 times.',
        requires: [],
        characters: () => characterLevels.katakana[0].set
    },
    'katakana_experienced': {
        name: 'Katakana Experienced',
        description: 'Answer all basic Katakana syllables correctly 5 times.',
        requires: ['katakana_apprentice'],
        characters: () => {
            let sets = {};
            for (let i = 0; i < 10; i++) { // First 10 levels are basic katakana
                Object.assign(sets, characterLevels.katakana[i].set);
            }
            return sets;
        }
    },
    'katakana_master': {
        name: 'Katakana Master',
        description: 'Answer all Katakana characters correctly 5 times.',
        requires: ['katakana_experienced'],
        characters: () => {
            let sets = {};
            characterLevels.katakana.forEach(level => Object.assign(sets, level.set));
            return sets;
        }
    },
    // Kanji Achievements
    'kanji_initiate_1': {
        name: 'Kanji Initiate (Grade 1)',
        description: 'Answer all Grade 1 Kanji correctly 5 times.',
        requires: [],
        characters: () => {
            let sets = {};
            for (let i = 0; i < 4; i++) { // First 4 levels are Grade 1
                Object.assign(sets, characterLevels.kanji[i].set);
            }
            return sets;
        }
    },
    'kanji_initiate_2': {
        name: 'Kanji Initiate (Grade 2)',
        description: 'Answer all Grade 2 Kanji correctly 5 times.',
        requires: ['kanji_initiate_1'],
        characters: () => {
            let sets = {};
            for (let i = 4; i < characterLevels.kanji.length; i++) { // The rest are Grade 2
                Object.assign(sets, characterLevels.kanji[i].set);
            }
            return sets;
        }
    },
    'kanji_master': {
        name: 'Kanji Master',
        description: 'Answer all Kanji correctly 5 times.',
        requires: ['kanji_initiate_2'],
        characters: () => {
            let sets = {};
            characterLevels.kanji.forEach(level => Object.assign(sets, level.set));
            return sets;
        }
    },
    // Numbers Achievements
    'accountant': {
        name: 'Accountant',
        description: 'Answer numbers 1-50 correctly 5 times.',
        requires: [],
        characters: () => {
            let sets = {};
            for (let i = 0; i < 5; i++) { // First 5 levels are 1-50
                Object.assign(sets, characterLevels.numbers[i].set);
            }
            return sets;
        }
    },
    'comptroller': {
        name: 'Comptroller',
        description: 'Answer numbers 1-100 correctly 5 times.',
        requires: ['accountant'],
        characters: () => {
            let sets = {};
            characterLevels.numbers.forEach(level => Object.assign(sets, level.set));
            return sets;
        }
    },
    // Overall Achievement
    'nihon_pro': {
        name: 'Nihon Pro',
        description: 'Achieve Master level in all categories.',
        requires: ['hiragana_master', 'katakana_master', 'kanji_master', 'comptroller']
    },
    // Listening Achievements
    'listening_apprentice': {
        name: 'Listening Apprentice',
        description: 'Master the first 3 listening levels.',
        requires: [],
        characters: () => {
            let sets = {};
            for (let i = 0; i < 3; i++) {
                Object.assign(sets, characterLevels.listening[i].set);
            }
            return sets;
        }
    },
    'sharp_ears': {
        name: 'Sharp Ears',
        description: 'Master all single-character listening levels.',
        requires: ['listening_apprentice'],
        characters: () => {
            let sets = {};
            for (let i = 0; i < 4; i++) { // First 4 levels are single characters
                Object.assign(sets, characterLevels.listening[i].set);
            }
            return sets;
        }
    },
    'fluent_speaker': {
        name: 'Fluent Speaker',
        description: 'Master all listening levels.',
        requires: ['sharp_ears'],
        characters: () => {
            let sets = {};
            characterLevels.listening.forEach(level => Object.assign(sets, level.set));
            return sets;
        }
    },
    // Advanced Listening Achievements
    'word_smith': {
        name: 'Word Smith',
        description: 'Master all word-based listening levels.',
        requires: ['sharp_ears'],
        characters: () => {
            let sets = {};
            for (let i = 4; i < 8; i++) { // Levels for words
                Object.assign(sets, characterLevels.listening[i].set);
            }
            return sets;
        }
    },
    'sentence_scholar': {
        name: 'Sentence Scholar',
        description: 'Master all sentence-based listening levels.',
        requires: ['word_smith'],
        characters: () => {
            let sets = {};
            for (let i = 8; i < characterLevels.listening.length; i++) { // Levels for sentences
                Object.assign(sets, characterLevels.listening[i].set);
            }
            return sets;
        }
    },

    // Words Achievements
    'word_novice': {
        name: 'Word Novice',
        description: 'Master the first two levels of words.',
        requires: [],
        characters: () => {
            let sets = {};
            for (let i = 0; i < 2; i++) {
                Object.assign(sets, characterLevels.words[i].set);
            }
            return sets;
        }
    },
    'word_scholar': {
        name: 'Word Scholar',
        description: 'Master all word levels.',
        requires: ['word_novice'],
        characters: () => {
            let sets = {};
            characterLevels.words.forEach(level => Object.assign(sets, level.set));
            return sets;
        }
    },

    // Sentences Achievements
    'sentence_starter': {
        name: 'Sentence Starter',
        description: 'Master the first two levels of sentences.',
        requires: [],
        characters: () => {
            let sets = {};
            for (let i = 0; i < 2; i++) {
                Object.assign(sets, characterLevels.sentences[i].set);
            }
            return sets;
        }
    },
    'sentence_virtuoso': {
        name: 'Sentence Virtuoso',
        description: 'Master all sentence levels.',
        requires: ['sentence_starter'],
        characters: () => {
            let sets = {};
            characterLevels.sentences.forEach(level => Object.assign(sets, level.set));
            return sets;
        }
    },

    // Combined Achievements
    'polyglot': {
        name: 'Polyglot',
        description: 'Achieve master level in both words and sentences.',
        requires: ['word_scholar', 'sentence_virtuoso']
    }
};

function getHelpContent(quizType) {
    switch (quizType) {
        case 'hiragana':
        case 'katakana':
            return `
                <h5>Dakuten (゛)</h5>
                <p>The dakuten diacritic is used to change the consonant sound of a syllable.</p>
                <ul class="list-group">
                    <li class="list-group-item">K (か) → G (が)</li>
                    <li class="list-group-item">S (さ) → Z (ざ)</li>
                    <li class="list-group-item">T (た) → D (だ)</li>
                    <li class="list-group-item">H (は) → B (ば)</li>
                </ul>
                <h5 class="mt-3">Handakuten (゜)</h5>
                <p>The handakuten diacritic is used to change the consonant sound of the H-syllables.</p>
                <ul class="list-group">
                    <li class="list-group-item">H (は) → P (ぱ)</li>
                </ul>
            `;
        case 'kanji':
            return `
                <h5>Kanji Help</h5>
                <p>Kanji are logographic characters, where each character represents a word or idea. They often have multiple readings:</p>
                <ul>
                    <li><strong>On'yomi (音読み):</strong> The Chinese reading, often used in compound words.</li>
                    <li><strong>Kun'yomi (訓読み):</strong> The native Japanese reading, often used for single-character words.</li>
                </ul>
                <p>The IME at the bottom right will help you find the right Kanji by typing its reading.</p>
            `;
        case 'numbers':
            return `
                <h5>Numbers Help</h5>
                <p>Japanese numbers follow a logical system. After 10, they are formed by combining the numbers.</p>
                <p>For example:</p>
                <ul>
                    <li><strong>11</strong> is 十一 (juu-ichi) which is 10 + 1.</li>
                    <li><strong>20</strong> is 二十 (ni-juu) which is 2 * 10.</li>
                    <li><strong>21</strong> is 二十一 (ni-juu-ichi) which is 2 * 10 + 1.</li>
                </ul>
                <p>Use the IME to type the Romaji reading (e.g., "san") to get the Kanji (三).</p>
            `;
        case 'words':
        case 'sentences':
            return `
                <h5>Vocabulary & Sentence Help</h5>
                <p>For these quizzes, you need to provide the correct Romaji reading for the Japanese word or sentence shown.</p>
                <p>The IME will help you find the correct Japanese characters if you get stuck, but the goal is to type the reading directly.</p>
                <p>Pay attention to particles (は, を, が) and verb endings!</p>
            `;
        default:
            return ''; // No help for this quiz type
    }
}

const characterLevels = {
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
        // Grade 1
        { name: "Kanji Basics 1", set: { '一': 'ichi', '二': 'ni', '三': 'san', '四': 'shi', '五': 'go', '六': 'roku', '七': 'shichi', '八': 'hachi', '九': 'kyuu', '十': 'juu' } },
        { name: "Kanji Basics 2", set: { '百': 'hyaku', '千': 'sen', '万': 'man', '円': 'en', '時': 'ji', '日': 'nichi', '月': 'getsu', '火': 'ka', '水': 'sui', '木': 'moku' } },
        { name: "Kanji Nature", set: { '金': 'kin', '土': 'do', '曜': 'you', '上': 'ue', '下': 'shita', '中': 'naka', '半': 'han', '山': 'yama', '川': 'kawa', '元': 'gen' } },
        { name: "Kanji People & Body", set: { '気': 'ki', '天': 'ten', '私': 'watashi', '今': 'ima', '田': 'ta', '女': 'onna', '男': 'otoko', '見': 'mi', '行': 'i', '食': 'ta', '飲': 'no' } },
        // Grade 2
        { name: "Kanji Language", set: { '語': 'go', '本': 'hon', '学生': 'gakusei', '学校': 'gakkou', '先生': 'sensei', '友': 'tomo', '達': 'dachi', '何': 'nan', '毎': 'mai', '朝': 'asa' } },
        { name: "Kanji Time & Places", set: { '昼': 'hiru', '晩': 'ban', '時': 'toki', '分': 'fun', '半': 'han', '国': 'kuni', '人': 'jin', '会': 'a', '社': 'sha', '員': 'in' } },
        { name: "Kanji Professions & Places", set: { '医': 'i', '者': 'sha', '大': 'dai', '学': 'gaku', '高': 'kou', '校': 'kou', '小': 'shou', '中': 'chuu', '電': 'den', '車': 'sha' } },
        { name: "Kanji Verbs & Directions", set: { '自': 'ji', '転': 'ten', '乗': 'no', '駅': 'eki', '銀': 'gin', '行': 'kou', '郵': 'yuu', '便': 'bin', '局': 'kyoku', '図': 'to' } },
        { name: "Kanji Places & Directions", set: { '書': 'sho', '館': 'kan', '映': 'ei', '画': 'ga', '右': 'migi', '左': 'hidari', '前': 'mae', '後': 'ushiro', '外': 'soto', '東': 'higashi' } },
        { name: "Kanji Family", set: { '西': 'nishi', '南': 'minami', '北': 'kita', '名': 'na', '前': 'mae', '父': 'chichi', '母': 'haha', '子': 'ko', '供': 'domo', '犬': 'inu' } },
        { name: "Kanji Animals & Nature", set: { '猫': 'neko', '鳥': 'tori', '魚': 'sakana', '花': 'hana', '肉': 'niku', '野菜': 'yasai', '果物': 'kudamono', '水': 'mizu', '茶': 'cha', '牛': 'gyuu' } },
        { name: "Kanji Verbs (Life)", set: { '乳': 'nyuu', '来': 'ki', '帰': 'kae', '聞': 'ki', '読': 'yo', '書': 'ka', '話': 'hana', '買': 'ka', '起': 'o', '寝': 'ne' } },
        { name: "Kanji Verbs (Mind)", set: { '見': 'mi', '勉': 'ben', '強': 'kyou', '働': 'hatara', '休': 'yasu', '言': 'i', '思': 'omo', '知': 'shi', '入': 'hai', '出': 'de' } },
        { name: "Kanji Verbs (Actions)", set: { '待': 'ma', '作': 'tsuku', '使': 'tsuka', '会': 'a', '同': 'ona', '楽': 'tano', '好': 'su', '嫌': 'kira', '上手': 'jouzu', '下手': 'heta' } },
        { name: "Kanji Adjectives (State)", set: { '元': 'gen', '気': 'ki', '病': 'byou', '院': 'in', '薬': 'kusuri', '速': 'haya', '遅': 'oso', '近': 'chika', '遠': 'too', '広': 'hiro' } },
        { name: "Kanji Adjectives (Qualities)", set: { '狭': 'sema', '明': 'aka', '暗': 'kura', '暑': 'atsu', '寒': 'samu', '暖': 'atata', '涼': 'suzu', '静': 'shizu', '賑': 'nigi', '有名': 'yuumei' } },
        { name: "Kanji Adjectives (People/Things)", set: { '親切': 'shinsetsu', '便利': 'benri', '不便': 'fuben', '元気': 'genki', '綺麗': 'kirei', '汚': 'kitana', '可愛': 'kawaii', '赤': 'aka', '青': 'ao', '白': 'shiro' } },
        { name: "Kanji Colors & Seasons", set: { '黒': 'kuro', '色': 'iro', '春': 'haru', '夏': 'natsu', '秋': 'aki', '冬': 'fuyu', '雨': 'ame', '雪': 'yuki', '風': 'kaze', '晴': 'ha' } },
        { name: "Kanji Nature & Places", set: { '曇': 'kumo', '空': 'sora', '海': 'umi', '山': 'yama', '川': 'kawa', '池': 'ike', '庭': 'niwa', '店': 'mise', '駅': 'eki', '道': 'michi' } },
        { name: "Kanji Places & Things", set: { '部屋': 'heya', '家': 'ie', '会社': 'kaisha', '電話': 'denwa', '番号': 'bangou', '机': 'tsukue', '椅子': 'isu', '鞄': 'kaban', '靴': 'kutsu', '鉛筆': 'enpitsu' } },
        { name: "Kanji Things & Transport", set: { '時計': 'tokei', '写真': 'shashin', '車': 'kuruma', '自転車': 'jitensha', '飛行機': 'hikouki', '船': 'fune', '電車': 'densha', '地下鉄': 'chikatetsu', '新幹線': 'shinkansen', '切符': 'kippu' } },
        { name: "Kanji Time & Money", set: { 'お金': 'okane', '時間': 'jikan', '今日': 'kyou', '明日': 'ashita', '昨日': 'kinou', '今週': 'konshuu', '来週': 'raishuu', '先週': 'senshuu', '今年': 'kotoshi', '来年': 'rainen' } },
        { name: "Kanji Time & Question Words", set: { '去年': 'kyonen', '毎': 'mai', '何': 'nani', '誰': 'dare', '何処': 'doko', '何時': 'itsu', '何故': 'naze', '如何': 'dou', '一': 'hito' } },
        { name: "Kanji Numbers (Native)", set: { '二': 'futa', '三': 'mi', '四': 'yon', '五': 'itsu', '六': 'mu', '七': 'nana', '八': 'ya', '九': 'kokono', '十': 'too', '百': 'hyaku', '千': 'chi', '万': 'yorozu' } }
    ],
    numbers: [
        { name: "Numbers 1-10", set: { '一': { latin: '1', romaji: 'ichi' }, '二': { latin: '2', romaji: 'ni' }, '三': { latin: '3', romaji: 'san' }, '四': { latin: '4', romaji: 'shi' }, '五': { latin: '5', romaji: 'go' }, '六': { latin: '6', romaji: 'roku' }, '七': { latin: '7', romaji: 'shichi' }, '八': { latin: '8', romaji: 'hachi' }, '九': { latin: '9', romaji: 'kyuu' }, '十': { latin: '10', romaji: 'juu' } } },
        { name: "Numbers 11-20", set: { '十一': { latin: '11', romaji: 'juuichi' }, '十二': { latin: '12', romaji: 'juuni' }, '十三': { latin: '13', romaji: 'juusan' }, '十四': { latin: '14', romaji: 'juushi' }, '十五': { latin: '15', romaji: 'juugo' }, '十六': { latin: '16', romaji: 'juuroku' }, '十七': { latin: '17', romaji: 'juushichi' }, '十八': { latin: '18', romaji: 'juuhachi' }, '十九': { latin: '19', romaji: 'juukyuu' }, '二十': { latin: '20', romaji: 'nijuu' } } },
        { name: "Numbers 21-30", set: { '二十一': { latin: '21', romaji: 'nijuuichi' }, '二十二': { latin: '22', romaji: 'nijuuni' }, '二十三': { latin: '23', romaji: 'nijuusan' }, '二十四': { latin: '24', romaji: 'nijuushi' }, '二十五': { latin: '25', romaji: 'nijuugo' }, '二十六': { latin: '26', romaji: 'nijuuroku' }, '二十七': { latin: '27', romaji: 'nijuushichi' }, '二十八': { latin: '28', romaji: 'nijuuhachi' }, '二十九': { latin: '29', romaji: 'nijuukyuu' }, '三十': { latin: '30', romaji: 'sanjuu' } } },
        { name: "Numbers 31-40", set: { '三十一': { latin: '31', romaji: 'sanjuuichi' }, '三十二': { latin: '32', romaji: 'sanjuuni' }, '三十三': { latin: '33', romaji: 'sanjuusan' }, '三十四': { latin: '34', romaji: 'sanjuushi' }, '三十五': { latin: '35', romaji: 'sanjuugo' }, '三十六': { latin: '36', romaji: 'sanjuuroku' }, '三十七': { latin: '37', romaji: 'sanjuushichi' }, '三十八': { latin: '38', romaji: 'sanjuuhachi' }, '三十九': { latin: '39', romaji: 'sanjuukyuu' }, '四十': { latin: '40', romaji: 'yonjuu' } } },
        { name: "Numbers 41-50", set: { '四十一': { latin: '41', romaji: 'yonjuuichi' }, '四十二': { latin: '42', romaji: 'yonjuuni' }, '四十三': { latin: '43', romaji: 'yonjuusan' }, '四十四': { latin: '44', romaji: 'yonjuushi' }, '四十五': { latin: '45', romaji: 'yonjuugo' }, '四十六': { latin: '46', romaji: 'yonjuuroku' }, '四十七': { latin: '47', romaji: 'yonjuushichi' }, '四十八': { latin: '48', romaji: 'yonjuuhachi' }, '四十九': { latin: '49', romaji: 'yonjuukyuu' }, '五十': { latin: '50', romaji: 'gojuu' } } },
        { name: "Numbers 51-60", set: { '五十一': { latin: '51', romaji: 'gojuuichi' }, '五十二': { latin: '52', romaji: 'gojuuni' }, '五十三': { latin: '53', romaji: 'gojuusan' }, '五十四': { latin: '54', romaji: 'gojuushi' }, '五十五': { latin: '55', romaji: 'gojuugo' }, '五十六': { latin: '56', romaji: 'gojuuroku' }, '五十七': { latin: '57', romaji: 'gojuushichi' }, '五十八': { latin: '58', romaji: 'gojuuhachi' }, '五十九': { latin: '59', romaji: 'gojuukyuu' }, '六十': { latin: '60', romaji: 'rokujuu' } } },
        { name: "Numbers 61-70", set: { '六十一': { latin: '61', romaji: 'rokujuuichi' }, '六十二': { latin: '62', romaji: 'rokujuuni' }, '六十三': { latin: '63', romaji: 'rokujuusan' }, '六十四': { latin: '64', romaji: 'rokujuushi' }, '六十五': { latin: '65', romaji: 'rokujuugo' }, '六十六': { latin: '66', romaji: 'rokujuuroku' }, '六十七': { latin: '67', romaji: 'rokujuushichi' }, '六十八': { latin: '68', romaji: 'rokujuuhachi' }, '六十九': { latin: '69', romaji: 'rokujuukyuu' }, '七十': { latin: '70', romaji: 'nanajuu' } } },
        { name: "Numbers 71-80", set: { '七十一': { latin: '71', romaji: 'nanajuuichi' }, '七十二': { latin: '72', romaji: 'nanajuuni' }, '七十三': { latin: '73', romaji: 'nanajuusan' }, '七十四': { latin: '74', romaji: 'nanajuushi' }, '七十五': { latin: '75', romaji: 'nanajuugo' }, '七十六': { latin: '76', romaji: 'nanajuuroku' }, '七十七': { latin: '77', romaji: 'nanajuushichi' }, '七十八': { latin: '78', romaji: 'nanajuuhachi' }, '七十九': { latin: '79', romaji: 'nanajuukyuu' }, '八十': { latin: '80', romaji: 'hachijuu' } } },
        { name: "Numbers 81-90", set: { '八十一': { latin: '81', romaji: 'hachijuuichi' }, '八十二': { latin: '82', romaji: 'hachijuuni' }, '八十三': { latin: '83', romaji: 'hachijuusan' }, '八十四': { latin: '84', romaji: 'hachijuushi' }, '八十五': { latin: '85', romaji: 'hachijuugo' }, '八十六': { latin: '86', romaji: 'hachijuuroku' }, '八十七': { latin: '87', romaji: 'hachijuushichi' }, '八十八': { latin: '88', romaji: 'hachijuuhachi' }, '八十九': { latin: '89', romaji: 'hachijuukyuu' }, '九十': { latin: '90', romaji: 'kyuujuu' } } },
        { name: "Numbers 91-100", set: { '九十一': { latin: '91', romaji: 'kyuujuuichi' }, '九十二': { latin: '92', romaji: 'kyuujuuni' }, '九十三': { latin: '93', romaji: 'kyuujuusan' }, '九十四': { latin: '94', romaji: 'kyuujuushi' }, '九十五': { latin: '95', romaji: 'kyuujuugo' }, '九十六': { latin: '96', romaji: 'kyuujuuroku' }, '九十七': { latin: '97', romaji: 'kyuujuushichi' }, '九十八': { latin: '98', romaji: 'kyuujuuhachi' }, '九十九': { latin: '99', romaji: 'kyuujuukyuu' }, '百': { latin: '100', romaji: 'hyaku' } } }
    ],
    listening: [
        // Characters
        { name: "Hiragana Vowels", set: { 'a': 'a', 'i': 'i', 'u': 'u', 'e': 'e', 'o': 'o' } },
        { name: "Hiragana K-Group", set: { 'ka': 'ka', 'ki': 'ki', 'ku': 'ku', 'ke': 'ke', 'ko': 'ko' } },
        { name: "Hiragana S-Group", set: { 'sa': 'sa', 'shi': 'shi', 'su': 'su', 'se': 'se', 'so': 'so' } },
        { name: "Katakana Vowels", set: { 'A': 'A', 'I': 'I', 'U': 'U', 'E': 'E', 'O': 'O' } },
        // Words
        { name: "Common Nouns 1", set: { 'neko': 'neko', 'inu': 'inu', 'sushi': 'sushi', 'sensei': 'sensei', 'gakkou': 'gakkou' } },
        { name: "Common Nouns 2", set: { 'pen': 'pen', 'hon': 'hon', 'tsukue': 'tsukue', 'isu': 'isu', 'kuruma': 'kuruma' } },
        { name: "Common Verbs", set: { 'tabemasu': 'tabemasu', 'nomimasu': 'nomimasu', 'ikimasu': 'ikimasu', 'mimasu': 'mimasu' } },
        { name: "Common Adjectives", set: { 'oishii': 'oishii', 'ookii': 'ookii', 'chiisai': 'chiisai', 'hayai': 'hayai' } },
        // Sentences
        { name: "Basic Sentences 1", set: { 'kore wa pen desu': 'kore wa pen desu', 'sore wa hon desu': 'sore wa hon desu' } },
        { name: "Basic Sentences 2", set: { 'eki wa doko desu ka': 'eki wa doko desu ka', 'watashi wa gakusei desu': 'watashi wa gakusei desu' } }
    ],
    words: [
        // Basic Nouns
        { name: "People & Places", set: { '人': 'hito', '男': 'otoko', '女': 'onna', '家族': 'kazoku', '日本': 'nihon', '東京': 'tokyo', '店': 'mise' } },
        { name: "Food & Drink", set: { '食べ物': 'tabemono', '飲み物': 'nomimono', 'ご飯': 'gohan', 'パン': 'pan', '水': 'mizu', 'お茶': 'ocha', '牛乳': 'gyuunyuu' } },
        { name: "Everyday Objects", set: { '家': 'ie', '部屋': 'heya', '椅子': 'isu', '机': 'tsukue', '本': 'hon', '鉛筆': 'enpitsu', '時計': 'tokei' } },
        { name: "Time & Weather", set: { '今日': 'kyou', '明日': 'ashita', '昨日': 'kinou', '時間': 'jikan', '天気': 'tenki', '雨': 'ame', '晴れ': 'hare' } },
        
        // Basic Verbs
        { name: "Action Verbs 1", set: { '見ます': 'mimasu', '食べます': 'tabemasu', '飲みます': 'nomimasu', '買います': 'kaimasu', '行きます': 'ikimasu', '帰ります': 'kaerimasu' } },
        { name: "Action Verbs 2", set: { '読みます': 'yomimasu', '書きます': 'kakimasu', '聞きます': 'kikimasu', '話します': 'hanashimasu', '寝ます': 'nemasu', '起きます': 'okimasu' } },

        // Basic Adjectives
        { name: "I-Adjectives 1", set: { '新しい': 'atarashii', '古い': 'furui', '良い': 'ii', '悪い': 'warui', '大きい': 'ookii', '小さい': 'chiisai' } },
        { name: "I-Adjectives 2", set: { '高い': 'takai', '安い': 'yasui', '面白い': 'omoshiroi', '美味しい': 'oishii', '忙しい': 'isogashii', '楽しい': 'tanoshii' } },
        { name: "Na-Adjectives", set: { '元気': 'genki', '綺麗': 'kirei', '親切': 'shinsetsu', '有名': 'yuumei', '便利': 'benri', '好き': 'suki' } },

        // Intermediate Vocabulary
        { name: "Body Parts", set: { '頭': 'atama', '顔': 'kao', '目': 'me', '耳': 'mimi', '鼻': 'hana', '口': 'kuchi', '手': 'te', '足': 'ashi' } },
        { name: "Transportation", set: { '電車': 'densha', '車': 'kuruma', '飛行機': 'hikouki', '地下鉄': 'chikatetsu', '駅': 'eki', '空港': 'kuukou' } },
        { name: "Advanced Nouns", set: { '仕事': 'shigoto', '電話': 'denwa', '映画': 'eiga', '音楽': 'ongaku', '写真': 'shashin', '友達': 'tomodachi' } }
    ],
    sentences: [
        // Basic Greetings & Phrases
        { name: "Greetings", set: { 'おはようございます': 'ohayou gozaimasu', 'こんにちは': 'konnichiwa', 'こんばんは': 'konbanwa', 'さようなら': 'sayounara', 'おやすみなさい': 'oyasuminasai' } },
        { name: "Common Phrases 1", set: { 'ありがとうございます': 'arigatou gozaimasu', 'すみません': 'sumimasen', 'ごめんなさい': 'gomennasai', 'お願いします': 'onegaishimasu' } },
        { name: "Self Introduction", set: { 'はじめまして': 'hajimemashite', '私の名前は...です': 'watashi no namae wa ... desu', 'どうぞよろしく': 'douzo yoroshiku' } },

        // Simple Questions
        { name: "Asking Questions 1", set: { 'お元気ですか': 'ogenki desu ka', 'これは何ですか': 'kore wa nan desu ka', '今何時ですか': 'ima nanji desu ka' } },
        { name: "Asking Questions 2", set: { 'どこですか': 'doko desu ka', 'いくらですか': 'ikura desu ka', 'どうしてですか': 'doushite desu ka' } },

        // Everyday Scenarios
        { name: "At a Restaurant", set: { 'メニューをください': 'menyuu o kudasai', 'お勘定をお願いします': 'okanjou o onegaishimasu', '美味しかったです': 'oishikatta desu' } },
        { name: "Shopping", set: { 'これをください': 'kore o kudasai', '試着してもいいですか': 'shichaku shite mo ii desu ka', 'クレジットカードは使えますか': 'kurejittokaado wa tsukaemasu ka' } },
        { name: "Getting Directions", set: { '駅はどこですか': 'eki wa doko desu ka', 'まっすぐ行ってください': 'massugu itte kudasai', '右に曲がってください': 'migi ni magatte kudasai' } },

        // Intermediate Sentences
        { name: "Expressing Likes & Dislikes", set: { '私は猫が好きです': 'watashi wa neko ga suki desu', '私はブロッコリーが嫌いです': 'watashi wa burokkorii ga kirai desu' } },
        { name: "Describing Things", set: { 'この本は面白いです': 'kono hon wa omoshiroi desu', 'その車は高いです': 'sono kuruma wa takai desu' } },
        { name: "Making Plans", set: { '明日映画を見に行きます': 'ashita eiga o mi ni ikimasu', '週末に何をしますか': 'shuumatsu ni nani o shimasu ka' } }
    ]
};

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
        'ア': 'A', 'イ': 'I', 'ウ': 'U', 'エ': 'E', 'オ': 'O',
        'カ': 'KA', 'キ': 'KI', 'ク': 'KU', 'ケ': 'KE', 'コ': 'KO',
        'サ': 'SA', 'シ': 'SHI', 'ス': 'SU', 'セ': 'SE', 'ソ': 'SO',
        'タ': 'TA', 'チ': 'CHI', 'ツ': 'TSU', 'テ': 'TE', 'ト': 'TO',
        'ナ': 'NA', 'ニ': 'NI', 'ヌ': 'NU', 'ネ': 'NE', 'ノ': 'NO',
        'ハ': 'HA', 'ヒ': 'HI', 'フ': 'FU', 'ヘ': 'HE', 'ホ': 'HO',
        'マ': 'MA', 'ミ': 'MI', 'ム': 'MU', 'メ': 'ME', 'モ': 'MO',
        'ヤ': 'YA', 'ユ': 'YU', 'ヨ': 'YO',
        'ラ': 'RA', 'リ': 'RI', 'ル': 'RU', 'レ': 'RE', 'ロ': 'RO',
        'ワ': 'WA', 'ヲ': 'WO',
        'ン': 'N_k'
    },
    katakana_dakuten: {
        'ガ': 'GA', 'ギ': 'GI', 'グ': 'GU', 'ゲ': 'GE', 'ゴ': 'GO',
        'ザ': 'ZA', 'ジ': 'JI', 'ズ': 'ZU', 'ゼ': 'ZE', 'ゾ': 'ZO',
        'ダ': 'DA', 'ヂ': 'DJI', 'ヅ': 'DZU', 'デ': 'DE', 'ド': 'DO',
        'バ': 'BA', 'ビ': 'BI', 'ブ': 'BU', 'ベ': 'BE', 'ボ': 'BO'
    },
    katakana_handakuten: {
        'パ': 'PA', 'ピ': 'PI', 'プ': 'PU', 'ペ': 'PE', 'ポ': 'PO'
    },
    kanji: {
        // Jouyou Kanji - Grade 1
        '一': 'ichi', '二': 'ni', '三': 'san', '四': 'shi', '五': 'go', '六': 'roku', '七': 'shichi', '八': 'hachi', '九': 'kyuu', '十': 'juu', '百': 'hyaku', '千': 'sen', '万': 'man', '円': 'en', '時': 'ji', '日': 'nichi', '月': 'getsu', '火': 'ka', '水': 'sui', '木': 'moku', '金': 'kin', '土': 'do', '曜': 'you', '上': 'ue', '下': 'shita', '中': 'naka', '半': 'han', '山': 'yama', '川': 'kawa', '元': 'gen', '気': 'ki', '天': 'ten', '私': 'watashi', '今': 'ima', '田': 'ta', '女': 'onna', '男': 'otoko', '見': 'mi', '行': 'i', '食': 'ta', '飲': 'no',
        // Jouyou Kanji - Grade 2
        '語': 'go', '本': 'hon', '学生': 'gakusei', '学校': 'gakkou', '先生': 'sensei', '友': 'tomo', '達': 'dachi', '何': 'nan', '毎': 'mai', '朝': 'asa', '昼': 'hiru', '晩': 'ban', '時': 'toki', '分': 'fun', '半': 'han', '国': 'kuni', '人': 'jin', '会': 'a', '社': 'sha', '員': 'in', '医': 'i', '者': 'sha', '大': 'dai', '学': 'gaku', '高': 'kou', '校': 'kou', '小': 'shou', '中': 'chuu', '電': 'den', '車': 'sha', '自': 'ji', '転': 'ten', '乗': 'no', '駅': 'eki', '銀': 'gin', '行': 'kou', '郵': 'yuu', '便': 'bin', '局': 'kyoku', '図': 'to', '書': 'sho', '館': 'kan', '映': 'ei', '画': 'ga', '右': 'migi', '左': 'hidari', '前': 'mae', '後': 'ushiro', '外': 'soto', '東': 'higashi', '西': 'nishi', '南': 'minami', '北': 'kita', '名': 'na', '前': 'mae', '父': 'chichi', '母': 'haha', '子': 'ko', '供': 'domo', '犬': 'inu', '猫': 'neko', '鳥': 'tori', '魚': 'sakana', '花': 'hana', '肉': 'niku', '野菜': 'yasai', '果物': 'kudamono', '水': 'mizu', '茶': 'cha', '牛': 'gyuu', '乳': 'nyuu', '来': 'ki', '帰': 'kae', '聞': 'ki', '読': 'yo', '書': 'ka', '話': 'hana', '買': 'ka', '起': 'o', '寝': 'ne', '見': 'mi', '勉': 'ben', '強': 'kyou', '働': 'hatara', '休': 'yasu', '言': 'i', '思': 'omo', '知': 'shi', '入': 'hai', '出': 'de', '待': 'ma', '作': 'tsuku', '使': 'tsuka', '会': 'a', '同': 'ona', '楽': 'tano', '好': 'su', '嫌': 'kira', '上手': 'jouzu', '下手': 'heta', '元': 'gen', '気': 'ki', '病': 'byou', '院': 'in', '薬': 'kusuri', '速': 'haya', '遅': 'oso', '近': 'chika', '遠': 'too', '広': 'hiro', '狭': 'sema', '明': 'aka', '暗': 'kura', '暑': 'atsu', '寒': 'samu', '暖': 'atata', '涼': 'suzu', '静': 'shizu', '賑': 'nigi', '有名': 'yuumei', '親切': 'shinsetsu', '便利': 'benri', '不便': 'fuben', '元気': 'genki', '綺麗': 'kirei', '汚': 'kitana', '可愛': 'kawaii', '赤': 'aka', '青': 'ao', '白': 'shiro', '黒': 'kuro', '色': 'iro', '春': 'haru', '夏': 'natsu', '秋': 'aki', '冬': 'fuyu', '雨': 'ame', '雪': 'yuki', '風': 'kaze', '晴': 'ha', '曇': 'kumo', '空': 'sora', '海': 'umi', '山': 'yama', '川': 'kawa', '池': 'ike', '庭': 'niwa', '店': 'mise', '駅': 'eki', '道': 'michi', '部屋': 'heya', '家': 'ie', '会社': 'kaisha', '電話': 'denwa', '番号': 'bangou', '机': 'tsukue', '椅子': 'isu', '鞄': 'kaban', '靴': 'kutsu', '鉛筆': 'enpitsu' },
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

let playerState = JSON.parse(localStorage.getItem('nihon-player-state')) || {
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    levels: {
        hiragana: 0,
        katakana: 0,
        kanji: 0,
        numbers: 0,
        words: 0,
        sentences: 0
    },
    unlockedAchievements: []
};

// Patch for existing users to add new level categories
if (playerState.levels.words === undefined) {
    playerState.levels.words = 0;
}
if (playerState.levels.sentences === undefined) {
    playerState.levels.sentences = 0;
}

function getXpForLevel(level) {
    return Math.floor(100 * Math.pow(1.2, level - 1));
}

function gainXP(amount) {
    playerState.xp += amount;
    while (playerState.xp >= playerState.xpToNextLevel) {
        playerState.level++;
        playerState.xp -= playerState.xpToNextLevel;
        playerState.xpToNextLevel = getXpForLevel(playerState.level);
        showToast("Player Level Up!", `You've reached level ${playerState.level}!`);
    }
    localStorage.setItem('nihon-player-state', JSON.stringify(playerState));
}

let currentCharset = {};
let currentQuizType = '';
let activeTooltip = null;
let skipQueue = [];

function getQuizState() {
    return currentQuizType;
}

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
    let items = Object.keys(currentCharset).filter(item => !skipQueue.includes(item));
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
    if (activeTooltip) {
        activeTooltip.dispose();
        activeTooltip = null;
    }
    updateHomeButton(false); // No section is active

    // Show install button if available and not installed
    if (deferredPrompt && installButton && !isSectionActive) {
        installButton.style.display = 'flex';
    }

    // Remove IME if it exists
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


function unlockAchievement(id) {
    if (!playerState.unlockedAchievements) {
        playerState.unlockedAchievements = [];
    }
    playerState.unlockedAchievements.push(id);
    localStorage.setItem('nihon-player-state', JSON.stringify(playerState));

    const achievement = achievements[id];
    showToast("Achievement Unlocked!", achievement.name);
}

function checkAchievements() {
    const unlocked = playerState.unlockedAchievements || [];

    for (const id in achievements) {
        if (unlocked.includes(id)) {
            continue; // Already unlocked
        }

        const achievement = achievements[id];
        const hasPrerequisites = achievement.requires.every(reqId => unlocked.includes(reqId));

        if (hasPrerequisites) {
            if (achievement.characters) { // Character-based achievement
                const characterSet = achievement.characters();
                const allMastered = Object.keys(characterSet).every(char => {
                    const p = progress[char];
                    return p && p.correct >= 5;
                });

                if (allMastered) {
                    unlockAchievement(id);
                }
            } else { // Prerequisite-based achievement (like Nihon Pro)
                unlockAchievement(id);
            }
        }
    }
}

function checkLevelUp(type) {
    // No level up for listening quiz as it's a mix of everything
    if (type === 'listening' || !characterLevels[type]) {
        return;
    }

    const userLevel = playerState.levels[type];
    const levelsForType = characterLevels[type];

    // Check if user is already at max level for this type
    if (userLevel >= levelsForType.length - 1) {
        return;
    }

    const currentLevelChars = Object.keys(levelsForType[userLevel].set);
    const allMastered = currentLevelChars.every(char => {
        const p = progress[char];
        // Mastery is defined as a streak of 3 or more.
        return p && p.streak >= 3;
    });

    if (allMastered) {
        playerState.levels[type]++;
        localStorage.setItem('nihon-player-state', JSON.stringify(playerState));
        const newLevelName = characterLevels[type][playerState.levels[type]].name;
        showToast("Topic Level Up!", `You've unlocked ${type}: ${newLevelName}!`);
    }
}

function startQuiz(type) {
    isSectionActive = true;
    currentQuizType = type;

    if (type === 'listening') {
        let allUnlockedChars = {};
        for (const charType in characterLevels) {
            const userLevel = playerState.levels[charType];
            const levelsForType = characterLevels[charType];
            for (let i = 0; i <= userLevel && i < levelsForType.length; i++) {
                Object.assign(allUnlockedChars, levelsForType[i].set);
            }
        }
        currentCharset = allUnlockedChars;
    } else {
        const userLevel = playerState.levels[type];
        const levelsForType = characterLevels[type];
        let charsForQuiz = {};
        // Always include the first level
        Object.assign(charsForQuiz, levelsForType[0].set);
        // Include all levels up to the user's current level
        for (let i = 1; i <= userLevel && i < levelsForType.length; i++) {
            Object.assign(charsForQuiz, levelsForType[i].set);
        }
        currentCharset = charsForQuiz;
    }

    initializeProgress(currentCharset);
    updateHomeButton(true); // A section is now active

    contentArea.innerHTML = `
        <div>
            <div class="card text-center shadow-sm">
                <div id="button-container" class="btn-group" style="position: absolute; top: 10px; right: 10px; z-index: 101;">
                    <!-- Buttons will be injected here -->
                </div>
                <div class="card-body">
                    <div id="feedback-area" class="mb-2" style="height: 24px;"></div>
                    <div id="char-display-container">
                        <h1 id="char-display" class="display-1"></h1>
                    </div>
                    <div id="example-word-area" class="mt-3"></div>
                    <div class="mb-3">
                        <input type="text" class="form-control text-center" id="answer-input" autocomplete="off" onkeypress="if(event.key === 'Enter') document.getElementById('check-button').click()">
                    </div>
                    <button class="btn btn-success" id="check-button">Check</button>
                    <button class="btn btn-secondary" id="skip-button">Skip</button>
                </div>
                <div id="help-card" class="card shadow-sm" style="display: none; position: absolute; top: 40px; right: 10px; width: 350px; z-index: 100; font-family: 'Noto Sans JP Embedded', sans-serif;">
                    <!-- Help content will be loaded here -->
                </div>
                <div id="hint-card" class="card shadow-sm bg-info text-white" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 200; padding: 1rem;">
                    <!-- Hint content will be loaded here -->
                </div>
            </div>
            <div id="kanji-suggestions" class="mt-2"></div>
        </div>
    `;

    const answerInput = document.getElementById('answer-input');
    answerInput.oninput = () => {
        replacekana(currentCharset, type);
    };

    loadQuestion(type);
}





function startFlashcardMode(type) {
    isSectionActive = true;

    const userLevel = playerState.levels[type];
    const levelsForType = characterLevels[type];
    let charsForQuiz = {};
    // Always include the first level
    Object.assign(charsForQuiz, levelsForType[0].set);
    // Include all levels up to the user's current level
    for (let i = 1; i <= userLevel && i < levelsForType.length; i++) {
        Object.assign(charsForQuiz, levelsForType[i].set);
    }
    currentCharset = charsForQuiz;

    initializeProgress(currentCharset);
    updateHomeButton(true); // A section is now active

    contentArea.innerHTML = `
        <div class="card text-center shadow-sm flashcard-container">
            <div id="button-container" class="btn-group" style="position: absolute; top: 10px; right: 10px; z-index: 101;">
                <!-- Buttons will be injected here -->
            </div>
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
            <div id="help-card" class="card shadow-sm" style="display: none; position: absolute; top: 40px; right: 10px; width: 350px; z-index: 100; font-family: 'Noto Sans JP Embedded', sans-serif;">
                <!-- Help content will be loaded here -->
            </div>
            <div id="hint-card" class="card shadow-sm bg-info text-white" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 200; padding: 1rem;">
                <!-- Hint content will be loaded here -->
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

    // Add audio and help buttons
    const buttonContainer = document.getElementById('button-container');
    let buttonsHTML = '';
    const filename = getAudioFilename(charToDisplay, type);
    if (filename) {
        buttonsHTML += `<button id="play-flashcard-audio" class="btn btn-secondary"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button>`;
    }
    buttonsHTML += `<button id="hint-button" class="btn btn-secondary"><img src="/nihon/icons/answer.png" alt="Hint" style="height: 1.5rem;"></button>`;
    const helpContent = getHelpContent(type);
    if (helpContent) {
        buttonsHTML += `<button id="help-icon" class="btn btn-secondary"><img src="/nihon/icons/help.png" alt="Help" style="height: 1.5rem;"></button>`;
    }
    buttonContainer.innerHTML = buttonsHTML;

    if (filename) {
        document.getElementById('play-flashcard-audio').onclick = () => {
            const audio = new Audio(`audio/${filename}.mp3`);
            audio.play().catch(e => console.error("Error playing audio:", e));
        };
    }

    document.getElementById('hint-button').onclick = () => {
        const hintCard = document.getElementById('hint-card');
        let correctAnswerText = '';
        if (type === 'numbers') {
            correctAnswerText = `${currentCharset[currentFlashcardChar].romaji} (${currentCharset[currentFlashcardChar].latin})`;
        } else {
            correctAnswerText = currentCharset[currentFlashcardChar];
        }
        hintCard.innerHTML = `<h5>${correctAnswerText}</h5>`;
        hintCard.style.display = 'block';
        setTimeout(() => {
            hintCard.style.display = 'none';
        }, 1500);
    };

    if (helpContent) {
        const helpIcon = document.getElementById('help-icon');
        const helpCard = document.getElementById('help-card');
        helpCard.innerHTML = `<div class="card-body">${helpContent}</div>`;

        helpIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            helpCard.style.display = helpCard.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', (event) => {
            if (!helpCard.contains(event.target) && !helpIcon.contains(event.target)) {
                helpCard.style.display = 'none';
            }
        });
    }

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
        gainXP(10);
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
    currentQuizType = 'listening';

    const userLevel = playerState.levels.listening || 0;
    const levelsForType = characterLevels.listening;
    let charsForQuiz = {};
    for (let i = 0; i <= userLevel && i < levelsForType.length; i++) {
        Object.assign(charsForQuiz, levelsForType[i].set);
    }
    currentCharset = charsForQuiz;

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
    answerInput.oninput = () => {
        replacekana(currentCharset, 'listening');
    };

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
        const audio = new Audio(`audio/${charToTest}.mp3`);
        audio.play().catch(e => console.error("Error playing audio:", e));
    };

    answerInput.focus();
}

function setupHomePageListeners() {
    document.getElementById('quizHiragana').addEventListener('click', () => startQuiz('hiragana'));
    document.getElementById('quizKatakana').addEventListener('click', () => startQuiz('katakana'));
    document.getElementById('quizKanji').addEventListener('click', () => startQuiz('kanji'));
    document.getElementById('quizNumbers').addEventListener('click', () => startQuiz('numbers'));
    document.getElementById('quizListening').addEventListener('click', () => startListeningQuiz());
    document.getElementById('quizWords').addEventListener('click', () => startQuiz('words'));
    document.getElementById('quizSentences').addEventListener('click', () => startQuiz('sentences'));

    document.getElementById('flashcardHiragana').addEventListener('click', () => startFlashcardMode('hiragana'));
    document.getElementById('flashcardKatakana').addEventListener('click', () => startFlashcardMode('katakana'));
    document.getElementById('flashcardKanji').addEventListener('click', () => startFlashcardMode('kanji'));
    document.getElementById('flashcardNumbers').addEventListener('click', () => startFlashcardMode('numbers'));
    document.getElementById('flashcardWords').addEventListener('click', () => startFlashcardMode('words'));
    document.getElementById('flashcardSentences').addEventListener('click', () => startFlashcardMode('sentences'));
}

function playReferenceAudio(filename) {
    if (!filename || filename === 'null') return;
    const audio = new Audio(`audio/${filename}.mp3`);
    audio.play().catch(e => console.error("Error playing audio:", e));
}



function getAudioFilename(char, type, charset) {
    const characterSet = charset || currentCharset; // Use provided charset or global
    if (!characterSet || !characterSet[char]) return null;

    let romajiString;

    // Step 1: Get the base romaji string based on the data structure for that type
    switch (type) {
        case 'words':
        case 'sentences':
            romajiString = characterSet[char];
            break;
        case 'listening':
            romajiString = char; // For listening quiz, the key itself is the romaji
            break;
        case 'numbers':
            romajiString = characterSet[char].romaji;
            break;
        default: // hiragana, katakana, kanji
            romajiString = characterSet[char];
            break;
    }

    if (typeof romajiString !== 'string') {
        return null;
    }

    // Step 2: Apply filename cleaning (lowercase, underscores, etc.)
    // Note: Katakana uses uppercase keys in create_audio.py, so we don't lowercase it.
    let filename = (type === 'katakana') ? romajiString : romajiString.toLowerCase();
    filename = filename.replace(/ /g, '_')
                       .replace(/\.\.\./g, 'desu')
                       .replace(/\?/g, '');

    // Step 3: Apply prefixes for single characters to avoid filename collisions
    switch (type) {
        case 'hiragana':
            filename = `h_${filename}`;
            break;
        case 'katakana':
            filename = `k_${filename}`;
            break;
        case 'kanji':
            filename = `kanji_${filename}`;
            break;
        case 'numbers':
            filename = `num_${filename}`;
            break;
    }

    return filename;
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
    const answerInput = document.getElementById('answer-input');
    
    document.getElementById('char-display').textContent = charToTest;

    // Add audio and help buttons
    const buttonContainer = document.getElementById('button-container');
    let buttonsHTML = '';
    const filename = getAudioFilename(charToTest, type);
    if (filename) {
        buttonsHTML += `<button id="play-char-audio" class="btn btn-secondary"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button>`;
    }
    buttonsHTML += `<button id="hint-button" class="btn btn-secondary"><img src="/nihon/icons/answer.png" alt="Hint" style="height: 1.5rem;"></button>`;
    const helpContent = getHelpContent(type);
    if (helpContent) {
        buttonsHTML += `<button id="help-icon" class="btn btn-secondary"><img src="/nihon/icons/help.png" alt="Help" style="height: 1.5rem;"></button>`;
    }
    buttonContainer.innerHTML = buttonsHTML;

    const handleButtonClick = (event, action) => {
        event.preventDefault();
        action();
        answerInput.focus();
    };

    if (filename) {
        document.getElementById('play-char-audio').addEventListener('click', (e) => handleButtonClick(e, () => {
            const audio = new Audio(`audio/${filename}.mp3`);
            audio.play().catch(e => console.error("Error playing audio:", e));
        }));
    }

    document.getElementById('hint-button').addEventListener('click', (e) => handleButtonClick(e, () => {
        const hintCard = document.getElementById('hint-card');
        hintCard.innerHTML = `<h5>${correctAnswer}</h5>`;
        hintCard.style.display = 'block';
        setTimeout(() => {
            hintCard.style.display = 'none';
        }, 1500);
    }));

    if (helpContent) {
        const helpIcon = document.getElementById('help-icon');
        const helpCard = document.getElementById('help-card');
        helpCard.innerHTML = `<div class="card-body">${helpContent}</div>`;

        helpIcon.addEventListener('click', (e) => handleButtonClick(e, () => {
            helpCard.style.display = helpCard.style.display === 'block' ? 'none' : 'block';
        }));

        document.addEventListener('click', (event) => {
            if (!helpCard.contains(event.target) && !helpIcon.contains(event.target)) {
                helpCard.style.display = 'none';
            }
        });
    }


    document.getElementById('feedback-area').innerHTML = '';

    const p = progress[charToTest];
    const isFirstTime = !p || !p.seen;
    const answeredWrongLastTime = p && p.lastAnswer === 'incorrect';

    if (isFirstTime || answeredWrongLastTime) {
        const charDisplay = document.getElementById('char-display');
        let tooltipTitle = '';
        if (isFirstTime) {
            tooltipTitle = `New character! Correct Answer: ${correctAnswer}`;
        } else { // answeredWrongLastTime
            tooltipTitle = `Let's try this one again! Correct Answer: ${correctAnswer}`;
        }
        const tooltip = new bootstrap.Tooltip(charDisplay, {
            title: tooltipTitle,
            placement: 'left',
            trigger: 'manual'
        });
        tooltip.show();
        activeTooltip = tooltip; // Store the active tooltip

        if (!p) {
            // Ensure progress object exists even if they just skip it
            progress[charToTest] = { correct: 0, incorrect: 0, streak: 0, nextReview: new Date().getTime() };
        }
        progress[charToTest].seen = true; // Mark as seen so hint doesn't show again
        localStorage.setItem('nihon-progress', JSON.stringify(progress));
    }
    document.getElementById('kanji-suggestions').innerHTML = '';
    
    answerInput.value = '';
    answerInput.readOnly = false;
    
    const checkButton = document.getElementById('check-button');
    checkButton.disabled = false;
    checkButton.onclick = () => checkAnswer(charToTest, correctAnswer, type);

    const skipButton = document.getElementById('skip-button');
    skipButton.onclick = () => {
        if (activeTooltip) {
            activeTooltip.dispose();
            activeTooltip = null;
        }

        // Add the character to the skip queue
        if (!skipQueue.includes(charToTest)) {
            skipQueue.push(charToTest);
            if (skipQueue.length > 5) { // Keep the queue size manageable
                skipQueue.shift();
            }
        }

        // Use a short timeout to prevent potential race conditions
        setTimeout(() => loadQuestion(type), 50);
    };

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
    if (activeTooltip) {
        activeTooltip.dispose();
        activeTooltip = null;
    }
    const answerInput = document.getElementById('answer-input');
    let userAnswer = answerInput.value.trim();
    const feedbackArea = document.getElementById('feedback-area');
    let now = new Date().getTime();
    let p = progress[char];

    // Convert user input to Romaji if Wanakana is enabled
    userAnswer = userAnswer;

    if (userAnswer === correctAnswer || userAnswer === char) {
        if (!p) {
            p = { correct: 0, incorrect: 0, streak: 0, nextReview: now };
            progress[char] = p;
        }
        p.correct++;
        p.streak = (p.streak || 0) + 1;
        p.lastAnswer = 'correct';
        p.nextReview = now + Math.pow(2, p.streak) * 60 * 60 * 1000; // Exponential backoff
        feedbackArea.innerHTML = `<span class="text-success">Correct!</span>`;
        gainXP(10);
        checkLevelUp(type);
        checkAchievements();
    } else {
        if (!p) {
            p = { correct: 0, incorrect: 0, streak: 0, nextReview: now };
            progress[char] = p;
        }
        p.incorrect++;
        p.streak = 0;
        p.lastAnswer = 'incorrect';
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

document.addEventListener('click', function(event) {
    const suggestionsContainer = document.getElementById('kanji-suggestions-card');
    const answerInput = document.getElementById('answer-input');

    // Check if the click is outside the suggestions container and the input field
    const isClickInsideSuggestions = suggestionsContainer && suggestionsContainer.contains(event.target);
    const isClickInsideInput = answerInput && answerInput.contains(event.target);

    if (suggestionsContainer && !isClickInsideSuggestions && !isClickInsideInput) {
        suggestionsContainer.remove();
    }
});

// --- Modal Focus Fix ---
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.focus();
    });
});

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
        const statsBody = statsModal.querySelector('.modal-body');
        // Remove old player stats if it exists to prevent duplication
        const oldPlayerStats = statsBody.querySelector('#player-stats');
        if (oldPlayerStats) {
            oldPlayerStats.remove();
        }

        const playerStatsDiv = document.createElement('div');
        playerStatsDiv.id = 'player-stats';
        playerStatsDiv.className = 'text-center mb-4';
        playerStatsDiv.innerHTML = `
            <h4>Player Level: ${playerState.level}</h4>
            <div class="progress" style="height: 20px;">
                <div class="progress-bar" role="progressbar" style="width: ${Math.round((playerState.xp / playerState.xpToNextLevel) * 100)}%;" aria-valuenow="${playerState.xp}" aria-valuemin="0" aria-valuemax="${playerState.xpToNextLevel}">
                    ${playerState.xp} / ${playerState.xpToNextLevel} XP
                </div>
            </div>
            <hr>
        `;
        const accordion = statsBody.querySelector('#statsAccordion');
        statsBody.insertBefore(playerStatsDiv, accordion);

        // Add Skill Levels display
        const oldSkillLevels = statsBody.querySelector('#skill-levels');
        if (oldSkillLevels) {
            oldSkillLevels.remove();
        }
        const skillLevelsDiv = document.createElement('div');
        skillLevelsDiv.id = 'skill-levels';
        skillLevelsDiv.className = 'mb-4';
        let skillLevelsHTML = '<h4 class="text-center">Skill Levels</h4><ul class="list-group">';
        for (const skill in playerState.levels) {
            const level = playerState.levels[skill];
            const skillName = skill.charAt(0).toUpperCase() + skill.slice(1);
            skillLevelsHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${skillName}
                    <span class="badge bg-primary rounded-pill">${level}</span>
                </li>
            `;
        }
        skillLevelsHTML += '</ul>';
        skillLevelsDiv.innerHTML = skillLevelsHTML;
        statsBody.insertBefore(skillLevelsDiv, accordion);
        statsBody.insertBefore(document.createElement('hr'), accordion);

        wrongCharsTableBody.innerHTML = ''; // Clear previous content
        correctCharsTableBody.innerHTML = ''; // Clear previous content

        // Add Achievements display
        const oldAchievementsSection = statsBody.querySelector('#achievements-section');
        if (oldAchievementsSection) {
            oldAchievementsSection.remove();
        }
        const achievementsSection = document.createElement('div');
        achievementsSection.id = 'achievements-section';
        achievementsSection.innerHTML = `
            <h4 class="text-center mt-4">Achievements</h4>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Achievement</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody id="achievements-table-body">
                </tbody>
            </table>
        `;
        statsBody.appendChild(achievementsSection);

        const achievementsTableBody = document.getElementById('achievements-table-body');
        const unlocked = playerState.unlockedAchievements || [];

        if (unlocked.length === 0) {
            achievementsTableBody.innerHTML = '<tr><td colspan="2">No achievements unlocked yet. Keep trying!</td></tr>';
        } else {
            unlocked.forEach(id => {
                const achievement = achievements[id];
                if (achievement) {
                    const row = achievementsTableBody.insertRow();
                    const nameCell = row.insertCell();
                    const descCell = row.insertCell();
                    nameCell.textContent = achievement.name;
                    descCell.textContent = achievement.description;
                }
            });
        }

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
        const playAudio = (text) => {
            const filename = text.toLowerCase().replace(/\s/g, '_').replace('?', '');
            const audio = new Audio(`audio/${filename}.mp3`);
            audio.play().catch(e => console.error("Error playing audio:", e));
        };

        const createAudioButton = (text) => {
            const button = document.createElement('button');
            button.className = 'btn btn-secondary btn-sm ms-2';
            button.innerHTML = '<i class="fas fa-volume-up"></i>';
            button.onclick = () => playAudio(text);
            return button;
        };

        const createPhraseItem = (text, romaji) => {
            const li = document.createElement('li');
            li.className = 'd-flex justify-content-between align-items-center mb-2';
            li.textContent = text;
            li.appendChild(createAudioButton(romaji));
            return li;
        };

        grammarBody.innerHTML = `
            <div class="accordion" id="grammarAccordion">
                <!-- Basic Sentence Structure -->
                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingOne"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne">Basic Sentence Structure</button></h2>
                    <div id="collapseOne" class="accordion-collapse collapse" data-bs-parent="#grammarAccordion">
                        <div class="accordion-body" style="font-family: 'Noto Sans JP Embedded', sans-serif;">
                            <p>The basic sentence structure in Japanese is <strong>Subject - Object - Verb (SOV)</strong>.</p>
                            <table class="table">
                                <tbody>
                                    <tr>
                                        <td>Example: 私はリンゴを食べます (Watashi wa ringo o tabemasu) - I eat an apple.</td>
                                        <td class="text-center"><button onclick="playReferenceAudio('watashi_wa_ringo_o_tabemasu')" class="btn btn-secondary btn-sm"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button></td>
                                    </tr>
                                </tbody>
                            </table>
                            <ul>
                                <li>私 (Watashi) - I (Subject)</li>
                                <li>リンゴ (ringo) - apple (Object)</li>
                                <li>を食べます (o tabemasu) - eat (Verb)</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <!-- Particles -->
                <div class="accordion-item">
                     <h2 class="accordion-header" id="headingTwo"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo">Particles</button></h2>
                     <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#grammarAccordion">
                        <div class="accordion-body" style="font-family: 'Noto Sans JP Embedded', sans-serif;">
                            <p>Particles are short words that indicate the function of a noun in a sentence.</p>
                            <ul>
                                <li><strong>は (wa)</strong>: Marks the topic of the sentence. <em>(Pronounced 'wa')</em></li>
                                <li><strong>が (ga)</strong>: Marks the subject of the sentence.</li>
                                <li><strong>を (o)</strong>: Marks the direct object. <em>(Pronounced 'o')</em></li>
                                <li><strong>に (ni)</strong>: Indicates location (existence), destination, or a specific time.</li>
                                <li><strong>で (de)</strong>: Indicates the location of an action.</li>
                            </ul>
                        </div>
                     </div>
                </div>
                <!-- Verb Conjugation -->
                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingThree"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree">Verb Conjugation</button></h2>
                    <div id="collapseThree" class="accordion-collapse collapse" data-bs-parent="#grammarAccordion">
                        <div class="accordion-body" style="font-family: 'Noto Sans JP Embedded', sans-serif;">
                            <p>Japanese verbs are conjugated based on their group. Here's a basic overview of the polite (ます/masu) form.</p>
                            <h6>Group 1 (u-verbs)</h6>
                            <table class="table">
                                <tbody>
                                    <tr>
                                        <td>Example: 読む (yomu) - to read -> 読み<strong>ます</strong> (yomi<strong>masu</strong>) - (I) read.</td>
                                        <td class="text-center"><button onclick="playReferenceAudio('yomimasu')" class="btn btn-secondary btn-sm"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button></td>
                                    </tr>
                                </tbody>
                            </table>
                            <h6>Group 2 (ru-verbs)</h6>
                             <table class="table">
                                <tbody>
                                    <tr>
                                        <td>Example: 食べる (taberu) - to eat -> 食べ<strong>ます</strong> (tabe<strong>masu</strong>) - (I) eat.</td>
                                        <td class="text-center"><button onclick="playReferenceAudio('tabemasu')" class="btn btn-secondary btn-sm"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button></td>
                                    </tr>
                                </tbody>
                            </table>
                            <h6>Group 3 (Irregular verbs)</h6>
                            <table class="table">
                                <tbody>
                                    <tr>
                                        <td>Example: する (suru) - to do -> <strong>します</strong> (<strong>shimasu</strong>) - (I) do.</td>
                                        <td class="text-center"><button onclick="playReferenceAudio('shimasu')" class="btn btn-secondary btn-sm"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <!-- I-Adjectives -->
                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingFour"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFour">I-Adjectives</button></h2>
                    <div id="collapseFour" class="accordion-collapse collapse" data-bs-parent="#grammarAccordion">
                        <div class="accordion-body" style="font-family: 'Noto Sans JP Embedded', sans-serif;">
                            <p>Adjectives ending in <strong>い (i)</strong> are called i-adjectives. They can be conjugated.</p>
                            <table class="table">
                                <tbody>
                                    <tr>
                                        <td><strong>Present:</strong> 新しい (atarashii) - new</td>
                                        <td class="text-center"><button onclick="playReferenceAudio('atarashii')" class="btn btn-secondary btn-sm"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Negative:</strong> 新しくない (atarashikunai) - not new</td>
                                        <td class="text-center"><button onclick="playReferenceAudio('atarashikunai')" class="btn btn-secondary btn-sm"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Past:</strong> 新しかった (atarashikatta) - was new</td>
                                        <td class="text-center"><button onclick="playReferenceAudio('atarashikatta')" class="btn btn-secondary btn-sm"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <!-- Na-Adjectives -->
                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingFive"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFive">Na-Adjectives</button></h2>
                    <div id="collapseFive" class="accordion-collapse collapse" data-bs-parent="#grammarAccordion">
                        <div class="accordion-body" style="font-family: 'Noto Sans JP Embedded', sans-serif;">
                            <p>Adjectives that require <strong>な (na)</strong> before a noun are na-adjectives. They use です (desu) for conjugation.</p>
                             <table class="table">
                                <tbody>
                                    <tr>
                                        <td><strong>Present:</strong> きれい (kirei) -> きれいです (kirei desu) - pretty</td>
                                        <td class="text-center"><button onclick="playReferenceAudio('kirei_desu')" class="btn btn-secondary btn-sm"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Negative:</strong> きれいじゃないです (kirei janai desu) - not pretty</td>
                                        <td class="text-center"><button onclick="playReferenceAudio('kirei_janai_desu')" class="btn btn-secondary btn-sm"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Past:</strong> きれいでした (kirei deshita) - was pretty</td>
                                        <td class="text-center"><button onclick="playReferenceAudio('kirei_deshita')" class="btn btn-secondary btn-sm"><img src="/nihon/icons/audio.png" alt="Play audio" style="height: 1.5rem;"></button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;;
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
    const katakanaTabPane = document.getElementById('katakana');
    const kanjiTabPane = document.getElementById('kanji');
    const numbersTabPane = document.getElementById('numbers');

    const combinedHiragana = { ...characterSets.hiragana, ...characterSets.dakuten, ...characterSets.handakuten };
    const combinedKatakana = { ...characterSets.katakana, ...characterSets.katakana_dakuten, ...characterSets.katakana_handakuten };

    hiraganaTabPane.innerHTML = generateCharacterCards(combinedHiragana, 'h_');
    katakanaTabPane.innerHTML = generateCharacterCards(combinedKatakana, 'k_');
    kanjiTabPane.innerHTML = generateCharacterCards(characterSets.kanji, 'kanji_');
    numbersTabPane.innerHTML = generateCharacterCards(characterSets.numbers, ''); // Numbers already have num_ in key
}

function generateCharacterCards(characterSet, prefix) {
    let html = '<div class="row row-cols-3 row-cols-md-4 row-cols-lg-5 g-2">';
    for (const char in characterSet) {
        let displayChar = char;
        let displayRomaji = characterSet[char];
        let latinNumber = '';
        let filename = '';

        if (characterSet === characterSets.numbers) {
            displayChar = char;
            latinNumber = characterSet[char].latin;
            displayRomaji = characterSet[char].romaji;
            filename = `num_${displayRomaji}`;
        } else {
            filename = `${prefix}${displayRomaji}`;
        }

        html += `
            <div class="col">
                <div class="card text-center h-100" onclick="playReferenceAudio('${filename}')" style="cursor: pointer;">
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
    isSectionActive = isSection; // Set the global flag

    if (isSection) {
        appTitle.innerHTML = '<img src="/nihon/icons/back.png" alt="Back" style="height: 1.5rem; vertical-align: middle;"> Back';
        appTitle.classList.add('back-button');
        appTitle.style.fontSize = ''; // Reset font size as image handles size
    } else {
        appTitle.textContent = 'Nihon';
        appTitle.classList.remove('back-button');
        appTitle.style.fontSize = '';
    }

    // Control install button visibility
    const installButton = document.getElementById('install-button');
    if (installButton) {
        if (deferredPrompt && !isSectionActive) {
            installButton.style.display = 'flex';
        } else {
            installButton.style.display = 'none';
        }
    }
}


homeButton.addEventListener('click', (event) => {
    event.preventDefault();
    if (isSectionActive) {
        showHomePage();
    }
});

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/nihon/sw.js')
            .then(reg => {
                reg.onupdatefound = () => {
                    const newWorker = reg.installing;
                    newWorker.onstatechange = () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showToast('Update Available', 'A new version is available.', true);
                        }
                    };
                };
            })
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}
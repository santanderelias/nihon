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
export const achievements = {
    'hiragana_apprentice': { name: 'Hiragana Apprentice', description: 'Answer all Hiragana vowels correctly 5 times.', requires: [], characters: () => characterLevels.hiragana[0].set },
    'hiragana_experienced': { name: 'Hiragana Experienced', description: 'Answer all basic Hiragana syllables correctly 5 times.', requires: ['hiragana_apprentice'], characters: () => { let sets = {}; for (let i = 0; i < 10; i++) { Object.assign(sets, characterLevels.hiragana[i].set); } return sets; } },
    'hiragana_master': { name: 'Hiragana Master', description: 'Answer all Hiragana characters correctly 5 times.', requires: ['hiragana_experienced'], characters: () => { let sets = {}; characterLevels.hiragana.forEach(level => Object.assign(sets, level.set)); return sets; } },
    'katakana_apprentice': { name: 'Katakana Apprentice', description: 'Answer all Katakana vowels correctly 5 times.', requires: [], characters: () => characterLevels.katakana[0].set },
    'katakana_experienced': { name: 'Katakana Experienced', description: 'Answer all basic Katakana syllables correctly 5 times.', requires: ['katakana_apprentice'], characters: () => { let sets = {}; for (let i = 0; i < 10; i++) { Object.assign(sets, characterLevels.katakana[i].set); } return sets; } },
    'katakana_master': { name: 'Katakana Master', description: 'Answer all Katakana characters correctly 5 times.', requires: ['katakana_experienced'], characters: () => { let sets = {}; characterLevels.katakana.forEach(level => Object.assign(sets, level.set)); return sets; } },
    'kanji_initiate_1': { name: 'Kanji Initiate (Grade 1)', description: 'Answer all Grade 1 Kanji correctly 5 times.', requires: [], characters: () => { let sets = {}; for (let i = 0; i < 4; i++) { Object.assign(sets, characterLevels.kanji[i].set); } return sets; } },
    'kanji_initiate_2': { name: 'Kanji Initiate (Grade 2)', description: 'Answer all Grade 2 Kanji correctly 5 times.', requires: ['kanji_initiate_1'], characters: () => { let sets = {}; for (let i = 4; i < characterLevels.kanji.length; i++) { Object.assign(sets, characterLevels.kanji[i].set); } return sets; } },
    'kanji_master': { name: 'Kanji Master', description: 'Answer all Kanji correctly 5 times.', requires: ['kanji_initiate_2'], characters: () => { let sets = {}; characterLevels.kanji.forEach(level => Object.assign(sets, level.set)); return sets; } },
    'accountant': { name: 'Accountant', description: 'Answer numbers 1-50 correctly 5 times.', requires: [], characters: () => { let sets = {}; for (let i = 0; i < 5; i++) { Object.assign(sets, characterLevels.numbers[i].set); } return sets; } },
    'comptroller': { name: 'Comptroller', description: 'Answer numbers 1-100 correctly 5 times.', requires: ['accountant'], characters: () => { let sets = {}; characterLevels.numbers.forEach(level => Object.assign(sets, level.set)); return sets; } },
    'nihon_pro': { name: 'Nihon Pro', description: 'Achieve Master level in all categories.', requires: ['hiragana_master', 'katakana_master', 'kanji_master', 'comptroller'] },
    'listening_apprentice': { name: 'Listening Apprentice', description: 'Master the first 3 listening levels.', requires: [], characters: () => { let sets = {}; for (let i = 0; i < 3; i++) { Object.assign(sets, characterLevels.listening[i].set); } return sets; } },
    'sharp_ears': { name: 'Sharp Ears', description: 'Master all single-character listening levels.', requires: ['listening_apprentice'], characters: () => { let sets = {}; for (let i = 0; i < 4; i++) { Object.assign(sets, characterLevels.listening[i].set); } return sets; } },
    'fluent_speaker': { name: 'Fluent Speaker', description: 'Master all listening levels.', requires: ['sharp_ears'], characters: () => { let sets = {}; characterLevels.listening.forEach(level => Object.assign(sets, level.set)); return sets; } },
    'word_smith': { name: 'Word Smith', description: 'Master all word-based listening levels.', requires: ['sharp_ears'], characters: () => { let sets = {}; for (let i = 4; i < 8; i++) { Object.assign(sets, characterLevels.listening[i].set); } return sets; } },
    'sentence_scholar': { name: 'Sentence Scholar', description: 'Master all sentence-based listening levels.', requires: ['word_smith'], characters: () => { let sets = {}; for (let i = 8; i < characterLevels.listening.length; i++) { Object.assign(sets, characterLevels.listening[i].set); } return sets; } },
    'word_novice': { name: 'Word Novice', description: 'Master the first two levels of words.', requires: [], characters: () => { let sets = {}; for (let i = 0; i < 2; i++) { Object.assign(sets, characterLevels.words[i].set); } return sets; } },
    'word_scholar': { name: 'Word Scholar', description: 'Master all word levels.', requires: ['word_novice'], characters: () => { let sets = {}; characterLevels.words.forEach(level => Object.assign(sets, level.set)); return sets; } },
    'sentence_starter': { name: 'Sentence Starter', description: 'Master the first two levels of sentences.', requires: [], characters: () => { let sets = {}; for (let i = 0; i < 2; i++) { Object.assign(sets, characterLevels.sentences[i].set); } return sets; } },
    'sentence_virtuoso': { name: 'Sentence Virtuoso', description: 'Master all sentence levels.', requires: ['sentence_starter'], characters: () => { let sets = {}; characterLevels.sentences.forEach(level => Object.assign(sets, level.set)); return sets; } },
    'polyglot': { name: 'Polyglot', description: 'Achieve master level in both words and sentences.', requires: ['word_scholar', 'sentence_virtuoso'] }
};

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
        { name: "Kanji Time & Question Words", set: { '去年': 'kyonen', '毎': 'mai', '何': 'nani', '誰': 'dare', '何処': 'doko', '何時': 'itsu', '何故': 'naze', '如何': 'dou', '一': 'hito' } }
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
        { name: "Hiragana Vowels", set: { 'a': 'a', 'i': 'i', 'u': 'u', 'e': 'e', 'o': 'o' } },
        { name: "Hiragana K-Group", set: { 'ka': 'ka', 'ki': 'ki', 'ku': 'ku', 'ke': 'ke', 'ko': 'ko' } },
        { name: "Hiragana S-Group", set: { 'sa': 'sa', 'shi': 'shi', 'su': 'su', 'se': 'se', 'so': 'so' } },
        { name: "Katakana Vowels", set: { 'A': 'A', 'I': 'I', 'U': 'U', 'E': 'E', 'O': 'O' } },
        { name: "Common Nouns 1", set: { 'neko': 'neko', 'inu': 'inu', 'sushi': 'sushi', 'sensei': 'sensei', 'gakkou': 'gakkou' } },
        { name: "Common Nouns 2", set: { 'pen': 'pen', 'hon': 'hon', 'tsukue': 'tsukue', 'isu': 'isu', 'kuruma': 'kuruma' } },
        { name: "Common Verbs", set: { 'tabemasu': 'tabemasu', 'nomimasu': 'nomimasu', 'ikimasu': 'ikimasu', 'mimasu': 'mimasu' } },
        { name: "Common Adjectives", set: { 'oishii': 'oishii', 'ookii': 'ookii', 'chiisai': 'chiisai', 'hayai': 'hayai' } },
        { name: "Basic Sentences 1", set: { 'kore wa pen desu': 'kore wa pen desu', 'sore wa hon desu': 'sore wa hon desu' } },
        { name: "Basic Sentences 2", set: { 'eki wa doko desu ka': 'eki wa doko desu ka', 'watashi wa gakusei desu': 'watashi wa gakusei desu' } }
    ],
    words: [
        { name: "People & Places", set: { '人': 'hito', '男': 'otoko', '女': 'onna', '家族': 'kazoku', '日本': 'nihon', '東京': 'tokyo', '店': 'mise' } },
        { name: "Food & Drink", set: { '食べ物': 'tabemono', '飲み物': 'nomimono', 'ご飯': 'gohan', 'パン': 'pan', '水': 'mizu', 'お茶': 'ocha', '牛乳': 'gyuunyuu' } },
        { name: "Everyday Objects", set: { '家': 'ie', '部屋': 'heya', '椅子': 'isu', '机': 'tsukue', '本': 'hon', '鉛筆': 'enpitsu', '時計': 'tokei' } },
        { name: "Time & Weather", set: { '今日': 'kyou', '明日': 'ashita', '昨日': 'kinou', '時間': 'jikan', '天気': 'tenki', '雨': 'ame', '晴れ': 'hare' } },
        { name: "Action Verbs 1", set: { '見ます': 'mimasu', '食べます': 'tabemasu', '飲みます': 'nomimasu', '買います': 'kaimasu', '行きます': 'ikimasu', '帰ります': 'kaerimasu' } },
        { name: "Action Verbs 2", set: { '読みます': 'yomimasu', '書きます': 'kakimasu', '聞きます': 'kikimasu', '話します': 'hanashimasu', '寝ます': 'nemasu', '起きます': 'okimasu' } },
        { name: "I-Adjectives 1", set: { '新しい': 'atarashii', '古い': 'furui', '良い': 'ii', '悪い': 'warui', '大きい': 'ookii', '小さい': 'chiisai' } },
        { name: "I-Adjectives 2", set: { '高い': 'takai', '安い': 'yasui', '面白い': 'omoshiroi', '美味しい': 'oishii', '忙しい': 'isogashii', '楽しい': 'tanoshii' } },
        { name: "Na-Adjectives", set: { '元気': 'genki', '綺麗': 'kirei', '親切': 'shinsetsu', '有名': 'yuumei', '便利': 'benri', '好き': 'suki' } },
        { name: "Body Parts", set: { '頭': 'atama', '顔': 'kao', '目': 'me', '耳': 'mimi', '鼻': 'hana', '口': 'kuchi', '手': 'te', '足': 'ashi' } },
        { name: "Transportation", set: { '電車': 'densha', '車': 'kuruma', '飛行機': 'hikouki', '地下鉄': 'chikatetsu', '駅': 'eki', '空港': 'kuukou' } },
        { name: "Advanced Nouns", set: { '仕事': 'shigoto', '電話': 'denwa', '映画': 'eiga', '音楽': 'ongaku', '写真': 'shashin', '友達': 'tomodachi' } }
    ],
    sentences: [
        { name: "Greetings", set: { 'おはようございます': 'ohayou gozaimasu', 'こんにちは': 'konnichiwa', 'こんばんは': 'konbanwa', 'さようなら': 'sayounara', 'おやすみなさい': 'oyasuminasai' } },
        { name: "Common Phrases 1", set: { 'ありがとうございます': 'arigatou gozaimasu', 'すみません': 'sumimasen', 'ごめんなさい': 'gomennasai', 'お願いします': 'onegaishimasu' } },
        { name: "Self Introduction", set: { 'はじめまして': 'hajimemashite', '私の名前は...です': 'watashi no namae wa ... desu', 'どうぞよろしく': 'douzo yoroshiku' } },
        { name: "Asking Questions 1", set: { 'お元気ですか': 'ogenki desu ka', 'これは何ですか': 'kore wa nan desu ka', '今何時ですか': 'ima nanji desu ka' } },
        { name: "Asking Questions 2", set: { 'どこですか': 'doko desu ka', 'いくらですか': 'ikura desu ka', 'どうしてですか': 'doushite desu ka' } },
        { name: "At a Restaurant", set: { 'メニューをください': 'menyuu o kudasai', 'お勘定をお願いします': 'okanjou o onegaishimasu', '美味しかったです': 'oishikatta desu' } },
        { name: "Shopping", set: { 'これをください': 'kore o kudasai', '試着してもいいですか': 'shichaku shite mo ii desu ka', 'クレジットカードは使えますか': 'kurejittokaado wa tsukaemasu ka' } },
        { name: "Getting Directions", set: { '駅はどこですか': 'eki wa doko desu ka', 'まっすぐ行ってください': 'massugu itte kudasai', '右に曲がってください': 'migi ni magatte kudasai' } },
        { name: "Expressing Likes & Dislikes", set: { '私は猫が好きです': 'watashi wa neko ga suki desu', '私はブロッコリーが嫌いです': 'watashi wa burokkorii ga kirai desu' } },
        { name: "Describing Things", set: { 'この本は面白いです': 'kono hon wa omoshiroi desu', 'その車は高いです': 'sono kuruma wa takai desu' } },
        { name: "Making Plans", set: { '明日映画を見に行きます': 'ashita eiga o mi ni ikimasu', '週末に何をしますか': 'shuumatsu ni nani o shimasu ka' } }
    ]
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
    switch (quizType) {
        case 'hiragana':
        case 'katakana':
            return `<h5>Dakuten (゛)</h5><p>The dakuten diacritic is used to change the consonant sound of a syllable.</p><ul class="list-group"><li class="list-group-item">K (か) → G (が)</li><li class="list-group-item">S (さ) → Z (ざ)</li><li class="list-group-item">T (た) → D (だ)</li><li class="list-group-item">H (は) → B (ば)</li></ul><h5 class="mt-3">Handakuten (゜)</h5><p>The handakuten diacritic is used to change the consonant sound of the H-syllables.</p><ul class="list-group"><li class="list-group-item">H (は) → P (ぱ)</li></ul>`;
        case 'kanji':
            return `<h5>Kanji Help</h5><p>Kanji are logographic characters, where each character represents a word or idea. They often have multiple readings:</p><ul><li><strong>On'yomi (音読み):</strong> The Chinese reading, often used in compound words.</li><li><strong>Kun'yomi (訓読み):</strong> The native Japanese reading, often used for single-character words.</li></ul><p>The IME at the bottom right will help you find the right Kanji by typing its reading.</p>`;
        case 'numbers':
            return `<h5>Numbers Help</h5><p>Japanese numbers follow a logical system. After 10, they are formed by combining the numbers.</p><p>For example:</p><ul><li><strong>11</strong> is 十一 (juu-ichi) which is 10 + 1.</li><li><strong>20</strong> is 二十 (ni-juu) which is 2 * 10.</li><li><strong>21</strong> is 二十一 (ni-juu-ichi) which is 2 * 10 + 1.</li></ul><p>Use the IME to type the Romaji reading (e.g., "san") to get the Kanji (三).</p>`;
        case 'words':
        case 'sentences':
            return `<h5>Vocabulary & Sentence Help</h5><p>For these quizzes, you need to provide the correct Romaji reading for the Japanese word or sentence shown.</p><p>The IME will help you find the correct Japanese characters if you get stuck, but the goal is to type the reading directly.</p><p>Pay attention to particles (は, を, が) and verb endings!</p>`;
        default:
            return '';
    }
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

export function setDarkMode(isDark) {
    const htmlElement = document.documentElement;
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    htmlElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('darkMode', isDark);
    if (themeToggleIcon) {
        themeToggleIcon.src = isDark ? '/nihon/icons/theme_dark.png' : '/nihon/icons/theme_light.png';
        themeToggleIcon.alt = isDark ? 'Dark Theme Icon' : 'Light Theme Icon';
    }
}

export function checkDevMode() {
    const devToolsButton = document.getElementById('dev-tools-button');
    if (localStorage.getItem('nihon-dev-mode') === 'true') {
        if (devToolsButton) devToolsButton.style.display = 'block';
    } else {
        if (devToolsButton) devToolsButton.style.display = 'none';
    }
}

import { startQuiz, loadQuestion as loadQuizQuestion } from './quiz.js';
import { startFlashcardMode, flipFlashcard, checkFlashcardAnswer } from './flashcards.js';
import {
    state,
    playerState,
    progress,
    patchPlayerState,
    checkDevMode,
    showHomePage,
    setupDictionaryPromise,
    loadDictionary,
    setDarkMode,
    updateHomeButton,
    showToast,
    checkAnswer,
    populateStatsModal,
    populateReferencesModal,
    playReferenceAudio,
    backupProgress,
    restoreProgress,
    searchDictionary,
    getAudioFilename
} from './script.js';

function setupHomePageListeners() {
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
    // document.getElementById('flashcardListening').addEventListener('click', () => startFlashcardMode('listening'));
    document.getElementById('flashcardWords').addEventListener('click', () => startFlashcardMode('words'));
    document.getElementById('flashcardSentences').addEventListener('click', () => startFlashcardMode('sentences'));
}

document.addEventListener('DOMContentLoaded', () => {
    // Initial setup
    patchPlayerState();
    checkDevMode();
    showHomePage();
    setupDictionaryPromise();
    loadDictionary();
    setupHomePageListeners();

    // --- Global Event Listeners ---

    // Global click listener for dynamic content
    document.addEventListener('click', (event) => {
        const target = event.target;
        const quizContent = target.closest('.card-body');

        if (target.id === 'check-button' && quizContent) {
            const charDisplay = document.getElementById('char-display');
            const charToTest = charDisplay ? charDisplay.textContent : null;
            if (charToTest) {
                const correctAnswer = (state.currentQuizType === 'numbers') ? state.currentCharset[charToTest].romaji : state.currentCharset[charToTest];
                // Pass the function to load the next question as a callback to break circular dependency
                checkAnswer(charToTest, correctAnswer, state.currentQuizType, () => loadQuizQuestion(state.currentQuizType));
            }
        }

        if (target.id === 'flip-button' || target.closest('.flashcard')) {
            flipFlashcard();
        }
        if (target.id === 'true-button') {
            checkFlashcardAnswer(true);
        }
        if (target.id === 'false-button') {
            checkFlashcardAnswer(false);
        }

        if (target.closest('#play-char-audio')) {
            const charDisplay = document.getElementById('char-display');
            const charToTest = charDisplay ? charDisplay.textContent : null;
            const filename = getAudioFilename(charToTest, state.currentQuizType);
            if (filename) new Audio(`audio/${filename}.mp3`).play();
        }
    });

    // Modal listeners
    const statsModal = document.getElementById('stats-modal');
    if (statsModal) statsModal.addEventListener('show.bs.modal', populateStatsModal);

    const referencesModal = document.getElementById('references-modal');
    if (referencesModal) referencesModal.addEventListener('show.bs.modal', populateReferencesModal);

    const dictionarySearchButton = document.getElementById('dictionary-search-button');
    const dictionarySearchInput = document.getElementById('dictionary-search-input');
    if (dictionarySearchButton && dictionarySearchInput) {
        const triggerSearch = () => {
            const searchTerm = dictionarySearchInput.value.trim();
            if (searchTerm) searchDictionary(searchTerm);
        };
        dictionarySearchButton.addEventListener('click', triggerSearch);
        dictionarySearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') triggerSearch();
        });
    }

    // Dev Tools listeners
    const devResetButton = document.getElementById('dev-reset-button');
    if (devResetButton) devResetButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all progress?')) {
            localStorage.clear();
            window.location.reload();
        }
    });
    const devBackupButton = document.getElementById('dev-backup-button');
    if (devBackupButton) devBackupButton.addEventListener('click', backupProgress);
    const devRestoreButton = document.getElementById('dev-restore-button');
    if (devRestoreButton) devRestoreButton.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (file) restoreProgress(file);
        };
        fileInput.click();
    });

    // Other listeners from original script
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

    const homeButton = document.getElementById('home-button');
    if (homeButton) {
        homeButton.addEventListener('click', (event) => {
            event.preventDefault();
            if (state.isSectionActive) {
                showHomePage();
                setupHomePageListeners();
            }
        });
    }
});

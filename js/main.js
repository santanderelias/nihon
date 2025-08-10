import { startQuiz } from './quiz.js';
import { startFlashcardMode } from './flashcards.js';
import {
    state,
    patchPlayerState,
    checkDevMode,
    showHomePage,
    setupDictionaryPromise,
    loadDictionary,
    setDarkMode,
    updateHomeButton,
    showToast
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
    document.getElementById('flashcardListening').addEventListener('click', () => startFlashcardMode('listening'));
    document.getElementById('flashcardWords').addEventListener('click', () => startFlashcardMode('words'));
    document.getElementById('flashcardSentences').addEventListener('click', () => startFlashcardMode('sentences'));
}

document.addEventListener('DOMContentLoaded', () => {
    patchPlayerState();
    checkDevMode();
    showHomePage();
    setupDictionaryPromise();
    loadDictionary();

    // Setup home page listeners after the page is shown
    setupHomePageListeners();

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
                // Re-attach listeners after showing home page
                setupHomePageListeners();
            }
        });
    }

    // ... (Add other global event listeners from the old script.js if they exist)
});

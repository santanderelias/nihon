import { startQuiz, loadQuestion as loadQuizQuestion } from './quiz.js';
import { startFlashcardMode, flipFlashcard, checkFlashcardAnswer } from './flashcards.js';
import {
    state,
    updateHomeButton,
    patchPlayerState,
    checkDevMode,
    setupDictionaryPromise,
    loadDictionary,
    setDarkMode,
    showToast,
    checkAnswer,
    populateStatsModal,
    populateReferencesModal,
    searchDictionary,
    backupProgress,
    restoreProgress
} from './script.js';

function setupHomePageListeners() {
    document.getElementById('quizHiragana').addEventListener('click', () => startQuiz('hiragana'));
    document.getElementById('quizKatakana').addEventListener('click', () => startQuiz('katakana'));
    document.getElementById('quizKanji').addEventListener('click', () => startQuiz('kanji'));
    document.getElementById('quizNumbers').addEventListener('click', () => startQuiz('numbers'));
    document.getElementById('quizWords').addEventListener('click', () => startQuiz('words'));
    document.getElementById('quizSentences').addEventListener('click', () => startQuiz('sentences'));

    document.getElementById('flashcardHiragana').addEventListener('click', () => startFlashcardMode('hiragana'));
    document.getElementById('flashcardKatakana').addEventListener('click', () => startFlashcardMode('katakana'));
    document.getElementById('flashcardKanji').addEventListener('click', () => startFlashcardMode('kanji'));
    document.getElementById('flashcardNumbers').addEventListener('click', () => startFlashcardMode('numbers'));
    document.getElementById('flashcardWords').addEventListener('click', () => startFlashcardMode('words'));
    document.getElementById('flashcardSentences').addEventListener('click', () => startFlashcardMode('sentences'));
}

function showHomePage() {
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

    // Attach listeners AFTER the content has been created
    setupHomePageListeners();
}

document.addEventListener('DOMContentLoaded', () => {
    // Initial setup
    patchPlayerState();
    checkDevMode();
    setupDictionaryPromise();
    loadDictionary();

    // Show the home page, which will in turn set up its own listeners
    showHomePage();

    // --- Global Event Listeners ---
    // ... (The rest of the file remains the same)
});

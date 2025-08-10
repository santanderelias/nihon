# Nihon - Japanese Language Learning App

Nihon is a comprehensive Progressive Web App (PWA) for learning the Japanese language. It offers a modern, gamified experience to help users master everything from basic characters to complex sentences.

## Features

- **Multiple Learning Modes:**
    - **Quiz Mode:** Test your knowledge with interactive quizzes.
    - **Flashcard Mode:** Reinforce your memory with classic flashcards.

- **Comprehensive Learning Sections:**
    - **Hiragana & Katakana:** Master the fundamental Japanese syllabaries.
    - **Kanji:** Learn essential logographic characters, starting from Grade 1.
    - **Numbers:** Practice counting and reading Japanese numerals.
    - **Vocabulary:** Build your lexicon with common words.
    - **Sentences:** Understand basic sentence structure and common phrases.
    - **Listening Comprehension:** Train your ear to recognize Japanese sounds, words, and sentences.

- **Intelligent Learning System:**
    - **Spaced Repetition System (SRS):** The app uses a weighted algorithm to prioritize items you find difficult, optimizing your study time.
    - **Tooltip Hints:** For new characters or items you've struggled with, a helpful tooltip provides the answer to guide your learning.

- **Gamification & Progress Tracking:**
    - **XP & Leveling System:** Gain experience points (XP) for correct answers and level up your profile.
    - **Achievements:** Unlock achievements for mastering different learning categories.
    - **Detailed Statistics:** Track your performance with detailed stats on correct/incorrect answers, allowing you to identify areas for improvement.

- **Integrated Tools:**
    - **Built-in Dictionary:** A powerful, offline-first dictionary to look up words on the fly.
    - **Japanese IME:** An integrated Input Method Editor that converts Romaji to Hiragana or Katakana, making it easy to type answers.
    - **Audio Pronunciation:** Listen to native audio pronunciations for characters, words, and example sentences.

- **Modern App Experience:**
    - **Progressive Web App (PWA):** Installable on any device for a native app-like experience with full offline capabilities.
    - **Dark Mode:** Switch between light and dark themes for comfortable viewing.
    - **Reference Guides:** Quick access to Hiragana, Katakana, and Kanji charts, as well as a grammar reference section.

## Technical Details

- **Frontend:** Built with vanilla HTML, CSS, and JavaScript, using the Bootstrap framework for a responsive UI.
- **Offline Support:** A Service Worker caches all essential assets, including the dictionary and audio files, for a seamless offline experience.
- **Libraries:**
    - **Wanakana.js:** For robust Romaji-to-Kana conversion.
    - **Popper.js:** For interactive tooltips.
    - **Bootstrap:** For UI components and styling.

## Testing

This project uses Playwright for end-to-end testing.

### Setup

1.  Install the project dependencies:
    ```bash
    npm install
    ```

2.  Install the Playwright browsers:
    ```bash
    npx playwright install
    ```

### Running the Tests

1.  Start the local development server:
    ```bash
    npm start
    ```

2.  In a separate terminal, run the tests:

    -   To run all tests:
        ```bash
        npm test
        ```

    -   To run a specific set of tests (e.g., only the quiz feature):
        ```bash
        npm test -- --grep "Quiz"
        ```
        You can replace `"Quiz"` with `"Flashcards"` or `"Modals"` to run other specific tests.
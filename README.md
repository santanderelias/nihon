# Nihon - Japanese Language Learning App

Nihon is a web application designed to help users learn and practice Japanese characters, including Hiragana, Katakana, Kanji, and numbers. The app features a personalized quiz system that adapts to the user's learning progress.

## Core Features

*   **Quizzes:** The application provides quizzes for learning Japanese characters. The quiz types include:
    *   Hiragana
    *   Katakana
    *   Kanji
    *   Dakuten and Handakuten (modified characters)
    *   Numbers (1-100)
*   **Personalized Learning:** The app uses a weighted system to prioritize characters that the user has answered incorrectly, providing more practice on difficult characters.
*   **Example Words:** For each character in a quiz, an example word is shown with its reading and meaning, providing context.
*   **Dictionary:** A built-in dictionary allows users to search for Japanese words.
*   **Romaji to Japanese Conversion:** The app uses the `wanakana.js` library to automatically convert Romaji input to Hiragana or Katakana in the quiz and dictionary search.
*   **Dark Mode:** The application has a dark mode option for user comfort.
*   **Progress Tracking:** The app tracks correct and incorrect answers for each character and displays statistics.
*   **PWA (Progressive Web App):** The application can be installed on a device for an app-like experience with offline access.
*   **Settings:**
    *   Enable/disable Developer Mode (loads `script.js` instead of `script.min.js`).
    *   Enable/disable Wanakana for input conversion.
    *   Check for updates.
    *   Clear all progress data.
    *   Reset the app completely (clears data, caches, and service workers).
    *   Uninstall the app.

## Technical Details

*   **Frontend:** The application is built with HTML, CSS, and JavaScript. It uses the Bootstrap framework for styling.
*   **Service Worker:** A service worker is used for caching application files for offline use and to manage updates.
*   **Dictionary Data:** The dictionary data is stored in multiple JavaScript files (`dict-*.js`) and is loaded into an IndexedDB for efficient searching.
*   **Wanakana.js:** This library is used for converting Romaji to Kana.

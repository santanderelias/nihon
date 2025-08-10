const fs = require('fs');
const path = require('path');

// Helper function to load and execute a script in the JSDOM environment
const loadScript = (filePath) => {
  try {
    const scriptContent = fs.readFileSync(path.resolve(__dirname, filePath), 'utf-8');
    const scriptEl = document.createElement('script');
    scriptEl.textContent = scriptContent;
    document.head.appendChild(scriptEl);
  } catch (error) {
    console.error(`Failed to load script: ${filePath}`, error);
  }
};

describe('Nihon App JavaScript Logic', () => {
  beforeAll(() => {
    // Load the HTML structure from index.html
    const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');
    document.documentElement.innerHTML = html;

    // Mock bootstrap modal since we are not in a real browser
    // This prevents errors when the script tries to initialize modals
    window.bootstrap = {
      Modal: class {},
      Toast: class {
        constructor() {
          this.show = jest.fn();
        }
      },
    };

    // Load vendor and application scripts in the correct order
    loadScript('./js/wanakana.min.js');
    loadScript('./js/script.js');
    loadScript('./js/quiz.js');
    loadScript('./js/flashcards.js');
    loadScript('./js/listening.js');

    // Manually trigger DOMContentLoaded since JSDOM doesn't do this for our manual script loading
    document.dispatchEvent(new Event('DOMContentLoaded', {
      bubbles: true,
      cancelable: true,
    }));
  });

  // Test for Bug 1 & 2: playerState is not defined
  describe('Initialization and Global State', () => {
    it('should not throw "playerState is not defined" when starting a quiz', () => {
      expect(() => {
        window.startQuiz('hiragana');
      }).not.toThrow();
    });

    it('should not throw "playerState is not defined" when starting flashcards', () => {
      expect(() => {
        window.startFlashcardMode('katakana');
      }).not.toThrow();
    });
  });

  // Test for Bug 3: cannot set properties of null (setting 'innerHTML')
  describe('populateStatsModal', () => {
    it('should correctly populate the stats modal without throwing an error', () => {
      // The function is called on modal show. We can call it directly to test.
      expect(() => {
        window.populateStatsModal();
      }).not.toThrow();

      // Check if the content is there. This verifies the fix.
      const statsBody = document.querySelector('#stats-modal .modal-body');
      expect(statsBody.innerHTML).toContain('player-stats');
      expect(statsBody.innerHTML).toContain('skill-levels');
      expect(statsBody.innerHTML).toContain('statsAccordion');
      expect(statsBody.innerHTML).toContain('wrong-chars-table-body');
      expect(statsBody.innerHTML).toContain('correct-chars-table-body');
    });
  });

  // Test for Bug 4: setupReferencesListeners is not defined
  describe('populateReferencesModal', () => {
    it('should not throw "setupReferencesListeners is not defined" error when switching tabs', () => {
      const referencesModal = document.getElementById('references-modal');
      const katakanaTab = document.getElementById('katakana-tab');

      // The function that sets up the listeners is called when the modal is shown.
      // We simulate this by dispatching the 'show.bs.modal' event.
      // The original bug was in the 'shown.bs.tab' event listener which is set up inside populateReferencesModal.
      expect(() => {
        referencesModal.dispatchEvent(new Event('show.bs.modal'));

        // Now, we simulate the user clicking on a different tab.
        // If the listener was not set up correctly, this would throw an error.
        katakanaTab.dispatchEvent(new Event('shown.bs.tab', { bubbles: true, target: katakanaTab }));

      }).not.toThrow();
    });
  });
});

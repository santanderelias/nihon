/// <reference types="cypress" />

describe('Nihon App E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  context('Smoke Tests & JavaScript Fix Verification', () => {
    it('should load the homepage and display learning sections', () => {
      cy.contains('h2', 'Learning Sections').should('be.visible');
      cy.get('.card').should('have.length', 7);
    });

    it('should start a hiragana quiz, verifying the playerState fix', () => {
      cy.get('#quizHiragana').click();
      cy.get('#char-display').should('be.visible');
      cy.get('#answer-input').should('be.visible');
      cy.get('#check-button').should('be.visible');
    });

    it('should go back to home from a quiz', () => {
      cy.get('#quizHiragana').click();
      cy.get('#home-button').click();
      cy.contains('h2', 'Learning Sections').should('be.visible');
    });

    it('should start hiragana flashcards, verifying the playerState fix', () => {
      cy.get('#flashcardHiragana').click();
      cy.get('.flashcard').should('be.visible');
      cy.get('#flip-button').click();
      cy.get('.flashcard').should('have.class', 'flipped');
    });

    it('should open and close the stats modal, verifying the innerHTML fix', () => {
      cy.get('#stats-button').click();
      cy.get('#stats-modal').should('be.visible');
      cy.contains('#statsModalLabel', 'Statistics').should('be.visible');
      // Verify that the accordion is populated
      cy.get('#statsAccordion').should('be.visible');
      cy.get('#wrong-chars-table-body').should('exist');
      cy.get('#correct-chars-table-body').should('exist');
      cy.get('#achievements-table-body').should('exist');
      cy.get('#stats-modal .btn-close').click();
      cy.get('#stats-modal').should('not.be.visible');
    });

    it('should open the references modal and switch tabs, verifying the event listener fix', () => {
      cy.get('#references-button').click();
      cy.get('#references-modal').should('be.visible');
      cy.contains('#referencesModalLabel', 'References').should('be.visible');

      // Verify tab switching
      cy.get('#katakana-tab').click();
      cy.get('#katakana').should('have.class', 'active');

      cy.get('#kanji-tab').click();
      cy.get('#kanji').should('have.class', 'active');

      cy.get('#numbers-tab').click();
      cy.get('#numbers').should('have.class', 'active');

      cy.get('#references-modal .btn-close').click();
      cy.get('#references-modal').should('not.be.visible');
    });
  });

  context('Feature: Quiz Gameplay', () => {
    it('should allow answering a question in the hiragana quiz', () => {
      cy.get('#quizHiragana').click();
      cy.get('#char-display').should('be.visible');
      cy.get('#answer-input').type('a');
      cy.get('#check-button').click();
      cy.get('#feedback-area').should('be.visible').and('not.be.empty');
    });
  });

  context('Feature: Flashcard Gameplay', () => {
    it('should allow marking a flashcard as true or false', () => {
      cy.get('#flashcardKatakana').click();
      cy.get('.flashcard').should('be.visible');
      cy.get('#true-button').click();
      cy.get('#feedback-area').should('be.visible').and('not.be.empty');
      // Wait for the next card to load
      cy.wait(1500);
      cy.get('#false-button').click();
      cy.get('#feedback-area').should('be.visible').and('not.be.empty');
    });
  });
});

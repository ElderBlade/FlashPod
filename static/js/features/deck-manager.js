// static/js/features/deck-manager.js
import { DeckService } from '../services/deck-service.js';
import { CardService } from '../services/card-service.js';
import { CardBuilder } from '../ui/card-builder.js';
import { MessageUI } from '../ui/message.js';

export class DeckManager {
    constructor(navigation) {
        this.navigation = navigation;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const deckForm = document.getElementById('deckForm');
        if (deckForm) {
            deckForm.addEventListener('submit', (e) => this.handleCreateDeck(e));
        }

        const addCardBtn = document.getElementById('addCardBtn');
        if (addCardBtn) {
            addCardBtn.addEventListener('click', () => this.addNewCard());
        }

        const cancelBtn = document.getElementById('cancelDeck');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.navigation.navigateTo('home'));
        }
    }

    async handleCreateDeck(e) {
        e.preventDefault();
        
        const name = document.getElementById('deckName').value;
        const description = document.getElementById('deckDescription').value;
        const container = document.getElementById('cardsContainer');
        const cards = CardBuilder.extractCardData(container);

        if (cards.length === 0) {
            MessageUI.show('Please add at least one card to your deck', 'error');
            return;
        }

        try {
            const deckData = await DeckService.createDeck(name, description);
            const deckId = deckData.deck_id;
            
            // Create all cards
            const cardPromises = cards.map((card, index) => 
                CardService.createCard(deckId, {
                    front_content: card.term,
                    back_content: card.definition,
                    display_order: index
                }).catch(err => {
                    console.error('Failed to add card:', err);
                    return null;
                })
            );
            
            const results = await Promise.all(cardPromises);
            const successCount = results.filter(r => r !== null).length;
            
            document.getElementById('deckForm').reset();
            this.initializeCardRows();
            MessageUI.show(`Deck created successfully with ${successCount} cards!`, 'success');
            
            // Refresh and navigate
            this.onDeckCreated();
            this.navigation.navigateTo('library');
            
        } catch (error) {
            MessageUI.show('Failed to create deck: ' + error.message, 'error');
        }
    }

    initializeCardRows() {
        const container = document.getElementById('cardsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        container.appendChild(CardBuilder.createCardRow());
        container.appendChild(CardBuilder.createCardRow());
    }

    addNewCard() {
        const container = document.getElementById('cardsContainer');
        if (!container) return;
        
        const newCardRow = CardBuilder.createCardRow();
        container.appendChild(newCardRow);
        
        const termInput = newCardRow.querySelector('input[name="term"]');
        if (termInput) termInput.focus();
    }

    onDeckCreated() {
        // Override in main app to handle deck creation
    }
}
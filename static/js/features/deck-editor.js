// static/js/features/deck-editor.js
import { DeckService } from '../services/deck-service.js';
import { CardService } from '../services/card-service.js';
import { CardBuilder } from '../ui/card-builder.js';
import { MessageUI } from '../ui/message.js';

export class DeckEditor {
    constructor(navigation) {
        this.navigation = navigation;
        this.editingDeckId = null;
        this.editingCards = [];
        this.originalCards = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        const editForm = document.getElementById('editDeckForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleSaveDeck(e));
        }

        const addCardBtn = document.getElementById('addCardToEdit');
        if (addCardBtn) {
            addCardBtn.addEventListener('click', () => this.addNewEditCard());
        }

        const cancelBtn = document.getElementById('cancelEditDeck');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.navigation.navigateTo('library'));
        }

        const deleteBtn = document.getElementById('deleteDeck');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleDeleteDeck());
        }
    }

    async loadDeckForEdit(deckId) {
        this.editingDeckId = deckId;
        
        try {
            const [deckData, cardsData] = await Promise.all([
                DeckService.getDeck(deckId),
                CardService.getCardsForDeck(deckId)
            ]);
            
            const deck = deckData.deck;
            this.editingCards = cardsData.cards || [];
            this.originalCards = JSON.parse(JSON.stringify(this.editingCards));
            
            console.log(deck);
            console.log(this.editingCards);
            // Populate form
            document.getElementById('editDeckId').value = deck.id;
            document.getElementById('editDeckName').value = deck.name;
            document.getElementById('editDeckDescription').value = deck.description || '';
            
            this.displayEditCards();
            
            // Navigate to edit view
            this.navigation.navigateTo('edit-deck');
            document.getElementById('edit-deck-view').classList.remove('hidden');
            
            // Switch to edit view
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('.page-view').forEach(view => view.classList.add('hidden'));
            document.getElementById('edit-deck-view').classList.remove('hidden');
            
        } catch (error) {
            MessageUI.show('Error loading deck: ' + error.message, 'error');
        }
    }

    displayEditCards() {
        const container = document.getElementById('editCardsContainer');
        if (!container) return;

        // Clear container
        container.innerHTML = '';

        if (this.editingCards.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No cards in this deck yet.</p>
                </div>
            `;
            return;
        }
        
        // Add all cards
        this.editingCards.forEach((card) => {
            const cardRow = this.createEditCardRow(card);
            container.appendChild(cardRow);
        });
    }

    createEditCardRow(card) {
        const cardRow = CardBuilder.createCardRow(card.front_content, card.back_content);
        cardRow.dataset.cardId = card.id;
        
        // Override remove functionality
        const removeBtn = cardRow.querySelector('.remove-card');
        if (removeBtn) {
            removeBtn.onclick = () => this.removeEditCard(card.id);
        }
        
        return cardRow;
    }

    removeEditCard(cardId) {
        this.editingCards = this.editingCards.filter(card => card.id !== cardId);
        this.displayEditCards();
    }

    addNewEditCard() {
        const container = document.getElementById('editCardsContainer');
        if (!container) return;
        
        const newCard = {
            id: 'new_' + Date.now(),
            front_content: '',
            back_content: '',
            is_new: true
        };
        
        // Add to array without refreshing the display
        this.editingCards.push(newCard);
        
        // Create and append only the new card row
        const newCardRow = this.createEditCardRow(newCard);
        container.appendChild(newCardRow);
        
        // Focus on the new card's term input
        const termInput = newCardRow.querySelector('input[name="term"]');
        if (termInput) termInput.focus();
    }

    async handleSaveDeck(e) {
        e.preventDefault();
        
        const deckId = document.getElementById('editDeckId').value;
        const name = document.getElementById('editDeckName').value;
        const description = document.getElementById('editDeckDescription').value;
        
        if (!name.trim()) {
            MessageUI.show('Deck name is required', 'error');
            return;
        }
        
        try {
            await DeckService.updateDeck(deckId, { name, description });
            
            const container = document.getElementById('editCardsContainer');
            const currentCards = this.extractEditCardData(container);
            
            await this.syncCards(deckId, currentCards);
            
            MessageUI.show('Deck updated successfully!', 'success');
            this.onDeckUpdated();
            this.navigation.navigateTo('library');
            
        } catch (error) {
            MessageUI.show('Error saving deck: ' + error.message, 'error');
        }
    }

    extractEditCardData(container) {
        const cardRows = container.querySelectorAll('.card-row');
        const cards = [];
        
        cardRows.forEach((row, index) => {
            const cardId = row.dataset.cardId;
            const term = row.querySelector('input[name="term"]')?.value;
            const definition = row.querySelector('textarea[name="definition"]')?.value;
            
            if (term && definition) {
                const originalCard = this.editingCards.find(c => c.id == cardId);
                cards.push({
                    id: cardId,
                    front_content: term,
                    back_content: definition,
                    display_order: index,
                    is_new: originalCard?.is_new || false
                });
            }
        });
        
        return cards;
    }

    async syncCards(deckId, currentCards) {
        const newCards = currentCards.filter(c => c.is_new);
        const existingCards = currentCards.filter(c => !c.is_new);
        
        const currentCardIds = currentCards.map(c => parseInt(c.id)).filter(id => !isNaN(id));
        const originalCardIds = this.originalCards.map(c => parseInt(c.id));
        const deletedCardIds = originalCardIds.filter(id => !currentCardIds.includes(id));
        
        const promises = [];
        
        // Create new cards
        newCards.forEach(card => {
            promises.push(
                CardService.createCard(deckId, {
                    front_content: card.front_content,
                    back_content: card.back_content,
                    display_order: card.display_order
                })
            );
        });
        
        // Update existing cards
        existingCards.forEach(card => {
            const originalCard = this.originalCards.find(c => parseInt(c.id) === parseInt(card.id));
            const hasChanged = !originalCard || 
                originalCard.front_content !== card.front_content || 
                originalCard.back_content !== card.back_content;
            
            if (hasChanged) {
                promises.push(
                    CardService.updateCard(card.id, {
                        front_content: card.front_content,
                        back_content: card.back_content,
                        display_order: card.display_order
                    })
                );
            }
        });
        
        // Delete removed cards
        deletedCardIds.forEach(cardId => {
            promises.push(CardService.deleteCard(cardId));
        });
        
        await Promise.all(promises);
        
        // Update card order
        if (existingCards.length > 0) {
            const cardOrders = existingCards.map(card => ({
                card_id: parseInt(card.id),
                order: card.display_order
            }));
            
            await CardService.reorderCards(deckId, cardOrders);
        }
    }

    async handleDeleteDeck() {
        const deckId = document.getElementById('editDeckId').value;
        const deckName = document.getElementById('editDeckName').value;
        
        if (!confirm(`Are you sure you want to delete "${deckName}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            await DeckService.deleteDeck(deckId);
            MessageUI.show('Deck deleted successfully', 'success');
            this.onDeckDeleted();
            this.navigation.navigateTo('library');
        } catch (error) {
            MessageUI.show('Error deleting deck: ' + error.message, 'error');
        }
    }

    onDeckUpdated() {
        // Override in main app
    }

    onDeckDeleted() {
        // Override in main app
    }
}
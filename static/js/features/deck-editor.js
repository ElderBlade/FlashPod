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
        
        // Show custom modal instead of browser confirm
        this.showDeleteDeckModal(deckId, deckName);
    }

    showDeleteDeckModal(deckId, deckName) {
        const modal = document.createElement('div');
        modal.id = 'delete-deck-modal';
        modal.className = 'modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Delete Deck</h3>
                        <button onclick="this.closest('#delete-deck-modal').remove()" 
                                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Body -->
                <div class="px-6 py-4">
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0">
                            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                            </svg>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Are you sure you want to delete this deck?
                            </h4>
                            <div class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                <p><strong>Deck:</strong> ${this.escapeHtml(deckName)}</p>
                                <p class="text-red-600 dark:text-red-400 font-medium">
                                    This action cannot be undone. All cards in this deck will be permanently deleted.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                    <button onclick="this.closest('#delete-deck-modal').remove()" 
                            class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md transition-colors cursor-pointer">
                        Cancel
                    </button>
                    <button id="confirm-delete-deck-btn"
                            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors cursor-pointer">
                        Delete Deck
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Set up the confirm delete button
        const confirmBtn = modal.querySelector('#confirm-delete-deck-btn');
        confirmBtn.onclick = async () => {
            modal.remove();
            await this.confirmDeleteDeck(deckId, deckName);
        };
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    async confirmDeleteDeck(deckId, deckName) {
        try {
            await DeckService.deleteDeck(deckId);
            MessageUI.show('Deck deleted successfully', 'success');
            this.onDeckDeleted();
            this.navigation.navigateTo('library');
        } catch (error) {
            MessageUI.show('Error deleting deck: ' + error.message, 'error');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    onDeckUpdated() {
        // Override in main app
    }

    onDeckDeleted() {
        // Override in main app
    }
}
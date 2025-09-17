// static/js/features/import-manager.js
import { CardBuilder } from '../ui/card-builder.js';
import { MessageUI } from '../ui/message.js';

export class ImportManager {
    constructor(navigation) {
        this.navigation = navigation;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const parseBtn = document.getElementById('parseImportBtn');
        if (parseBtn) {
            parseBtn.addEventListener('click', () => this.handleParseImport());
        }

        const importBtn = document.getElementById('importToDeckBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.handleImportToDeck());
        }

        const clearBtn = document.getElementById('clearImportBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearImport());
        }

        const importCardsBtn = document.querySelector('#importCardsBtn');
        if (importCardsBtn) {
            importCardsBtn.addEventListener('click', () => {
                this.navigation.navigateTo('import');
            });
        }

        // File upload handler
        const fileUpload = document.getElementById('fileUpload');
        if (fileUpload) {
            fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        }

    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            MessageUI.show('Uploading and parsing file...', 'info');
            
            const response = await fetch(`${window.Config?.API_BASE || '/api'}/decks/import-file`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }
            
            this.displayParsedCards(result.cards);
            document.getElementById('importCardsSection')?.classList.remove('hidden');
            
            // Auto-populate deck name and description if this is a FlashPod export
            if (result.metadata) {
                this.populateDeckFields(result.metadata);
                
                if (result.metadata.is_flashpod_export) {
                    MessageUI.show(`Imported ${result.cards.length} cards from FlashPod export! Deck name and description auto-filled.`, 'success');
                } else {
                    MessageUI.show(`Imported ${result.cards.length} cards from file!`, 'success');
                }
            } else {
                MessageUI.show(`Imported ${result.cards.length} cards from file!`, 'success');
            }
            
        } catch (error) {
            MessageUI.show(`File upload failed: ${error.message}`, 'error');
            console.error('Upload error:', error);
        }
    }

    populateDeckFields(metadata) {
        if (!metadata.is_flashpod_export) {
            return; // Only auto-populate for FlashPod exports
        }
        
        const deckNameInput = document.getElementById('deckName');
        const deckDescriptionInput = document.getElementById('deckDescription');
        
        if (metadata.deck_name && deckNameInput) {
            deckNameInput.value = metadata.deck_name;
            // Add visual feedback that it was auto-filled
            deckNameInput.classList.add('bg-blue-50', 'border-blue-200');
            setTimeout(() => {
                deckNameInput.classList.remove('bg-blue-50', 'border-blue-200');
            }, 2000);
        }
        
        if (metadata.description && deckDescriptionInput) {
            deckDescriptionInput.value = metadata.description;
            // Add visual feedback that it was auto-filled
            deckDescriptionInput.classList.add('bg-blue-50', 'border-blue-200');
            setTimeout(() => {
                deckDescriptionInput.classList.remove('bg-blue-50', 'border-blue-200');
            }, 2000);
        }
    }

    handleParseImport() {
        const importField = document.getElementById('importDataField');
        if (!importField) return;
        
        const text = importField.value;
        const cards = this.parseImportData(text);
        
        if (cards.length === 0) {
            MessageUI.show('No valid cards found. Please check your format.', 'error');
            return;
        }
        
        this.displayParsedCards(cards);
        document.getElementById('importCardsSection')?.classList.remove('hidden');
        MessageUI.show(`Parsed ${cards.length} cards successfully!`, 'success');
    }

    parseImportData(text) {
        const lines = text.split('\n');
        const cards = [];
        
        // Filter out comment lines and empty lines
        const filteredLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('#');
        });
        
        // Skip header if present
        let startIndex = 0;
        if (filteredLines.length > 0) {
            const firstLine = filteredLines[0].trim();
            if (firstLine.toLowerCase().startsWith('term,') || 
                firstLine.toLowerCase().startsWith('term\t') ||
                firstLine.toLowerCase() === 'term') {
                startIndex = 1;
            }
        }
        
        // Process data lines
        for (let i = startIndex; i < filteredLines.length; i++) {
            const line = filteredLines[i];
            const trimmedLine = line.trim();
            
            if (!trimmedLine) continue;
            
            let term, definition;
            
            // Try tab delimiter first, then comma
            if (trimmedLine.includes('\t')) {
                const parts = trimmedLine.split('\t');
                term = parts[0]?.trim() || '';
                definition = parts.slice(1).join('\t').trim() || '';
            } else if (trimmedLine.includes(',')) {
                const commaIndex = trimmedLine.indexOf(',');
                term = trimmedLine.substring(0, commaIndex).trim();
                definition = trimmedLine.substring(commaIndex + 1).trim();
                
                // Remove quotes if present (basic CSV unquoting)
                if (term.startsWith('"') && term.endsWith('"')) {
                    term = term.slice(1, -1).replace('""', '"');
                }
                if (definition.includes('","')) {
                    // Handle the case where definition has multiple comma-separated parts
                    definition = definition.split(',')[0];
                }
                if (definition.startsWith('"') && definition.endsWith('"')) {
                    definition = definition.slice(1, -1).replace('""', '"');
                }
            } else {
                term = trimmedLine;
                definition = '';
            }
            
            if (term) {
                cards.push({ term, definition });
            }
        }
        
        return cards;
    }
    
    displayParsedCards(cards) {
        const container = document.getElementById('importCardsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        cards.forEach((card, index) => {
            const cardRow = this.createImportCardRow(card.term, card.definition, index);
            container.appendChild(cardRow);
        });
        
        this.updateCardCount();
    }

    createImportCardRow(term, definition, index) {
        const cardRow = document.createElement('div');
        cardRow.className = 'import-card-row flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200';
        cardRow.dataset.cardIndex = index;
        
        cardRow.innerHTML = `
            <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-2">
                <span class="text-xs font-medium text-blue-600">${index + 1}</span>
            </div>
            <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Term</label>
                    <input type="text" name="import-term" value="${term}" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Definition</label>
                    <textarea name="import-definition" 
                              class="auto-resize w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-hidden" 
                              rows="1">${definition}</textarea>
                </div>
            </div>
            <button type="button" class="remove-import-card text-red-500 hover:text-red-700 p-1 mt-8">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        `;
        
        // Setup auto-resize for textarea
        const textarea = cardRow.querySelector('textarea[name="import-definition"]');
        if (textarea) {
            CardBuilder.setupAutoResize(textarea);
        }
        
        // Setup remove functionality
        const removeBtn = cardRow.querySelector('.remove-import-card');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                cardRow.remove();
                this.updateCardCount();
                this.renumberImportCards();
            });
        }
        
        return cardRow;
    }

    updateCardCount() {
        const count = document.querySelectorAll('.import-card-row').length;
        const countEl = document.getElementById('cardCount');
        if (countEl) {
            countEl.textContent = count;
        }
    }

    renumberImportCards() {
        const cardRows = document.querySelectorAll('.import-card-row');
        cardRows.forEach((row, index) => {
            row.dataset.cardIndex = index;
            const numberElement = row.querySelector('.bg-blue-100 span');
            if (numberElement) {
                numberElement.textContent = index + 1;
            }
        });
    }

    handleImportToDeck() {
        const cards = this.getImportCardData();
        
        if (cards.length === 0) {
            MessageUI.show('No cards to import. Please add some cards first.', 'error');
            return;
        }
        
        // Switch to new deck view
        this.navigation.navigateTo('new-deck');
        
        // Clear existing cards in the form
        const cardsContainer = document.getElementById('cardsContainer');
        if (!cardsContainer) return;
        
        cardsContainer.innerHTML = '';
        
        // Add imported cards
        cards.forEach((card) => {
            const cardRow = CardBuilder.createCardRow(card.term, card.definition);
            cardsContainer.appendChild(cardRow);
        });
        
        MessageUI.show(`Imported ${cards.length} cards to new deck form`, 'success');
        
        // Clear import data
        this.clearImport();
    }

    getImportCardData() {
        const cardRows = document.querySelectorAll('.import-card-row');
        const cards = [];
        
        cardRows.forEach(row => {
            const term = row.querySelector('input[name="import-term"]')?.value.trim();
            const definition = row.querySelector('textarea[name="import-definition"]')?.value.trim();
            
            if (term && definition) {
                cards.push({ term, definition });
            }
        });
        
        return cards;
    }

    clearImport() {
        const importField = document.getElementById('importDataField');
        if (importField) importField.value = '';
        
        const cardsSection = document.getElementById('importCardsSection');
        if (cardsSection) cardsSection.classList.add('hidden');
        
        const container = document.getElementById('importCardsContainer');
        if (container) container.innerHTML = '';
    }
}
// static/js/ui/card-builder.js
export class CardBuilder {
    static createCardRow(term = '', definition = '', index = null) {
        const cardId = `card-${index || Date.now()}`;
        const cardRow = document.createElement('div');
        
        cardRow.className = 'card-row flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600';
        cardRow.draggable = true;
        cardRow.dataset.cardId = cardId;
        
        cardRow.innerHTML = this.getCardRowHTML(term, definition);
        
        this.setupCardInteractions(cardRow);
        return cardRow;
    }

    static getCardRowHTML(term, definition) {
        return `
            <div class="drag-handle cursor-move text-gray-400 hover:text-gray-600 mt-8 dark:text-gray-500 dark:hover:text-gray-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                </svg>
            </div>
            <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Term</label>
                    <input type="text" name="term" value="${term}" 
                           placeholder="Enter term or question" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-400">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Definition</label>
                    <textarea name="definition" 
                              placeholder="Enter definition or answer" 
                              class="auto-resize w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-hidden dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-400" 
                              rows="1">${definition}</textarea>
                </div>
            </div>
            <button type="button" class="remove-card text-red-500 hover:text-red-700 p-1 mt-8 dark:text-red-400 dark:hover:text-red-300">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        `;
    }

    static setupCardInteractions(cardRow) {
        // Auto-resize textarea
        const textarea = cardRow.querySelector('textarea[name="definition"]');
        if (textarea) {
            this.setupAutoResize(textarea);
        }

        // Remove functionality
        const removeBtn = cardRow.querySelector('.remove-card');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                const container = cardRow.parentElement;
                if (container && container.children.length > 1) {
                    cardRow.remove();
                }
            });
        }

        // Drag and drop
        this.setupDragAndDrop(cardRow);
    }

    static setupAutoResize(textarea) {
        function adjustHeight() {
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(40, textarea.scrollHeight) + 'px';
        }
        
        textarea.addEventListener('input', adjustHeight);
        textarea.addEventListener('focus', adjustHeight);
        adjustHeight();
    }

    static setupDragAndDrop(cardRow) {
        cardRow.addEventListener('dragstart', (e) => {
            cardRow.classList.add('opacity-50');
            e.dataTransfer.setData('text/plain', cardRow.dataset.cardId);
        });

        cardRow.addEventListener('dragend', () => {
            cardRow.classList.remove('opacity-50');
        });

        cardRow.addEventListener('dragover', (e) => {
            e.preventDefault();
            cardRow.classList.add('border-blue-400');
        });

        cardRow.addEventListener('dragleave', () => {
            cardRow.classList.remove('border-blue-400');
        });

        cardRow.addEventListener('drop', (e) => {
            e.preventDefault();
            cardRow.classList.remove('border-blue-400');
            
            const draggedCardId = e.dataTransfer.getData('text/plain');
            const draggedCard = document.querySelector(`[data-card-id="${draggedCardId}"]`);
            const container = cardRow.parentElement;
            
            if (draggedCard && draggedCard !== cardRow && container) {
                const allCards = Array.from(container.children);
                const draggedIndex = allCards.indexOf(draggedCard);
                const targetIndex = allCards.indexOf(cardRow);
                
                if (draggedIndex < targetIndex) {
                    container.insertBefore(draggedCard, cardRow.nextSibling);
                } else {
                    container.insertBefore(draggedCard, cardRow);
                }
            }
        });
    }

    static extractCardData(container) {
        const cardRows = container.querySelectorAll('.card-row');
        const cards = [];

        cardRows.forEach((row, index) => {
            const term = row.querySelector('input[name="term"]')?.value.trim();
            const definition = row.querySelector('textarea[name="definition"]')?.value.trim();

            if (term && definition) {
                cards.push({ 
                    term, 
                    definition,
                    display_order: index
                });
            }
        });

        return cards;
    }
}
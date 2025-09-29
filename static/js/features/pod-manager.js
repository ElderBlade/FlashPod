// static/js/features/pod-manager.js
import { PodService } from '../services/pod-service.js';
import { DeckService } from '../services/deck-service.js';
import { MessageUI } from '../ui/message.js';

export class PodManager {
    constructor(deckLibrary, podLibrary) {
        this.deckLibrary = deckLibrary;
        this.podLibrary = podLibrary;
        this.editingPodId = null;
        this.availableDecks = [];
        this.selectedDecks = [];
        this.setupEventListeners();
    }

    setupEventListeners() {

        // Create Pod button
        const createPodBtn = document.getElementById('create-pod-btn');
        const createFirstPodBtn = document.getElementById('create-first-pod-btn');
        
        if (createPodBtn) {
            createPodBtn.addEventListener('click', () => window.app.createPod());
        }
        
        if (createFirstPodBtn) {
            createFirstPodBtn.addEventListener('click', () => window.app.createPod());
        }

        
        // Modal backdrop clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeModal();
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    async showCreatePodModal(preselectedDeckIds = []) {
        try {
            // Load available decks
            const data = await DeckService.getMyDecksWithStats();
            this.availableDecks = data.decks || [];
            this.selectedDecks = [...preselectedDeckIds];
            this.editingPodId = null;

            this.createModal('Create New Pod', {
                name: '',
                description: '',
                decks: this.availableDecks
            });
        } catch (error) {
            console.error('Error loading decks:', error);
            MessageUI.show('Failed to load decks', 'error');
        }
    }

    async showEditPodModal(podId) {
        try {
            // Load pod data and available decks
            const [podData, decksData] = await Promise.all([
                PodService.getPod(podId),
                DeckService.getMyDecksWithStats()
            ]);

            this.availableDecks = decksData.decks || [];
            this.editingPodId = podId;
            this.selectedDecks = podData.pod.decks?.map(pd => pd.deck_id) || [];

            this.createModal('Edit Pod', {
                name: podData.pod.name,
                description: podData.pod.description || '',
                decks: this.availableDecks
            });
        } catch (error) {
            console.error('Error loading pod:', error);
            MessageUI.show('Failed to load pod data', 'error');
        }
    }

    async showAddToPodModal(deckIds) {
        try {
            // Load available pods
            const data = await PodService.getAllPods();
            const pods = data.pods || [];

            if (pods.length === 0) {
                // No pods exist, show create pod modal directly with preselected decks
                await this.showCreatePodModal(deckIds);
                return;
            }

            this.createAddToPodModal(pods, deckIds);
        } catch (error) {
            console.error('Error loading pods:', error);
            MessageUI.show('Failed to load pods', 'error');
        }
    }

    createModal(title, data) {

        const modal = document.createElement('div');
        modal.id = 'pod-modal';
        modal.className = 'modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="modal-content bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <!-- Header -->
                <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">${title}</h2>
                    <button id="close-pod-modal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Content -->
                <form id="pod-form" class="flex flex-col h-full">
                    <div class="flex-1 p-6 space-y-6 overflow-y-auto">
                        <!-- Name field -->
                        <div>
                            <label for="pod-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Pod Name *
                            </label>
                            <input type="text" 
                                id="pod-name" 
                                name="name"
                                value="${this.escapeHtml(data.name)}" 
                                required
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>

                        <!-- Description field -->
                        <div>
                            <label for="pod-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Description
                            </label>
                            <textarea id="pod-description" 
                                    name="description"
                                    rows="3"
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Optional description for this pod...">${this.escapeHtml(data.description)}</textarea>
                        </div>

                        <!-- Deck selection -->
                        <div>
                            <label id="deck-selection-label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Select Decks (${this.selectedDecks.length} selected)
                            </label>
                            <div id="deck-list" class="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-3 bg-gray-50 dark:bg-gray-700">
                                ${this.renderDeckSelection(data.decks)}
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <button type="button" 
                                id="cancel-pod"
                                class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md transition-colors">
                            Cancel
                        </button>
                        <button type="submit" 
                                id="save-pod"
                                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
                            ${this.editingPodId ? 'Update Pod' : 'Create Pod'}
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Use setTimeout to ensure DOM is fully rendered before setting up listeners
        setTimeout(() => {
            this.setupModalEventListeners();
        }, 0);

        // Focus on name input
        setTimeout(() => {
            document.getElementById('pod-name')?.focus();
        }, 100);
    }

    createAddToPodModal(pods, deckIds) {
        const modal = document.createElement('div');
        modal.id = 'add-to-pod-modal';
        modal.className = 'modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="modal-content bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                <!-- Header -->
                <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Add to Pod</h2>
                    <button id="close-add-to-pod-modal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Content -->
                <div class="p-6">
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Select a pod to add ${deckIds.length} deck${deckIds.length !== 1 ? 's' : ''} to:
                    </p>
                    
                    <div class="space-y-3 mb-6">
                        ${pods.map(pod => `
                            <button class="add-to-existing-pod w-full text-left p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    data-pod-id="${pod.id}"
                                    data-deck-ids='${JSON.stringify(deckIds)}'>
                                <div class="font-medium text-gray-900 dark:text-white">${this.escapeHtml(pod.name)}</div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">${pod.deck_count || 0} decks</div>
                            </button>
                        `).join('')}
                    </div>
                    
                    <div class="border-t border-gray-200 dark:border-gray-600 pt-4">
                        <button id="create-new-pod-from-add" 
                                class="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                data-deck-ids='${JSON.stringify(deckIds)}'>
                            <svg class="w-5 h-5 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            Create New Pod
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Use setTimeout to ensure DOM is fully rendered before setting up listeners
        setTimeout(() => {
            this.setupAddToPodModalEventListeners();
        }, 0);
    }

    renderDeckSelection(decks) {
        return decks.map(deck => {
            const isSelected = this.selectedDecks.includes(deck.id);
            return `
                <label class="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input 
                        type="checkbox" 
                        value="${deck.id}"
                        ${isSelected ? 'checked' : ''}
                        class="deck-checkbox mr-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                    <div class="flex-1">
                        <div class="text-sm font-medium text-gray-900 dark:text-white">${this.escapeHtml(deck.name)}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${deck.card_count} cards</div>
                    </div>
                </label>
            `;
        }).join('');
    }

    setupModalEventListeners() {

        const modal = document.getElementById('pod-modal');
        const closeBtn = document.getElementById('close-pod-modal');
        const cancelBtn = document.getElementById('cancel-pod');
        const saveBtn = document.getElementById('save-pod');
        const form = document.getElementById('pod-form');

        // if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        // if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        // Handle both form submission and save button click
        if (form) {
            form.addEventListener('submit', (e) => this.handleSavePod(e));
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const form = document.getElementById('pod-form');
                if (form) {
                    this.handleSavePod({ 
                        preventDefault: () => {}, 
                        target: form 
                    });
                }
            });
        }

        // Deck selection checkboxes
        const checkboxes = modal.querySelectorAll('.deck-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const deckId = parseInt(e.target.value);
                if (e.target.checked) {
                    if (!this.selectedDecks.includes(deckId)) {
                        this.selectedDecks.push(deckId);
                    }
                } else {
                    this.selectedDecks = this.selectedDecks.filter(id => id !== deckId);
                }
                this.updateSelectedCount();
            });
        });
    }

    setupAddToPodModalEventListeners() {
        const modal = document.getElementById('add-to-pod-modal');
        const closeBtn = document.getElementById('close-add-to-pod-modal');
        const createNewBtn = document.getElementById('create-new-pod-from-add');
        const addToExistingBtns = modal.querySelectorAll('.add-to-existing-pod');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (createNewBtn) {
            createNewBtn.addEventListener('click', (e) => {
                const deckIds = JSON.parse(e.target.dataset.deckIds);
                this.closeModal(); // Close current modal first
                this.showCreatePodModal(deckIds); // Then open create modal
            });
        }

        addToExistingBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const podId = parseInt(e.currentTarget.dataset.podId);
                const deckIds = JSON.parse(e.currentTarget.dataset.deckIds);
                this.addDecksToExistingPod(podId, deckIds);
            });
        });
    }

    updateSelectedCount() {
        const label = document.getElementById('deck-selection-label');
        if (label) {
            label.textContent = `Select Decks (${this.selectedDecks.length} selected)`;
        }
    }

    async handleSavePod(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const name = formData.get('name').trim();
        const description = formData.get('description').trim();

        if (!name) {
            MessageUI.show('Please enter a pod name', 'error');
            return;
        }

        try {
            let result;
            if (this.editingPodId) {
                // Update existing pod
                result = await PodService.updatePod(this.editingPodId, {
                    name,
                    description
                });
                
                // Handle deck changes (add/remove as needed)
                await this.updatePodDecks(this.editingPodId);
                
                MessageUI.show('Pod updated successfully', 'success');
            } else {
                // Create new pod
                result = await PodService.createPod(name, description);
                const podId = result.pod.id;
                
                // Add selected decks to pod
                await this.addDecksToPod(podId, this.selectedDecks);
                
                MessageUI.show('Pod created successfully', 'success');
            }

            this.closeModal();
            
            // Refresh both libraries
            await this.podLibrary.refresh();
            await this.deckLibrary.loadAllDecks();

            // Exit bulk select mode if active (ADD THIS)
            if (this.deckLibrary.bulkSelectMode) {
                this.deckLibrary.exitBulkSelectMode();
            }
            
        } catch (error) {
            console.error('Error saving pod:', error);
            MessageUI.show('Failed to save pod', 'error');
        }
    }

    async addDecksToExistingPod(podId, deckIds) {
        try {
            await this.addDecksToPod(podId, deckIds);
            MessageUI.show(`Added ${deckIds.length} deck${deckIds.length !== 1 ? 's' : ''} to pod`, 'success');
            
            this.closeModal();
            
            // Refresh libraries
            await this.podLibrary.refresh();
            await this.deckLibrary.loadAllDecks();
            
            // Exit bulk select mode if active
            if (this.deckLibrary.bulkSelectMode) {
                this.deckLibrary.exitBulkSelectMode();
            }
            
        } catch (error) {
            console.error('Error adding decks to pod:', error);
            MessageUI.show('Failed to add decks to pod', 'error');
        }
    }

    async addDecksToPod(podId, deckIds) {
        const promises = deckIds.map((deckId, index) => 
            PodService.addDeckToPod(podId, deckId, index)
        );
        await Promise.all(promises);
    }

    async updatePodDecks(podId) {
        // This is a simplified approach - in a more robust implementation,
        // you'd want to calculate the exact differences and only make necessary changes
        try {
            const podData = await PodService.getPod(podId);
            const currentDeckIds = podData.pod.decks?.map(pd => pd.deck_id) || [];
            
            // Remove decks that are no longer selected
            for (const deckId of currentDeckIds) {
                if (!this.selectedDecks.includes(deckId)) {
                    await PodService.removeDeckFromPod(podId, deckId);
                }
            }
            
            // Add new decks
            for (const deckId of this.selectedDecks) {
                if (!currentDeckIds.includes(deckId)) {
                    await PodService.addDeckToPod(podId, deckId);
                }
            }
        } catch (error) {
            console.error('Error updating pod decks:', error);
            throw error;
        }
    }

    closeModal() {
        const modals = document.querySelectorAll('#pod-modal, #add-to-pod-modal');
        modals.forEach(modal => modal.remove());
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
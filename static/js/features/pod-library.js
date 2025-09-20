// static/js/features/pod-library.js
import { PodService } from '../services/pod-service.js';
import { MessageUI } from '../ui/message.js';

export class PodLibrary {
    constructor(deckLibrary) {
        this.deckLibrary = deckLibrary; // Reference to parent DeckLibrary for cross-tab actions
        this.pods = [];
        this.sortBy = 'recent';
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

        // Sort dropdown
        const sortSelect = document.getElementById('pod-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.renderPods();
            });
        }
    }

    async loadAllPods() {
        try {
            const response = await PodService.getAllPods();
            this.pods = response.pods || [];
            this.renderPods();
            this.updateEmptyState();
        } catch (error) {
            console.error('Failed to load pods:', error);
            MessageUI.show('Failed to load pods', 'error');
        }
    }

    renderPods() {
        const container = document.getElementById('all-pods-grid');
        if (!container) return;

        // Sort pods
        const sortedPods = this.sortPods([...this.pods]);

        if (sortedPods.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = sortedPods.map(pod => this.createPodCard(pod)).join('');
    }

    sortPods(pods) {
        switch (this.sortBy) {
            case 'name':
                return pods.sort((a, b) => a.name.localeCompare(b.name));
            case 'decks':
                return pods.sort((a, b) => (b.deck_count || 0) - (a.deck_count || 0));
            case 'recent':
            default:
                return pods.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
        }
    }

    // Update the createPodCard method to ensure proper styling and functionality
    createPodCard(pod) {
        const cardCount = pod.total_card_count || 0;
        const deckCount = pod.deck_count || 0;
        
        return `
            <div class="pod-card bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 cursor-pointer relative group" 
                data-pod-id="${pod.id}">
                
                <!-- Pod Header -->
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">${this.escapeHtml(pod.name)}</h3>
                        ${pod.description ? `<p class="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">${this.escapeHtml(pod.description)}</p>` : ''}
                    </div>
                    <div class="ml-2 flex-shrink-0">
                        <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1" onclick="window.app.showPodMenu(${pod.id}, event)">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Pod Stats -->
                <div class="flex items-center space-x-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
                    <div class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                        <span>${deckCount} deck${deckCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 010 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 010-2h4z"></path>
                        </svg>
                        <span>${cardCount} card${cardCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex space-x-2">
                    <button 
                        onclick="window.app.studyPod(${pod.id})"
                        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors ${cardCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${cardCount === 0 ? 'disabled' : ''}>
                        <svg class="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8"></path>
                        </svg>
                        Study Pod
                    </button>
                    <button 
                        onclick="window.app.editPod(${pod.id})"
                        class="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium py-2 px-3 rounded-md transition-colors">
                        <svg class="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        Edit
                    </button>
                </div>
            </div>
        `;
    }

    updateEmptyState() {
        const emptyState = document.getElementById('pods-empty-state');
        const podsGrid = document.getElementById('all-pods-grid');
        
        if (!emptyState || !podsGrid) return;

        if (this.pods.length === 0) {
            emptyState.classList.remove('hidden');
            podsGrid.classList.add('hidden');
        } else {
            emptyState.classList.add('hidden');
            podsGrid.classList.remove('hidden');
        }
    }

    showCreatePodModal() {
        window.app.podManager.showCreatePodModal();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Method to refresh pods after operations
    async refresh() {
        await this.loadAllPods();
    }
}
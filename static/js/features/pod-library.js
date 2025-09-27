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
            const response = await PodService.getAllPods(true);
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

    createPodCard(pod) {
        const cardCount = pod.total_card_count || 0;
        const deckCount = pod.deck_count || 0;
        
        // Determine pod status
        const isActive = cardCount > 0;
        const hasWarning = deckCount === 0;
        
        // Study statistics (if available)
        const studyStats = pod.study_stats;
        console.log(`POD STATS ${studyStats}`);
        const hasStats = studyStats && studyStats.total_sessions > 0;
        
        return `
            <div class="pod-card pod-card-with-visual bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 cursor-pointer relative group" 
                data-pod-id="${pod.id}"
                onclick="window.app.studyPod(${pod.id})">
                
                <!-- Saiyan Pod Visual -->
                <div class="pod-container">
                    <div class="saiyan-pod ${isActive ? 'has-cards' : ''}">
                        <!-- Main Viewport -->
                        <div class="saiyan-viewport">
                            <div class="saiyan-viewport">
                                <svg class="bolt-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M13 2L3 14h7v8l11-14h-7V2z" fill="#facc15"/>
                                </svg>
                            </div>
                        </div>
                        
                        <!-- Status Lights -->
                        <div class="saiyan-status-lights">
                            <div class="saiyan-status-light ${isActive ? 'power' : 'inactive'}"></div>
                            <div class="saiyan-status-light ${deckCount > 0 ? 'systems' : (hasWarning ? 'warning' : 'inactive')}"></div>
                        </div>

                    </div>
                </div>
                
                <!-- Action buttons positioned over the pod -->
                <div class="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 z-10">
                    <button onclick="event.stopPropagation(); window.app.editPod(${pod.id})" 
                            class="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 cursor-pointer rounded-full transition-colors shadow-md border border-gray-200 dark:border-gray-600"
                            title="Edit pod">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button onclick="event.stopPropagation(); window.app.showDeletePodModal(${pod.id}, '${this.escapeHtml(pod.name).replace(/'/g, "\\'")}', ${deckCount}, ${cardCount})" 
                            class="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer rounded-full transition-colors shadow-md border border-gray-200 dark:border-gray-600"
                            title="Delete pod">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Pod Content -->
                <div class="pod-card-content text-center">
                    <!-- Title -->
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">${this.escapeHtml(pod.name)}</h3>
                    
                    <!-- Description -->
                    ${pod.description ? `<p class="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">${this.escapeHtml(pod.description)}</p>` : ''}
                    
                    <!-- Stats -->
                    <div class="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
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
                    
                    <!-- Study Statistics (if available) -->
                    ${hasStats ? `
                        <div class="study-stats border-t border-gray-200 dark:border-gray-600 pt-3 mt-2">
                            <div class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                                <div class="flex items-center gap-1">
                                    <span>Sessions:</span>
                                    <span class="font-medium">${studyStats.total_sessions}</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <span>Retention:</span>
                                    <span class="font-medium ${studyStats.average_accuracy >= 80 ? 'text-green-600 dark:text-green-400' : studyStats.average_accuracy >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}">${studyStats.average_accuracy}%</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <span>Cards Due:</span>
                                    <span class="font-medium ${studyStats.cards_due > 0 ? `text-red-600 dark:text-red-400`: ``}">${studyStats.cards_due}</span>
                                </div>
                            </div>
                            ${studyStats.last_studied ? `
                                <div class="text-center text-gray-500 dark:text-gray-500 mt-2 pt-1 border-t border-gray-100 dark:border-gray-700 text-xs">
                                    Last: ${new Date(studyStats.last_studied).toLocaleDateString()}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    <!-- Study indicator when disabled -->
                    ${cardCount === 0 ? '<p class="text-xs text-gray-400 mt-2">Pod offline - No cards to study</p>' : ''}
                </div>
            </div>
        `;
    }

    createCompactPodCard(pod) {
        const cardCount = pod.total_card_count || 0;
        const deckCount = pod.deck_count || 0;
        
        // Determine pod status
        const isActive = cardCount > 0;
        const hasWarning = deckCount === 0;
        
        // Study statistics (if available)
        const studyStats = pod.study_stats;
        const hasStats = studyStats && studyStats.total_sessions > 0;
        
        return `
            <div class="pod-card pod-card-compact pod-card-with-visual bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 cursor-pointer relative group" 
                data-pod-id="${pod.id}"
                onclick="window.app.studyPod(${pod.id})">
                
                <!-- Compact Action Buttons -->
                <div class="pod-action-buttons absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 z-10">
                    <button onclick="event.stopPropagation(); window.app.editPod(${pod.id})" 
                            class="p-1.5 bg-white dark:bg-gray-800 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 cursor-pointer rounded-full transition-colors shadow-md border border-gray-200 dark:border-gray-600"
                            title="Edit pod">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button onclick="event.stopPropagation(); window.app.showDeletePodModal(${pod.id}, '${this.escapeHtml(pod.name).replace(/'/g, "\\'")}', ${deckCount}, ${cardCount})" 
                            class="p-1.5 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer rounded-full transition-colors shadow-md border border-gray-200 dark:border-gray-600"
                            title="Delete pod">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Compact Saiyan Pod Visual -->
                <div class="pod-container">
                    <div class="saiyan-pod ${isActive ? 'has-cards' : ''}">
                        <!-- Main Viewport -->
                        <div class="saiyan-viewport">
                            <svg class="bolt-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M13 2L3 14h7v8l11-14h-7V2z" fill="#facc15"/>
                            </svg>
                        </div>
                        
                        <!-- Status Lights -->
                        <div class="saiyan-status-lights">
                            <div class="saiyan-status-light ${isActive ? 'power' : 'inactive'}"></div>
                            <div class="saiyan-status-light ${deckCount > 0 ? 'systems' : (hasWarning ? 'warning' : 'inactive')}"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Compact Pod Content -->
                <div class="pod-card-content text-center">
                    <!-- Title -->
                    <h3 class="font-semibold text-gray-900 dark:text-white">${this.escapeHtml(pod.name)}</h3>
                    
                    <!-- Compact Stats Row -->
                    <div class="stats-row flex justify-center items-center gap-3 text-gray-500 dark:text-gray-400">
                        <span class="flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                            </svg>
                            ${deckCount}
                        </span>
                        <span class="flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            ${cardCount}
                        </span>
                        ${hasStats && studyStats.cards_due > 0 ? `
                            Due:<span class="text-orange-600 dark:text-orange-400 font-medium">
                                ${studyStats.cards_due}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    showDeletePodModal(podId, podName, deckCount, cardCount) {
        const modal = document.createElement('div');
        modal.id = 'delete-pod-modal';
        modal.className = 'modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Delete Pod</h3>
                        <button onclick="this.closest('#delete-pod-modal').remove()" 
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
                                Are you sure you want to delete this pod?
                            </h4>
                            <div class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                <p><strong>Pod:</strong> ${podName}</p>
                                <p><strong>Contains:</strong> ${deckCount} deck${deckCount !== 1 ? 's' : ''} with ${cardCount} total card${cardCount !== 1 ? 's' : ''}</p>
                                <p class="text-red-600 dark:text-red-400 font-medium">
                                    This action cannot be undone. The decks themselves will not be deleted.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                    <button onclick="this.closest('#delete-pod-modal').remove()" 
                            class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md transition-colors">
                        Cancel
                    </button>
                    <button onclick="window.app.deletePod(${podId}); this.closest('#delete-pod-modal').remove();" 
                            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors">
                        Delete Pod
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    updateEmptyState() {
        const emptyState = document.getElementById('pods-empty-state');
        const podsGrid = document.getElementById('all-pods-grid');
        
        if (!emptyState || !podsGrid) return;

        if (this.pods.length === 0) {
            emptyState.classList.remove('hidden');
            podsGrid.classList.add('hidden');
            this.hideCreatePodButton();
        } else {
            emptyState.classList.add('hidden');
            podsGrid.classList.remove('hidden');
            this.showCreatePodButton();
        }
    }

    // Add these two new methods to the PodLibrary class
    hideCreatePodButton() {
        const createPodBtn = document.getElementById('create-pod-btn');
        if (createPodBtn) {
            createPodBtn.style.display = 'none';
        } 
    }

    showCreatePodButton() {
        const createPodBtn = document.getElementById('create-pod-btn');
        if (createPodBtn) {
            createPodBtn.style.display = 'inline-flex';
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

    async loadRecentPods() {
        try {
            const response = await PodService.getAllPods(true);
            const pods = response.pods || [];
            
            // Filter and sort pods by recent activity
            const recentlyUsedPods = pods
                .filter(pod => pod.study_stats && pod.study_stats.last_studied)
                .sort((a, b) => {
                    const dateA = new Date(a.study_stats.last_studied);
                    const dateB = new Date(b.study_stats.last_studied);
                    return dateB - dateA; // Most recent first
                })
                .slice(0, 3); // Take first 3
                
            this.displayRecentPods(recentlyUsedPods);
        } catch (error) {
            console.error('Failed to load recent pods:', error);
        }
    }

    displayRecentPods(pods) {
        const container = document.getElementById('recent-pods');
        if (!container) return;
        
        if (pods.length === 0) {
            container.innerHTML = this.getEmptyPodsHTML();
            return;
        }
        
        container.innerHTML = pods.map(pod => this.createCompactPodCard(pod)).join('');
    }

    getRecentPodCardHTML(pod) {
        const cardCount = pod.total_card_count || 0;
        const deckCount = pod.deck_count || 0;
        const stats = pod.study_stats || {};
        const lastStudied = stats.last_studied ? new Date(stats.last_studied).toLocaleDateString() : 'Never';
        
        return `
            <div class="recent-pod-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onclick="window.app.studyPod(${pod.id})">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center space-x-2">
                        <div class="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                            <svg class="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                            </svg>
                        </div>
                        <div>
                            <h4 class="font-medium text-gray-900 dark:text-white text-sm truncate max-w-32">${pod.name}</h4>
                            <p class="text-xs text-gray-500 dark:text-gray-400">${deckCount} deck${deckCount !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    ${stats.cards_due > 0 ? `<span class="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded-full">${stats.cards_due} due</span>` : ''}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                    <div class="flex justify-between">
                        <span>${cardCount} cards</span>
                        <span>Last studied: ${lastStudied}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getEmptyPodsHTML() {
        return `
            <div class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
                <p class="text-sm">No recent pod activity</p>
            </div>
        `;
    }

    viewAllPods() {
        // First navigate to library view
        window.app.navigation.navigateTo('library');
        // Then switch to pods tab after a brief delay to ensure library view is loaded
        setTimeout(() => {
            window.app.library.switchTab('pods');
        }, 100);
    }
}
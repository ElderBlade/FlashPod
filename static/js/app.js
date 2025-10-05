// static/js/app.js - Main Application Entry Point
import { Config } from './core/config.js';
import { DarkModeToggle } from './ui/dark-mode-toggle.js';
import { DashboardStats } from './features/dashboard-stats.js';
import { DeckEditor } from './features/deck-editor.js';
import { DeckLibrary } from './features/deck-library.js';
import { PodLibrary } from './features/pod-library.js';
import { DeckManager } from './features/deck-manager.js';
import { ImportManager } from './features/import-manager.js';
import { MessageUI } from './ui/message.js';
import { MobileNavigation } from './ui/mobile-navigation.js';
import { Navigation } from './ui/navigation.js';
import { timezoneHandler } from './utils/timezone.js'; 
import { UserService } from './services/user-service.js';
import { PodManager } from './features/pod-manager.js';


class FlashPodApp {
    constructor() {
        // Set global API base for compatibility
        window.API_BASE = Config.API_BASE;
        
        // Initialize modules
        this.navigation = new Navigation();
        this.mobileNavigation = new MobileNavigation();
        this.library = new DeckLibrary();
        this.plibrary = new PodLibrary();
        this.deckManager = new DeckManager(this.navigation);
        this.deckEditor = new DeckEditor(this.navigation);
        this.importManager = new ImportManager(this.navigation);
        this.darkModeToggle = new DarkModeToggle();
        this.dashboardStats = new DashboardStats();
        this.podManager = new PodManager(this.library, this.library.podLibrary);
        
        // Expose global methods for onclick handlers
        window.app = this;
        
        this.init();
    }

    async init() {
        
        await timezoneHandler.initialize();

        const user = UserService.loadUserInfo();
        if (!user) return;
        
        // Initialize navigation
        this.navigation.init();
        
        // Override navigation callback to close mobile nav and load data
        this.navigation.onNavigate = (navId) => {
            // Close mobile navigation when navigating
            if (this.mobileNavigation.isNavigationOpen()) {
                this.mobileNavigation.forceClose();
            }
            
            if (navId === 'library') {
                // this.library.loadAllDecks();
                this.library.init();
            }

            if (navId === 'home') {
                this.dashboardStats.init();
                this.library.loadRecentDecks();
                this.plibrary.loadRecentPods();
            }
        };
        
        // Setup deck manager callbacks
        this.deckManager.onDeckCreated = () => {
            this.library.loadRecentDecks();
            this.library.loadAllDecks();
        };
        
        // Setup deck editor callbacks
        this.deckEditor.onDeckUpdated = () => {
            this.library.loadRecentDecks();
            this.library.loadAllDecks();
        };
        
        this.deckEditor.onDeckDeleted = () => {
            this.library.loadRecentDecks();
            this.library.loadAllDecks();
        };
        
        // Initialize deck rows for new deck form
        this.deckManager.initializeCardRows();
        
        // Load initial data
        this.library.loadRecentDecks();
        this.plibrary.loadRecentPods();

        this.dashboardStats.init();
        
        // Setup logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => UserService.logout());
        }
        
        // Add CSS for active navigation
        this.addNavigationStyles();
        
        // Enable mobile swipe gestures (optional)
        this.mobileNavigation.enableSwipeGestures();
        
        // Handle page visibility changes (close mobile nav when switching tabs)
        this.setupPageVisibilityHandler();
    }

    addNavigationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .nav-item {
                color: #6b7280;
                transition: all 0.2s;
            }
            .nav-item:hover {
                color: #374151;
                background-color: #f3f4f6;
            }
            .nav-item.active {
                color: #2563eb;
                background-color: #dbeafe;
            }
        `;
        document.head.appendChild(style);
    }

    setupPageVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.mobileNavigation.isNavigationOpen()) {
                this.mobileNavigation.forceClose();
            }
        });
    }

    // Public methods for onclick handlers
    viewDeck(deckId) {
        MessageUI.show(`View deck ${deckId} - Coming soon!`, 'info');
    }

    editDeck(deckId) {
        // Close mobile nav if open before editing
        if (this.mobileNavigation.isNavigationOpen()) {
            this.mobileNavigation.forceClose();
        }
        this.deckEditor.loadDeckForEdit(deckId);
    }

    studyDeck(deckId) {
        // Close mobile nav if open before studying
        if (this.mobileNavigation.isNavigationOpen()) {
            this.mobileNavigation.forceClose();
        }
        
        // Call the existing global studyDeck function if available
        if (window.studyDeck) {
            window.studyDeck(deckId);
        } else {
            MessageUI.show(`Study deck ${deckId} - Coming soon!`, 'info');
        }
    }

    async exportDeck(deckId) {
        // Close mobile nav if open before exporting
        if (this.mobileNavigation.isNavigationOpen()) {
            this.mobileNavigation.forceClose();
        }
        
        try {
            // Show loading message
            MessageUI.show('Preparing deck export...', 'info');
            
            // Get the deck data for filename
            const deckResponse = await fetch(`${Config.API_BASE}/decks/${deckId}`, {
                credentials: 'include'
            });
            
            if (!deckResponse.ok) {
                throw new Error('Failed to load deck information');
            }
            
            const deckData = await deckResponse.json();
            const deck = deckData.deck;
            
            // Request the CSV export
            const exportResponse = await fetch(`${Config.API_BASE}/decks/${deckId}/export`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!exportResponse.ok) {
                throw new Error('Failed to export deck');
            }
            
            // Get the CSV content as blob
            const csvBlob = await exportResponse.blob();
            
            // Create download link and trigger download
            const url = window.URL.createObjectURL(csvBlob);
            const link = document.createElement('a');
            link.href = url;
            
            // Create a clean filename
            const safeName = deck.name.replace(/[^\w\-_.]/g, '_');
            const timestamp = timezoneHandler.getCurrentDateInServerTimezone().toISOString().split('T')[0]; // YYYY-MM-DD
            link.download = `${safeName}_${timestamp}.csv`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL object
            window.URL.revokeObjectURL(url);
            
            MessageUI.show(`Deck "${deck.name}" exported successfully!`, 'success');
            
        } catch (error) {
            console.error('Export failed:', error);
            MessageUI.show('Failed to export deck: ' + error.message, 'error');
        }
    }

    // Utility methods for mobile navigation integration
    isMobileNavigationOpen() {
        return this.mobileNavigation.isNavigationOpen();
    }

    closeMobileNavigation() {
        this.mobileNavigation.forceClose();
    }

    async studyPod(podId) {
        // Close mobile nav if open before studying
        if (this.mobileNavigation.isNavigationOpen()) {
            this.mobileNavigation.forceClose();
        }
        
        try {
            // Fetch pod data to check if it has decks
            const podResponse = await fetch(`/api/pods/${podId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });
            
            if (!podResponse.ok) {
                MessageUI.show('Failed to load pod', 'error');
                return;
            }
            
            const podData = await podResponse.json();
            const pod = podData.pod;
            
            // Check if pod has any decks using the denormalized counts
            // The API returns deck_count and total_card_count, not a decks array
            if (pod.deck_count === 0 || pod.total_card_count === 0) {
                this.showEmptyPodModal(pod);
                return;
            }
            
            // Proceed with study
            if (window.studyPod) {
                window.studyPod(podId);
            } else {
                MessageUI.show('Pod study system not loaded', 'error');
            }
        } catch (error) {
            console.error('Error checking pod:', error);
            MessageUI.show('Error loading pod', 'error');
        }
    }

    showEmptyPodModal(pod) {
        const modal = document.createElement('div');
        modal.id = 'empty-pod-modal';
        modal.className = 'modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Pod Empty</h3>
                        <button onclick="this.closest('#empty-pod-modal').remove()" 
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
                            <svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                            </svg>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-base font-medium text-gray-900 dark:text-white mb-2">
                                "${this.plibrary.escapeHtml(pod.name)}" has no decks
                            </h4>
                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                This pod doesn't contain any decks yet. Add some decks to start studying!
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                    <button onclick="this.closest('#empty-pod-modal').remove()" 
                            class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md transition-colors cursor-pointer">
                        Cancel
                    </button>
                    <button onclick="window.app.editPod(${pod.id}); this.closest('#empty-pod-modal').remove();" 
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer">
                        Add Decks
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
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }


    addDeckToPod(deckId) {
        this.podManager.showAddToPodModal([deckId]);
    }

    // Add new pod-related methods
    createPod() {
        this.podManager.showCreatePodModal();
    }

    editPod(podId) {
        this.podManager.showEditPodModal(podId);
    }

    // Add these methods to the FlashPodApp class

    showPodMenu(podId, event) {
        event.stopPropagation();
        
        // Remove any existing menu
        const existingMenu = document.getElementById('pod-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        // Create context menu
        const menu = document.createElement('div');
        menu.id = 'pod-menu';
        menu.className = 'absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-50';
        
        menu.innerHTML = `
            <button onclick="window.app.editPod(${podId}); window.app.closePodMenu();" 
                    class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                Edit Pod
            </button>
            <button onclick="window.app.deletePod(${podId}); window.app.closePodMenu();" 
                    class="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Delete Pod
            </button>
        `;
        
        // Position menu near the button
        const rect = event.target.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left - 100}px`;
        
        document.body.appendChild(menu);
        
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', this.closePodMenu, { once: true });
        }, 10);
    }

    closePodMenu() {
        const menu = document.getElementById('pod-menu');
        if (menu) {
            menu.remove();
        }
    }

    async deletePod(podId) {
        try {
            const response = await fetch(`${Config.API_BASE}/pods/${podId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                MessageUI.show('Pod deleted successfully', 'success');
                // Refresh the pods display
                if (this.library.podLibrary && this.library.podLibrary.refresh) {
                    await this.library.podLibrary.refresh();
                }
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete pod');
            }
        } catch (error) {
            console.error('Error deleting pod:', error);
            MessageUI.show('Error deleting pod: ' + error.message, 'error');
        }
    }

    showDeletePodModal(podId, podName, deckCount, cardCount) {
        // Delegate to the pod library instance
        if (this.library.podLibrary && this.library.podLibrary.showDeletePodModal) {
            this.library.podLibrary.showDeletePodModal(podId, podName, deckCount, cardCount);
        }
    }
}

// Initialize app when DOM is ready
window.addEventListener('load', async () => {
    new FlashPodApp();
});
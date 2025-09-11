// static/js/app.js - Main Application Entry Point
import { Config } from './core/config.js';
import { DarkModeToggle } from './ui/dark-mode-toggle.js';
import { DashboardStats } from './features/dashboard-stats.js';
import { DeckEditor } from './features/deck-editor.js';
import { DeckLibrary } from './features/deck-library.js';
import { DeckManager } from './features/deck-manager.js';
import { ImportManager } from './features/import-manager.js';
import { MessageUI } from './ui/message.js';
import { MobileNavigation } from './ui/mobile-navigation.js';
import { Navigation } from './ui/navigation.js';
import { timezoneHandler } from './utils/timezone.js'; 
import { UserService } from './services/user-service.js';


class FlashPodApp {
    constructor() {
        // Set global API base for compatibility
        window.API_BASE = Config.API_BASE;
        
        // Initialize modules
        this.navigation = new Navigation();
        this.mobileNavigation = new MobileNavigation();
        this.library = new DeckLibrary();
        this.deckManager = new DeckManager(this.navigation);
        this.deckEditor = new DeckEditor(this.navigation);
        this.importManager = new ImportManager(this.navigation);
        this.darkModeToggle = new DarkModeToggle();
        this.dashboardStats = new DashboardStats();
        
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
                this.library.loadAllDecks();
            }

            if (navId === 'home') {
                this.dashboardStats.init();
                this.library.loadRecentDecks();
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
            const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
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
}

// Initialize app when DOM is ready
window.addEventListener('load', async () => {
    new FlashPodApp();
});
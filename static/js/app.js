// static/js/app.js - Main Application Entry Point
import { Config } from './core/config.js';
import { UserService } from './services/user-service.js';
import { Navigation } from './ui/navigation.js';
import { MobileNavigation } from './ui/mobile-navigation.js';
import { MessageUI } from './ui/message.js';
import { DeckLibrary } from './features/deck-library.js';
import { DeckManager } from './features/deck-manager.js';
import { DeckEditor } from './features/deck-editor.js';
import { ImportManager } from './features/import-manager.js';

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
        
        // Expose global methods for onclick handlers
        window.app = this;
        
        this.init();
    }

    init() {
        // Load user info
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

    // Utility methods for mobile navigation integration
    isMobileNavigationOpen() {
        return this.mobileNavigation.isNavigationOpen();
    }

    closeMobileNavigation() {
        this.mobileNavigation.forceClose();
    }
}

// Initialize app when DOM is ready
window.addEventListener('load', () => {
    new FlashPodApp();
});
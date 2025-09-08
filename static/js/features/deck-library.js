// static/js/features/deck-library.js
import { DeckService } from '../services/deck-service.js';
import { MessageUI } from '../ui/message.js';

export class DeckLibrary {
    constructor() {
        this.decks = [];
    }

    async loadRecentDecks() {
        try {
            const data = await DeckService.getMyDecksWithStats(); 
            this.decks = data.decks;
            this.displayRecentDecks(data.decks.slice(0, 6));
        } catch (error) {
            console.error('Failed to load recent decks:', error);
        }
    }

    async loadAllDecks() {
        try {
            const data = await DeckService.getMyDecksWithStats();
            this.decks = data.decks;
            this.displayAllDecks(data.decks);
        } catch (error) {
            console.error('Failed to load decks:', error);
        }
    }

    displayRecentDecks(decks) {
        const container = document.getElementById('recent-decks');
        if (!container) return;
        
        if (decks.length === 0) {
            container.innerHTML = this.getEmptyDecksHTML();
            return;
        }
        
        container.innerHTML = decks.map(deck => this.getRecentDeckCardHTML(deck)).join('');
    }

    displayAllDecks(decks) {
        const container = document.getElementById('decks-container');
        if (!container) return;
        
        if (decks.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                    <p>No decks yet. Create your first deck to get started!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = decks.map(deck => this.getDeckCardHTML(deck)).join('');
    }

    getEmptyDecksHTML() {
        return `
            <div class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <p>No decks yet. Create your first deck to get started!</p>
            </div>
        `;
    }

    getRecentDeckCardHTML(deck) {
        const statsHTML = this.getSessionStatsHTML(deck.session_stats);
        
        return `
            <div class="deck-card-mobile bg-gray-50 dark:bg-gray-700 rounded-lg p-3 md:p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer border border-transparent dark:border-gray-600">
                <div class="deck-content">
                    <div class="deck-header">
                        <h4 class="font-medium text-gray-900 dark:text-white mb-1">${deck.name}</h4>
                        <p class="text-sm text-gray-500 dark:text-gray-300 mb-2">${deck.description || 'No description'}</p>
                    </div>
                    
                    <div class="deck-footer">
                        <div class="deck-info">
                            <span class="text-sm text-gray-500 dark:text-gray-400">${deck.card_count} cards</span>
                            ${statsHTML}
                        </div>
                        <button onclick="window.app.studyDeck(${deck.id})" 
                                class="bg-blue-600 dark:bg-blue-500 text-white px-3 py-1.5 rounded text-xs md:text-sm hover:bg-blue-700 dark:hover:bg-blue-600 cursor-pointer transition-colors flex-shrink-0">
                            Study
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getDeckCardHTML(deck) {
        const statsHTML = this.getSessionStatsHTML(deck.session_stats);
        
        return `
            <div class="deck-card-mobile bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6 hover:shadow-md dark:hover:shadow-gray-900/20 transition-all duration-300">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">${deck.name}</h3>
                <p class="text-gray-600 dark:text-gray-300 mb-3 text-sm md:text-base">${deck.description || 'No description'}</p>
                <div class="deck-footer">
                    <div class="deck-info">
                        <span class="text-sm text-gray-500 dark:text-gray-400">${deck.card_count} cards</span>
                        ${statsHTML}
                    </div>
                    <div class="deck-actions">
                        <button onclick="window.app.studyDeck(${deck.id})" 
                                class="bg-blue-600 dark:bg-blue-500 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 dark:hover:bg-blue-600 cursor-pointer transition-colors">
                            Study
                        </button>
                        <button onclick="window.app.editDeck(${deck.id})" 
                                class="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-3 py-1.5 rounded text-sm hover:bg-yellow-200 dark:hover:bg-yellow-800 cursor-pointer transition-colors">
                            Edit
                        </button>
                        <button onclick="window.app.exportDeck(${deck.id})" 
                                class="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1.5 rounded text-sm hover:bg-green-200 dark:hover:bg-green-800 cursor-pointer transition-colors">
                            Export
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getSessionStatsHTML(stats) {
        if (!stats) return '';
        
        if (stats.mode === 'simple-spaced') {
            const lastReviewDate = new Date(stats.last_reviewed);
            const formattedDate = lastReviewDate.toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric' 
            });
            
            return `<span class="deck-stats-mobile text-xs text-gray-500 dark:text-gray-400">📅 ${formattedDate} • 📊 ${stats.retention_rate}% • ⏱️ ${stats.duration_minutes}m</span>`;
            
        } else if (stats.mode === 'full-spaced') {
            const nextReviewDate = stats.next_review ? new Date(stats.next_review) : null;
            const isOverdue = stats.is_overdue;
            
            let nextReviewText = 'No reviews';
            let dateClass = 'text-gray-500 dark:text-gray-400';
            
            if (nextReviewDate) {
                nextReviewText = nextReviewDate.toLocaleDateString('en-US', { 
                    month: 'short', day: 'numeric' 
                });
                dateClass = isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400';
            }
            
            return `<span class="deck-stats-mobile text-xs ${dateClass}">🔔 ${nextReviewText} • 📝 ${stats.cards_due} • 📊 ${stats.retention_rate}%</span>`;
        }
        
        return '';
    }
}
// static/js/features/deck-library.js
import { DeckService } from '../services/deck-service.js';
import { MessageUI } from '../ui/message.js';
import { timezoneHandler } from '../utils/timezone.js';

export class DeckLibrary {
    constructor() {
        this.decks = [];
    }

    async loadRecentDecks() {
        try {
            const data = await DeckService.getMyDecksWithStats(); 
            this.decks = data.decks;
            
            // Filter and sort decks by actual review time
            const recentlyReviewedDecks = data.decks
                .filter(deck => deck.session_stats !== null)
                .sort((a, b) => {
                    // Get the review date for sorting
                    const dateA = a.session_stats.mode === 'simple-spaced' 
                        ? new Date(a.session_stats.last_reviewed)
                        : new Date(a.session_stats.next_review); // For SM-2, use next_review as proxy
                    const dateB = b.session_stats.mode === 'simple-spaced'
                        ? new Date(b.session_stats.last_reviewed) 
                        : new Date(b.session_stats.next_review); // For SM-2, use next_review as proxy
                    return dateB - dateA; // Most recent first
                })
                .slice(0, 6); // Take first 6 after sorting
                
            this.displayRecentDecks(recentlyReviewedDecks);
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
            <div class="deck-card-mobile bg-gray-50 dark:bg-gray-700 rounded-lg p-3 md:p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer border border-transparent dark:border-gray-600 relative group" 
                onclick="window.app.studyDeck(${deck.id})">
                
                <!-- Action buttons in top-right -->
                <div class="absolute top-3 right-3 flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onclick="event.stopPropagation(); window.app.editDeck(${deck.id})" 
                            class="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 cursor-pointer rounded-full transition-colors"
                            title="Edit deck">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button onclick="event.stopPropagation(); window.app.exportDeck(${deck.id})" 
                            class="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer rounded-full transition-colors"
                            title="Export deck">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-4-4m4 4l4-4m5-2V7a2 2 0 00-2-2H7a2 2 0 00-2-2v3"/>
                        </svg>
                    </button>
                </div>
                
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 pr-16">${deck.name}</h3>
                <p class="text-gray-600 dark:text-gray-300 mb-3 text-sm md:text-base">${deck.description || 'No description'}</p>
                <div class="deck-footer">
                    <div class="deck-info">
                        <span class="text-sm text-gray-500 dark:text-gray-400">${deck.card_count} cards</span>
                        ${statsHTML}
                    </div>
                </div>
            </div>
        `;
    }

    getDeckCardHTML(deck) {
        const statsHTML = this.getSessionStatsHTML(deck.session_stats);
        
        return `
            <div class="deck-card-mobile bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6 hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 cursor-pointer relative group" 
                onclick="window.app.studyDeck(${deck.id})">
                
                <!-- Action buttons in top-right -->
                <div class="absolute top-3 right-3 flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onclick="event.stopPropagation(); window.app.editDeck(${deck.id})" 
                            class="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 cursor-pointer rounded-full transition-colors"
                            title="Edit deck">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button onclick="event.stopPropagation(); window.app.exportDeck(${deck.id})" 
                            class="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer rounded-full transition-colors"
                            title="Export deck">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-4-4m4 4l4-4m5-2V7a2 2 0 00-2-2H7a2 2 0 00-2-2v3"/>
                        </svg>
                    </button>
                </div>
                
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 pr-16">${deck.name}</h3>
                <p class="text-gray-600 dark:text-gray-300 mb-3 text-sm md:text-base">${deck.description || 'No description'}</p>
                <div class="deck-footer">
                    <div class="deck-info">
                        <span class="text-sm text-gray-500 dark:text-gray-400">${deck.card_count} cards</span>
                        ${statsHTML}
                    </div>
                </div>
            </div>
        `;
    }

    getSessionStatsHTML(stats) {
        if (!stats) return '';
        
        if (stats.mode === 'simple-spaced') {
            const formattedDate = timezoneHandler.formatDateInServerTimezone(
            stats.last_reviewed,
            { month: 'short', day: 'numeric' }
        );
            
            return `<span class="deck-stats-mobile text-xs text-gray-500 dark:text-gray-400">📅 ${formattedDate} • 📊 ${stats.retention_rate}% • ⏱️ ${stats.duration_minutes}m</span>`;
            
        } else if (stats.mode === 'full-spaced') {
            const nextReviewDate = stats.next_review ? new Date(stats.next_review) : null;
            const isOverdue = stats.is_overdue;
            
            let nextReviewText = 'No reviews';
            let dateClass = 'text-gray-500 dark:text-gray-400';
            
            if (nextReviewDate) {
                nextReviewText = timezoneHandler.formatDateInServerTimezone(
                    stats.next_review,
                    { month: 'short', day: 'numeric' }
                );
                dateClass = isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400';
            }
            
            return `<span class="deck-stats-mobile text-xs ${dateClass}">🔔 ${nextReviewText} • 📝 ${stats.cards_due} • 📊 ${stats.retention_rate}%</span>`;
        }
        
        return '';
    }
}
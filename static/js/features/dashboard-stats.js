// static/js/features/dashboard-stats.js
export class DashboardStats {
    constructor() {
        this.apiBase = '/api/dashboard';
    }

    async loadStats() {
        try {
            const response = await fetch(`${this.apiBase}/stats`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.updateStatsDisplay(result.data);
            } else {
                throw new Error(result.error || 'Failed to load stats');
            }
            
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.showStatsError();
        }
    }

    updateStatsDisplay(stats) {
        const elements = {
            'cards-learned': stats.formatted.cards_learned,
            'retention-rate': stats.formatted.retention_rate,
            'total-reviews': stats.formatted.total_reviews,
            'study-time': stats.formatted.study_time
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    showStatsError() {
        const errorElements = ['cards-learned', 'retention-rate', 'total-reviews', 'study-time'];
        errorElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '--';
            }
        });
    }

    init() {
        this.loadStats();
        
        // Auto-refresh every 5 minutes
        setInterval(() => {
            this.loadStats();
        }, 5 * 60 * 1000);
    }
}
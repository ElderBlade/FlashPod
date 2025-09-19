// static/js/services/pod-service.js
import { Config } from '../core/config.js';

export class PodService {
    static async getAllPods() {
        try {
            const response = await fetch(`${Config.API_BASE}/pods/my-pods`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching pods:', error);
            throw error;
        }
    }

    static async getPod(podId) {
        try {
            const response = await fetch(`${Config.API_BASE}/pods/${podId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching pod:', error);
            throw error;
        }
    }

    static async createPod(name, description = '') {
        try {
            // Get user_id from localStorage (following existing pattern)
            const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
            const userId = userInfo.id;

            if (!userId) {
                throw new Error('User not authenticated');
            }

            const response = await fetch(`${Config.API_BASE}/pods`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    name,
                    description
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating pod:', error);
            throw error;
        }
    }

    static async updatePod(podId, data) {
        try {
            const response = await fetch(`${Config.API_BASE}/pods/${podId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating pod:', error);
            throw error;
        }
    }

    static async deletePod(podId) {
        try {
            const response = await fetch(`${Config.API_BASE}/pods/${podId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting pod:', error);
            throw error;
        }
    }

    static async addDeckToPod(podId, deckId, displayOrder = 0) {
        try {
            const response = await fetch(`${Config.API_BASE}/pods/${podId}/decks`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    deck_id: deckId,
                    display_order: displayOrder
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error adding deck to pod:', error);
            throw error;
        }
    }

    static async removeDeckFromPod(podId, deckId) {
        try {
            const response = await fetch(`${Config.API_BASE}/pods/${podId}/decks/${deckId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error removing deck from pod:', error);
            throw error;
        }
    }

    static async reorderPodDecks(podId, deckOrders) {
        try {
            const response = await fetch(`${Config.API_BASE}/pods/${podId}/decks/reorder`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    deck_orders: deckOrders
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error reordering pod decks:', error);
            throw error;
        }
    }

    static async getPodCards(podId) {
        try {
            const response = await fetch(`${Config.API_BASE}/pods/${podId}/cards`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching pod cards:', error);
            throw error;
        }
    }
}
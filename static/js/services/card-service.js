// static/js/services/card-service.js
import { API } from '../core/api.js';

export class CardService {
    static async getCardsForDeck(deckId) {
        const response = await API.get(`/cards/deck/${deckId}`);
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to load cards');
    }

    static async createCard(deckId, cardData) {
        const response = await API.post(`/cards/deck/${deckId}`, cardData);
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to create card');
    }

    static async updateCard(cardId, cardData) {
        const response = await API.put(`/cards/${cardId}`, cardData);
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to update card');
    }

    static async deleteCard(cardId) {
        const response = await API.delete(`/cards/${cardId}`);
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to delete card');
    }

    static async reorderCards(deckId, cardOrders) {
        const response = await API.put(`/cards/deck/${deckId}/reorder`, { card_orders: cardOrders });
        if (response.ok) {
            return await response.json();
        }
        // Don't throw error for reorder failures
        console.warn('Failed to update card order');
        return null;
    }
}
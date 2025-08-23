// static/js/services/deck-service.js
import { API } from '../core/api.js';

export class DeckService {
    static async getMyDecks() {
        const response = await API.get('/decks/my-decks');
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to load decks');
    }

    static async getDeck(deckId) {
        const response = await API.get(`/decks/${deckId}`);
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to load deck');
    }

    static async createDeck(name, description) {
        const response = await API.post('/decks', { name, description });
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to create deck');
    }

    static async updateDeck(deckId, data) {
        const response = await API.put(`/decks/${deckId}`, data);
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to update deck');
    }

    static async deleteDeck(deckId) {
        const response = await API.delete(`/decks/${deckId}`);
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to delete deck');
    }
}
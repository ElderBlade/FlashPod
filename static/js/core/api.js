// static/js/core/api.js
import { Config } from './config.js';

export class API {
    static async request(endpoint, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const response = await fetch(
            `${Config.API_BASE}${endpoint}`,
            { ...defaultOptions, ...options }
        );

        if (!response.ok && response.status === 401) {
            window.location.href = Config.ROUTES.LOGIN;
            throw new Error('Unauthorized');
        }

        return response;
    }

    static async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}
// static/js/core/storage.js
import { Config } from './config.js';

export class Storage {
    static getUser() {
        const savedUser = localStorage.getItem(Config.STORAGE_KEYS.USER);
        return savedUser ? JSON.parse(savedUser) : null;
    }

    static setUser(user) {
        localStorage.setItem(Config.STORAGE_KEYS.USER, JSON.stringify(user));
    }

    static clearUser() {
        localStorage.removeItem(Config.STORAGE_KEYS.USER);
    }
}
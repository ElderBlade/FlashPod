// static/js/services/user-service.js
import { Storage } from '../core/storage.js';
import { Config } from '../core/config.js';

export class UserService {
    static loadUserInfo() {
        const user = Storage.getUser();
        if (!user) {
            window.location.href = Config.ROUTES.LOGIN;
            return null;
        }
        
        this.updateUserUI(user);
        return user;
    }

    static updateUserUI(user) {
        const greetingEl = document.getElementById('userGreeting');
        const initialsEl = document.getElementById('userInitials');
        
        if (greetingEl) greetingEl.textContent = user.username;
        if (initialsEl) {
            const initials = user.username.substring(0, 2).toUpperCase();
            initialsEl.textContent = initials;
        }
    }

    static logout() {
        Storage.clearUser();
        window.location.href = Config.ROUTES.LOGOUT;
    }
}
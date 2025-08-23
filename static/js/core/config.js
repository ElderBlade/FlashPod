// static/js/core/config.js
export const Config = {
    API_BASE: window.location.hostname === 'localhost' 
        ? 'http://localhost:8000/api'
        : '/api',
    
    MESSAGE_TIMEOUT: 5000,
    
    ROUTES: {
        LOGIN: '/login',
        LOGOUT: '/logout',
        DASHBOARD: '/dashboard'
    },
    
    STORAGE_KEYS: {
        USER: 'flashpod_user'
    }
};
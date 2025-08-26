// static/js/core/config.js
export const Config = {
    // Use dynamic API base that works with any port
    API_BASE: window.location.origin + '/api',
    
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

// Debug logging
console.log('🔧 Config API_BASE:', Config.API_BASE);
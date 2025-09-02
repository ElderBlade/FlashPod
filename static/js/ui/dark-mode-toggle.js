// static/js/ui/dark-mode-toggle.js
export class DarkModeToggle {
    constructor() {
        this.toggle = document.getElementById('dark-mode-toggle');
        this.storageKey = 'flashpod_dark_mode';
        
        this.init();
    }
    
    init() {
        if (!this.toggle) {
            console.warn('DarkModeToggle: Toggle element not found');
            return;
        }
        
        // Force override any existing dark mode state
        document.documentElement.classList.remove('dark');
        
        this.setupEventListeners();
        this.loadSavedTheme();
        
        console.log('Dark mode toggle initialized'); // Debug log
    }
    
    setupEventListeners() {
        this.toggle.addEventListener('change', (e) => {
            console.log('Toggle changed:', e.target.checked); // Debug log
            this.toggleDarkMode();
        });
        
        // Completely disable system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.removeEventListener('change', this.handleSystemThemeChange);
        }
    }
    
    toggleDarkMode() {
        const isDark = this.toggle.checked;
        console.log('Toggling dark mode to:', isDark); // Debug log
        this.setDarkMode(isDark);
    }
    
    setDarkMode(isDark) {
        console.log('Setting dark mode:', isDark); // Debug log
        
        if (isDark) {
            document.documentElement.classList.add('dark');
            this.toggle.checked = true;
            localStorage.setItem(this.storageKey, 'dark');
            console.log('Dark mode enabled'); // Debug log
        } else {
            document.documentElement.classList.remove('dark');
            this.toggle.checked = false;
            localStorage.setItem(this.storageKey, 'light');
            console.log('Dark mode disabled'); // Debug log
        }
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { isDark }
        }));
    }
    
    loadSavedTheme() {
        const savedTheme = localStorage.getItem(this.storageKey);
        console.log('Saved theme:', savedTheme); // Debug log
        
        if (savedTheme) {
            const isDark = savedTheme === 'dark';
            this.setDarkMode(isDark);
        } else {
            // Always start in light mode by default
            this.setDarkMode(false);
            console.log('No saved theme, defaulting to light mode'); // Debug log
        }
    }
    
    isDarkMode() {
        return document.documentElement.classList.contains('dark');
    }
}
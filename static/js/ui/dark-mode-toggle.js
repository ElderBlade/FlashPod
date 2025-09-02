// static/js/ui/dark-mode-toggle.js
export class DarkModeToggle {
    constructor() {
        this.toggle = document.getElementById('dark-mode-toggle');
        this.mobileToggle = document.getElementById('mobile-dark-mode-toggle');
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
        // Desktop toggle
        if (this.toggle) {
            this.toggle.addEventListener('change', (e) => {
                this.setDarkMode(e.target.checked);
                // Sync mobile toggle
                if (this.mobileToggle) {
                    this.mobileToggle.checked = e.target.checked;
                }
            });
        }
        
        // Mobile toggle
        if (this.mobileToggle) {
            this.mobileToggle.addEventListener('change', (e) => {
                this.setDarkMode(e.target.checked);
                // Sync desktop toggle
                if (this.toggle) {
                    this.toggle.checked = e.target.checked;
                }
            });
        }
        
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
        if (isDark) {
            document.documentElement.classList.add('dark');
            if (this.toggle) this.toggle.checked = true;
            if (this.mobileToggle) this.mobileToggle.checked = true;
            localStorage.setItem(this.storageKey, 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            if (this.toggle) this.toggle.checked = false;
            if (this.mobileToggle) this.mobileToggle.checked = false;
            localStorage.setItem(this.storageKey, 'light');
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
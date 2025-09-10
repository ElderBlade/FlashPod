export class TimezoneHandler {
    constructor() {
        this.serverTimezone = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            const response = await fetch('/api/config/timezone');
            if (response.ok) {
                this.serverTimezone = await response.json();
                this.initialized = true;
                console.log(`Server timezone: ${this.serverTimezone.name}`);
            }
        } catch (error) {
            console.error('Failed to load server timezone:', error);
            this.serverTimezone = { name: 'UTC', offset: '+0000', abbreviation: 'UTC' };
            this.initialized = true;
        }
    }

    formatDateInServerTimezone(dateString, options = {}) {
        if (!this.initialized) {
            console.warn('TimezoneHandler not initialized, using local timezone');
            return new Date(dateString).toLocaleDateString('en-US', options);
        }

        const defaultOptions = {
            month: 'short',
            day: 'numeric',
            timeZone: this.serverTimezone.name,
            ...options
        };

        return new Date(dateString).toLocaleDateString('en-US', defaultOptions);
    }

    getCurrentDateInServerTimezone() {
        if (!this.initialized) {
            return new Date();
        }
        
        return new Date(new Date().toLocaleString("en-US", {
            timeZone: this.serverTimezone.name
        }));
    }

    isDateOnOrBeforeToday(date) {
        const today = this.getCurrentDateInServerTimezone();
        const compareDate = new Date(date.toLocaleString("en-US", {
            timeZone: this.serverTimezone.name
        }));
        
        return compareDate.toDateString() <= today.toDateString();
    }
}

export const timezoneHandler = new TimezoneHandler();
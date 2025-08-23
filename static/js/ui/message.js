// static/js/ui/message.js
import { Config } from '../core/config.js';

export class MessageUI {
    static show(message, type = 'info') {
        const container = document.getElementById('messages');
        if (!container) return;

        const messageDiv = document.createElement('div');
        const bgColor = this.getBackgroundColor(type);
        
        messageDiv.className = `${bgColor} text-white px-6 py-4 rounded-lg shadow-lg mb-3 max-w-sm`;
        messageDiv.textContent = message;
        
        container.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, Config.MESSAGE_TIMEOUT);
    }

    static getBackgroundColor(type) {
        const colors = {
            error: 'bg-red-500',
            success: 'bg-green-500',
            info: 'bg-blue-500',
            warning: 'bg-yellow-500'
        };
        return colors[type] || colors.info;
    }
}
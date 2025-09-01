/**
     * Get the target badge element based on response
     */// Card Absorption Animation System
// This replaces the existing showColorEffect method in simple-spaced.js

export class CardAbsorptionAnimator {
    constructor() {
        this.animationInProgress = false;
    }

    /**
     * Main method to trigger card absorption animation
     * @param {string} response - 'remember' or 'dont-remember' 
     * @param {Function} advanceCardCallback - Function to advance to next card
     */
    async showAbsorptionEffect(response, advanceCardCallback) {
        // if (this.animationInProgress) return;
        
        // this.animationInProgress = true;
        const isRemembered = response === 'remember';
        
        // Option 2: Card shrinks and flies to counter
        await this._cardFlyToCounter(isRemembered, advanceCardCallback);
        
        // this.animationInProgress = false;
    }

    /**
     * Option 2: Card shrinks and flies to the appropriate counter
     */
    async _cardFlyToCounter(isRemembered, advanceCardCallback) {
        const flashcard = document.getElementById('flashcard');
        const targetBadge = this._getTargetBadge(isRemembered);
        
        if (!flashcard || !targetBadge) return;
        
        // Create a clone for THIS specific animation
        const cardClone = this._createCardClone(flashcard);
        
        // Get positions at the time this animation starts
        const cardRect = flashcard.getBoundingClientRect();
        const targetRect = targetBadge.getBoundingClientRect();
        
        // Calculate movement
        const deltaX = targetRect.left + targetRect.width/2 - (cardRect.left + cardRect.width/2);
        const deltaY = targetRect.top + targetRect.height/2 - (cardRect.top + cardRect.height/2);
        
        // Add the clone to DOM first
        document.body.appendChild(cardClone);
        
        // Add trail effect
        this._addTrailEffect(cardClone, isRemembered);
        
        return new Promise((resolve) => {
            // Advance card immediately - each animation advances independently
            if (advanceCardCallback) {
                advanceCardCallback();
            }
            
            // Start the flying animation
            requestAnimationFrame(() => {
                cardClone.style.transform = `
                    translate(${deltaX}px, ${deltaY}px) 
                    scale(0.1) 
                    rotate(${isRemembered ? 360 : -360}deg)
                `;
                cardClone.style.opacity = '0.3';
            });
            
            // Counter pulse effect
            setTimeout(() => {
                this._pulseCounter(targetBadge, isRemembered);
            }, 400);
            
            // Cleanup this specific animation
            setTimeout(() => {
                cardClone.remove();
                resolve();
            }, 1200);
        });
    }

    /**
     * Create a clone of the card for animation
     */
    _createCardClone(originalCard) {
        const clone = originalCard.cloneNode(true);
        const rect = originalCard.getBoundingClientRect();
        
        clone.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            z-index: 1000;
            pointer-events: none;
            transition: all 1s cubic-bezier(0.25, 0.8, 0.25, 1);
            transform-origin: center center;
        `;
        
        return clone;
    }

    /**
     * Create a subtle overlay for magical effect without interfering with flip
     */
    _createCardOverlay(flashcard, isRemembered) {
        const rect = flashcard.getBoundingClientRect();
        const color = isRemembered ? '#10b981' : '#f59e0b';
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            background: ${color}20;
            border: 2px solid ${color};
            border-radius: 0.75rem;
            z-index: 999;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.8s ease-out;
            box-shadow: 0 0 20px ${color}40;
        `;
        
        document.body.appendChild(overlay);
        return overlay;
    }
    _getTargetBadge(isRemembered) {
        const modeIndicator = document.getElementById('modeIndicator');
        if (!modeIndicator) return null;
        
        // Look for the appropriate badge
        const badges = modeIndicator.querySelectorAll('span');
        for (const badge of badges) {
            const text = badge.textContent;
            if (isRemembered && text.includes('Known:')) {
                return badge;
            } else if (!isRemembered && text.includes('Still Learning:')) {
                return badge;
            }
        }
        
        return null;
    }

    /**
     * Add a trail effect to the moving card
     */
    _addTrailEffect(element, isRemembered) {
        const color = isRemembered ? '#10b981' : '#f59e0b'; // Green for known, orange for still learning
        
        element.style.boxShadow = `
            0 0 20px ${color}40,
            0 0 40px ${color}20,
            0 0 60px ${color}10
        `;
        
        // Add a subtle glow animation
        element.style.animation = `cardGlow 1s ease-out`;
        
        // Inject keyframes if not already present
        if (!document.querySelector('#cardAbsorptionKeyframes')) {
            const style = document.createElement('style');
            style.id = 'cardAbsorptionKeyframes';
            style.textContent = `
                @keyframes cardGlow {
                    0% { filter: brightness(1) saturate(1); }
                    50% { filter: brightness(1.2) saturate(1.5); }
                    100% { filter: brightness(1) saturate(1); }
                }
                
                @keyframes counterPulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                
                @keyframes sparkle {
                    0% { opacity: 1; transform: scale(0) rotate(0deg); }
                    50% { opacity: 1; transform: scale(1) rotate(180deg); }
                    100% { opacity: 0; transform: scale(0) rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Animate sparkle particles to target
     */
    _animateParticlesToTarget(particles, target) {
        const targetRect = target.getBoundingClientRect();
        
        particles.forEach((particle, index) => {
            const delay = index * 50; // Stagger the particles
            const angle = (index / particles.length) * 2 * Math.PI;
            const radius = 100;
            
            setTimeout(() => {
                const midX = targetRect.left + targetRect.width/2 + Math.cos(angle) * radius;
                const midY = targetRect.top + targetRect.height/2 + Math.sin(angle) * radius;
                
                particle.style.transition = 'all 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)';
                particle.style.animation = 'sparkle 0.8s ease-out';
                
                // First move to intermediate position, then to target
                requestAnimationFrame(() => {
                    particle.style.left = midX + 'px';
                    particle.style.top = midY + 'px';
                    
                    setTimeout(() => {
                        particle.style.left = (targetRect.left + targetRect.width/2) + 'px';
                        particle.style.top = (targetRect.top + targetRect.height/2) + 'px';
                        particle.style.opacity = '0';
                    }, 400);
                });
            }, delay);
        });
    }

    /**
     * Make the target counter pulse to show it received the card
     */
    _pulseCounter(badge, isRemembered) {
        const originalTransform = badge.style.transform;
        const color = isRemembered ? '#10b981' : '#f59e0b';
        
        // badge.style.animation = 'counterPulse 0.6s ease-out';
        // badge.style.boxShadow = `0 0 15px ${color}40`;
        
        badge.style.transition = 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), box-shadow 0.4s ease-out';
        badge.style.boxShadow = `0 0 20px ${color}60`;
        
        // Scale up immediately
        badge.style.transform = 'scale(1.4)'; // Bigger pulse - you can adjust this number

        setTimeout(() => {
            badge.style.animation = '';
            badge.style.boxShadow = '';
            badge.style.transform = originalTransform;
        }, 500);
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove any remaining animation clones
        const clones = document.querySelectorAll('[style*="position: fixed"][style*="z-index: 1000"]');
        clones.forEach(clone => clone.remove());
    }
}
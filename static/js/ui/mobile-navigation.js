// static/js/ui/mobile-navigation.js
export class MobileNavigation {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.hamburger = document.getElementById('hamburger');
        this.overlay = document.getElementById('overlay');
        this.navItems = document.querySelectorAll('.nav-item');
        
        this.isOpen = false;
        this.breakpoint = 768;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.preventBodyScroll();
        this.handleInitialState();
    }
    
    setupEventListeners() {
        // Hamburger click handler
        this.hamburger?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSidebar();
        });
        
        // Overlay click handler
        this.overlay?.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeSidebar();
        });
        
        // Navigation item click handler (close sidebar on mobile)
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (this.isMobile()) {
                    // Add small delay to allow navigation to process
                    setTimeout(() => this.closeSidebar(), 100);
                }
                this.setActiveNav(item);
            });
        });
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeSidebar();
            }
        });
        
        // Prevent clicks inside sidebar from closing it
        this.sidebar?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    toggleSidebar() {
        if (this.isOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }
    
    openSidebar() {
        if (!this.isMobile()) return;
        
        this.isOpen = true;
        this.sidebar?.classList.add('open');
        this.hamburger?.classList.add('open');
        this.overlay?.classList.add('show');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        
        // Accessibility
        this.sidebar?.setAttribute('aria-hidden', 'false');
        this.hamburger?.setAttribute('aria-expanded', 'true');
        
        // Focus management - focus first nav item
        const firstNavItem = this.sidebar?.querySelector('.nav-item');
        firstNavItem?.focus();
    }
    
    closeSidebar() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.sidebar?.classList.remove('open');
        this.hamburger?.classList.remove('open');
        this.overlay?.classList.remove('show');
        
        // Restore body scroll
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        
        // Accessibility
        this.sidebar?.setAttribute('aria-hidden', 'true');
        this.hamburger?.setAttribute('aria-expanded', 'false');
        
        // Focus management - return focus to hamburger
        if (this.isMobile()) {
            this.hamburger?.focus();
        }
    }
    
    handleResize() {
        const wasMobile = this.lastWindowWidth <= this.breakpoint;
        const isMobile = window.innerWidth <= this.breakpoint;
        
        // Close sidebar when resizing to desktop
        if (wasMobile && !isMobile && this.isOpen) {
            this.closeSidebar();
        }
        
        // Reset states when switching between mobile and desktop
        if (wasMobile !== isMobile) {
            this.handleInitialState();
        }
        
        this.lastWindowWidth = window.innerWidth;
    }
    
    handleInitialState() {
        if (this.isMobile()) {
            // Mobile setup
            this.sidebar?.setAttribute('aria-hidden', 'true');
            this.hamburger?.setAttribute('aria-expanded', 'false');
            this.hamburger?.setAttribute('aria-label', 'Toggle navigation menu');
        } else {
            // Desktop setup
            this.sidebar?.setAttribute('aria-hidden', 'false');
            this.sidebar?.removeAttribute('aria-expanded');
            
            // Ensure sidebar is visible and body scroll is enabled
            this.sidebar?.classList.remove('open');
            this.hamburger?.classList.remove('open');
            this.overlay?.classList.remove('show');
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            this.isOpen = false;
        }
    }
    
    isMobile() {
        return window.innerWidth <= this.breakpoint;
    }
    
    setActiveNav(activeItem) {
        this.navItems.forEach(item => item.classList.remove('active'));
        activeItem.classList.add('active');
    }
    
    preventBodyScroll() {
        let startY = 0;
        let startX = 0;
        
        // Prevent iOS bounce scroll when sidebar is open
        document.addEventListener('touchstart', (e) => {
            if (this.isOpen) {
                startY = e.touches[0].clientY;
                startX = e.touches[0].clientX;
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (this.isOpen && !this.sidebar?.contains(e.target)) {
                // Allow scrolling within the sidebar
                const deltaY = e.touches[0].clientY - startY;
                const deltaX = e.touches[0].clientX - startX;
                
                // If it's a significant horizontal swipe (swipe to close)
                if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50) {
                    this.closeSidebar();
                }
                
                // Prevent vertical scrolling outside sidebar
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    // Public API methods
    isNavigationOpen() {
        return this.isOpen;
    }
    
    forceClose() {
        if (this.isOpen) {
            this.closeSidebar();
        }
    }
    
    // Swipe gesture support
    addSwipeSupport() {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            currentX = startX;
            
            // Only detect swipe from left edge on mobile when closed
            if (!this.isOpen && this.isMobile() && startX < 20) {
                isDragging = true;
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            const diffX = currentX - startX;
            
            // Open sidebar with swipe from left edge
            if (diffX > 50 && !this.isOpen) {
                this.openSidebar();
                isDragging = false;
            }
        }, { passive: true });
        
        document.addEventListener('touchend', () => {
            isDragging = false;
        }, { passive: true });
    }
    
    // Initialize swipe support
    enableSwipeGestures() {
        this.addSwipeSupport();
    }
}
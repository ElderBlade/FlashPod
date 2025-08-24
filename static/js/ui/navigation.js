// static/js/ui/navigation.js
export class Navigation {
    constructor() {
        this.navItems = document.querySelectorAll('.nav-item');
        this.pageViews = document.querySelectorAll('.page-view');
        this.pageInfo = {
            'home': {
                title: 'Dashboard',
                subtitle: 'Welcome back! Here\'s your learning progress.'
            },
            'library': {
                title: 'Library',
                subtitle: 'Manage your flashcard decks and collections.'
            },
            'flashcards': {
                title: 'Flash Cards',
                subtitle: 'Study your cards with spaced repetition.'
            },
            'new-deck': {
                title: 'Create New Deck',
                subtitle: 'Add a new deck to your collection.'
            },
            'import': {
                title: 'Import Decks',
                subtitle: 'Import decks from files or other sources.'
            },
            'edit-deck': {
                title: 'Edit Deck',
                subtitle: 'Modify your deck and cards.'
            }
        };
    }

    init() {
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => this.handleNavClick(e, item));
        });
    }

    handleNavClick(e, item) {
        e.preventDefault();
        
        this.navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        this.pageViews.forEach(view => view.classList.add('hidden'));
        
        const navId = item.id.replace('nav-', '');
        const targetView = this.getTargetView(navId);
        
        if (targetView) {
            targetView.classList.remove('hidden');
            this.updatePageHeader(navId);
            this.onNavigate(navId);
        }
    }

    getTargetView(navId) {
        if (navId === 'home') {
            return document.getElementById('dashboard-view');
        }
        return document.getElementById(`${navId}-view`);
    }

    updatePageHeader(page) {
        const info = this.pageInfo[page] || this.pageInfo['home'];
        
        // Update desktop headers
        const titleElement = document.getElementById('page-title');
        const subtitleElement = document.getElementById('page-subtitle');
        if (titleElement) titleElement.textContent = info.title;
        if (subtitleElement) subtitleElement.textContent = info.subtitle;
        
        // Update mobile headers
        const mobilePageTitle = document.getElementById('mobile-page-title');
        const mobilePageSubtitle = document.getElementById('mobile-page-subtitle');
        if (mobilePageTitle) mobilePageTitle.textContent = info.title;
        if (mobilePageSubtitle) mobilePageSubtitle.textContent = info.subtitle;
    }

    navigateTo(viewId) {
        const navItem = document.getElementById(`nav-${viewId}`);
        if (navItem) {
            navItem.click();
        }
    }

    setActiveNav(navId) {
        this.navItems.forEach(nav => nav.classList.remove('active'));
        const activeNav = document.getElementById(`nav-${navId}`);
        if (activeNav) {
            activeNav.classList.add('active');
        }
    }

    showView(viewId) {
        this.pageViews.forEach(view => view.classList.add('hidden'));
        const targetView = this.getTargetView(viewId);
        if (targetView) {
            targetView.classList.remove('hidden');
            this.updatePageHeader(viewId);
            this.setActiveNav(viewId);
        }
    }

    onNavigate(navId) {
        // Override in main app to handle navigation events
    }
}
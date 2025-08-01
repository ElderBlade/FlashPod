-- Flashcard Web App Database Schema
-- Designed for SQLite with PostgreSQL migration compatibility

-- Users table - handles authentication and user preferences
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    preferences JSON DEFAULT '{}' -- Store UI preferences, study settings, etc.
);

-- Pods table - collections of decks for grouped studying
CREATE TABLE pods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deck_count INTEGER DEFAULT 0, -- Denormalized for performance
    total_card_count INTEGER DEFAULT 0, -- Total cards across all decks
    study_settings JSON DEFAULT '{}', -- Pod-level study settings
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Decks table - collections of flashcards
CREATE TABLE decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    card_count INTEGER DEFAULT 0, -- Denormalized for performance
    study_settings JSON DEFAULT '{}', -- Spaced repetition settings, etc.
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Pod decks junction table - many-to-many relationship between pods and decks
CREATE TABLE pod_decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pod_id INTEGER NOT NULL,
    deck_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    display_order INTEGER DEFAULT 0, -- For custom ordering within pod
    FOREIGN KEY (pod_id) REFERENCES pods(id) ON DELETE CASCADE,
    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
    UNIQUE(pod_id, deck_id)
);

-- Cards table - individual flashcards
CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER NOT NULL,
    front_content TEXT NOT NULL,
    back_content TEXT NOT NULL,
    front_type VARCHAR(20) DEFAULT 'text', -- 'text', 'html', 'markdown'
    back_type VARCHAR(20) DEFAULT 'text',
    difficulty INTEGER DEFAULT 0, -- 0=new, 1=easy, 2=good, 3=hard
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    tags TEXT, -- Comma-separated tags for simple searching
    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);

-- Study sessions - track when users study decks or pods
CREATE TABLE study_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    deck_id INTEGER, -- NULL when studying a pod
    pod_id INTEGER, -- NULL when studying a single deck
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    cards_studied INTEGER DEFAULT 0,
    cards_correct INTEGER DEFAULT 0,
    session_type VARCHAR(20) DEFAULT 'review', -- 'review', 'learn', 'cram'
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
    FOREIGN KEY (pod_id) REFERENCES pods(id) ON DELETE CASCADE,
    CHECK ((deck_id IS NULL) != (pod_id IS NULL)) -- Ensure exactly one is set
);

-- Card reviews - individual card study attempts (spaced repetition data)
CREATE TABLE card_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    session_id INTEGER,
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    response_quality INTEGER NOT NULL, -- 1-5 scale (1=again, 5=easy)
    response_time INTEGER, -- Time in milliseconds
    ease_factor REAL DEFAULT 2.5, -- Spaced repetition ease factor
    interval_days INTEGER DEFAULT 1, -- Days until next review
    next_review_date DATETIME,
    repetitions INTEGER DEFAULT 0, -- Number of successful repetitions
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE SET NULL
);

-- Shared pods - for sharing pods between users
CREATE TABLE shared_pods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_pod_id INTEGER NOT NULL,
    shared_by_user_id INTEGER NOT NULL,
    shared_with_user_id INTEGER NOT NULL,
    permission_level VARCHAR(20) DEFAULT 'read', -- 'read', 'write'
    shared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (original_pod_id) REFERENCES pods(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(original_pod_id, shared_with_user_id)
);

-- Shared decks - for sharing decks between users
CREATE TABLE shared_decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_deck_id INTEGER NOT NULL,
    shared_by_user_id INTEGER NOT NULL,
    shared_with_user_id INTEGER NOT NULL,
    permission_level VARCHAR(20) DEFAULT 'read', -- 'read', 'write'
    shared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (original_deck_id) REFERENCES decks(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(original_deck_id, shared_with_user_id)
);

-- Categories/Tags table - for better organization (optional enhancement)
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);

-- Pod categories junction table
CREATE TABLE pod_categories (
    pod_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (pod_id, category_id),
    FOREIGN KEY (pod_id) REFERENCES pods(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Deck categories junction table
CREATE TABLE deck_categories (
    deck_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (deck_id, category_id),
    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Statistics table - for analytics and progress tracking
CREATE TABLE user_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    cards_studied INTEGER DEFAULT 0,
    study_time_minutes INTEGER DEFAULT 0,
    cards_learned INTEGER DEFAULT 0,
    accuracy_percentage REAL DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, date)
);

-- Indexes for performance optimization
CREATE INDEX idx_cards_deck_id ON cards(deck_id);
CREATE INDEX idx_cards_difficulty ON cards(difficulty);
CREATE INDEX idx_card_reviews_card_id ON card_reviews(card_id);
CREATE INDEX idx_card_reviews_user_id ON card_reviews(user_id);
CREATE INDEX idx_card_reviews_next_review ON card_reviews(next_review_date);
CREATE INDEX idx_study_sessions_user_deck ON study_sessions(user_id, deck_id);
CREATE INDEX idx_study_sessions_user_pod ON study_sessions(user_id, pod_id);
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_pods_user_id ON pods(user_id);
CREATE INDEX idx_pod_decks_pod_id ON pod_decks(pod_id);
CREATE INDEX idx_pod_decks_deck_id ON pod_decks(deck_id);
CREATE INDEX idx_shared_decks_shared_with ON shared_decks(shared_with_user_id);
CREATE INDEX idx_shared_pods_shared_with ON shared_pods(shared_with_user_id);
CREATE INDEX idx_user_statistics_user_date ON user_statistics(user_id, date);

-- Triggers to maintain pod data consistency
CREATE TRIGGER update_pod_counts_on_deck_add
    AFTER INSERT ON pod_decks
BEGIN
    UPDATE pods 
    SET deck_count = deck_count + 1,
        total_card_count = total_card_count + (
            SELECT card_count FROM decks WHERE id = NEW.deck_id
        ),
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.pod_id;
END;

CREATE TRIGGER update_pod_counts_on_deck_remove
    AFTER DELETE ON pod_decks
BEGIN
    UPDATE pods 
    SET deck_count = deck_count - 1,
        total_card_count = total_card_count - (
            SELECT card_count FROM decks WHERE id = OLD.deck_id
        ),
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = OLD.pod_id;
END;

-- Update pod card counts when deck card counts change
CREATE TRIGGER update_pod_card_count_on_deck_change
    AFTER UPDATE OF card_count ON decks
    WHEN OLD.card_count != NEW.card_count
BEGIN
    UPDATE pods 
    SET total_card_count = total_card_count + (NEW.card_count - OLD.card_count),
        updated_at = CURRENT_TIMESTAMP 
    WHERE id IN (
        SELECT pod_id FROM pod_decks WHERE deck_id = NEW.id
    );
END;

-- Triggers to maintain data consistency
CREATE TRIGGER update_deck_card_count_insert
    AFTER INSERT ON cards
    WHEN NEW.is_active = TRUE
BEGIN
    UPDATE decks 
    SET card_count = card_count + 1, 
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.deck_id;
END;

CREATE TRIGGER update_deck_card_count_delete
    AFTER DELETE ON cards
BEGIN
    UPDATE decks 
    SET card_count = card_count - 1, 
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = OLD.deck_id;
END;

CREATE TRIGGER update_deck_card_count_update
    AFTER UPDATE ON cards
    WHEN OLD.is_active != NEW.is_active
BEGIN
    UPDATE decks 
    SET card_count = card_count + CASE WHEN NEW.is_active THEN 1 ELSE -1 END,
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.deck_id;
END;

-- Update timestamps trigger for users
CREATE TRIGGER update_users_timestamp
    AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamps trigger for decks
CREATE TRIGGER update_decks_timestamp
    AFTER UPDATE ON decks
BEGIN
    UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamps trigger for cards
CREATE TRIGGER update_cards_timestamp
    AFTER UPDATE ON cards
BEGIN
    UPDATE cards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamps trigger for pods
CREATE TRIGGER update_pods_timestamp
    AFTER UPDATE ON pods
BEGIN
    UPDATE pods SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
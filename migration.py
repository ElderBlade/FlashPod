# simple_migration.py
# Simple migration script that doesn't depend on app initialization

import sqlite3
import os

def add_display_order_column():
    """Add display_order column and populate with existing order"""
    
    # Database path
    db_path = "./data/flashpod.db"
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(cards)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'display_order' not in columns:
            print("Adding display_order column...")
            cursor.execute("ALTER TABLE cards ADD COLUMN display_order INTEGER DEFAULT 0")
            print("Column added successfully.")
        else:
            print("display_order column already exists.")
        
        # Update existing cards with display order based on creation time
        cursor.execute("""
            SELECT DISTINCT deck_id 
            FROM cards 
            WHERE is_active = 1
        """)
        
        decks = cursor.fetchall()
        
        for (deck_id,) in decks:
            print(f"Updating display order for deck {deck_id}...")
            
            # Get cards ordered by creation time
            cursor.execute("""
                SELECT id 
                FROM cards 
                WHERE deck_id = ? AND is_active = 1
                ORDER BY created_at
            """, (deck_id,))
            
            cards = cursor.fetchall()
            
            # Update each card with its position
            for index, (card_id,) in enumerate(cards):
                cursor.execute("""
                    UPDATE cards 
                    SET display_order = ? 
                    WHERE id = ?
                """, (index, card_id))
                
            print(f"  Updated {len(cards)} cards")
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        conn.close()

if __name__ == "__main__":
    add_display_order_column()
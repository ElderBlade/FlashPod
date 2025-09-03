# app/routes/decks.py
from datetime import datetime
from sanic import Blueprint
from sanic.response import json, HTTPResponse
from models.database import get_db_session
from models.user import User
from models.deck import Deck
from models.card import Card
from middleware.auth import require_auth
import re

decks_bp = Blueprint("decks", url_prefix="/api/decks")

@decks_bp.route("", methods=["POST"])
@require_auth
async def create_deck(request):
    """Create a new deck"""
    session = get_db_session()
    try:
        data = request.json
        # Get user_id from authenticated user instead of request body
        user_id = request.ctx.user['id']  # ← This should be here
        name = data.get("name")
        description = data.get("description", "")
        
        if not name:  # ← Only check for name, not user_id
            return json({"error": "Missing required field: name"}, status=400)
        
        # Create new deck
        new_deck = Deck(
            user_id=user_id,
            name=name,
            description=description
        )
        
        session.add(new_deck)
        session.commit()
        
        return json({
            "message": "Deck created successfully",
            "deck_id": new_deck.id,
            "name": new_deck.name
        }, status=201)
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@decks_bp.route("/<deck_id:int>", methods=["GET"])
async def get_deck(request, deck_id):
    """Get a specific deck"""
    session = get_db_session()
    try:
        deck = session.query(Deck).filter_by(id=deck_id).first()
        
        if not deck:
            return json({"error": "Deck not found"}, status=404)
        
        return json({"deck": deck.to_dict()})
    
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@decks_bp.route("/<deck_id:int>", methods=["PUT"])
async def update_deck(request, deck_id):
    """Update a deck"""
    session = get_db_session()
    try:
        data = request.json
        
        deck = session.query(Deck).filter_by(id=deck_id).first()
        if not deck:
            return json({"error": "Deck not found"}, status=404)
        
        # Update fields if provided
        if "name" in data:
            deck.name = data["name"]
        if "description" in data:
            deck.description = data["description"]
        if "is_public" in data:
            deck.is_public = data["is_public"]
        
        session.commit()
        
        return json({
            "message": "Deck updated successfully",
            "deck": deck.to_dict()
        })
        
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@decks_bp.route("/<deck_id:int>", methods=["DELETE"])
async def delete_deck(request, deck_id):
    """Delete a deck"""
    session = get_db_session()
    try:
        deck = session.query(Deck).filter_by(id=deck_id).first()
        
        if not deck:
            return json({"error": "Deck not found"}, status=404)
        
        deck_name = deck.name
        session.delete(deck)
        session.commit()
        
        return json({
            "message": f"Deck '{deck_name}' deleted successfully"
        })
    
    except Exception as e:
        session.rollback()
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


@decks_bp.route("/import-file", methods=["POST"])
@require_auth
async def import_file(request):
    """Import cards from uploaded file"""
    import csv
    import io
    
    session = get_db_session()
    try:
        # Get uploaded file
        upload_file = request.files.get('file')
        if not upload_file:
            return json({"error": "No file uploaded"}, status=400)
        
        # Read file content
        file_content = upload_file.body.decode('utf-8')
        lines = file_content.splitlines()
        
        # Extract metadata from FlashPod export format
        metadata = {
            'deck_name': None,
            'description': None,
            'is_flashpod_export': False
        }
        
        # Check for FlashPod export metadata
        for line in lines:
            if line.startswith('# FlashPod Export'):
                metadata['is_flashpod_export'] = True
            elif line.startswith('# Deck Name: '):
                metadata['deck_name'] = line[13:].strip()  # Remove "# Deck Name: "
            elif line.startswith('# Description: '):
                metadata['description'] = line[15:].strip()  # Remove "# Description: "
        
        # Parse CSV with proper handling
        cards_data = []
        csv_reader = csv.reader(io.StringIO(file_content))
        
        # Skip header if present
        first_row = next(csv_reader, None)
        if first_row and (first_row[0].lower() == 'term' or first_row[0].lower() == 'front'):
            pass  # Skip header
        else:
            # Process first row as data if it's not a comment or header
            if first_row and len(first_row) >= 2 and not first_row[0].startswith('#'):
                cards_data.append({
                    'term': first_row[0].strip(),
                    'definition': first_row[1].strip()
                })
        
        # Process remaining rows
        for row in csv_reader:
            if len(row) >= 2 and row[0].strip() and not row[0].startswith('#'):
                cards_data.append({
                    'term': row[0].strip(),
                    'definition': row[1].strip()
                })
        
        return json({
            "cards": cards_data,
            "metadata": metadata
        })
        
    except Exception as e:
        return json({"error": f"Failed to parse file: {str(e)}"}, status=400)
    finally:
        session.close()


@decks_bp.route("/<deck_id:int>/export", methods=["GET"])
async def export_deck(request, deck_id):
    """Export deck as CSV"""
    session = get_db_session()
    try:
        # Get deck with verification
        deck = session.query(Deck).filter_by(id=deck_id).first()
        if not deck:
            return json({"error": "Deck not found"}, status=404)
        
        # Get all active cards for this deck
        cards = session.query(Card).filter_by(
            deck_id=deck_id, 
            is_active=True
        ).order_by(Card.display_order, Card.created_at).all()
        
        # Create CSV content with metadata
        csv_lines = []
        
        # Add metadata as comments (will be ignored by most CSV readers)
        csv_lines.append(f"# FlashPod Export")
        csv_lines.append(f"# Deck Name: {deck.name}")
        if deck.description:
            csv_lines.append(f"# Description: {deck.description}")
        csv_lines.append(f"# Cards: {len(cards)}")
        csv_lines.append(f"# Export Date: {datetime.now().isoformat()}")
        csv_lines.append("")  # Empty line
        
        # Add header
        csv_lines.append("Term,Definition,Tags")
        
        for card in cards:
            # Escape CSV fields properly
            term = card.front_content.replace('"', '""')
            definition = card.back_content.replace('"', '""')
            tags = (card.tags or "").replace('"', '""')
            
            # Wrap in quotes to handle commas and newlines
            csv_lines.append(f'"{term}","{definition}","{tags}"')
        
        csv_content = "\n".join(csv_lines)
        
        # Create filename with sanitized deck name
        safe_name = re.sub(r'[^\w\-_.]', '_', deck.name)
        filename = f"{safe_name}_{deck.id}.csv"
        
        # Return CSV response
        return HTTPResponse(
            csv_content,
            status=200,
            headers={
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()


# User specific routes
@decks_bp.route("/my-decks", methods=["GET"])
@require_auth
async def get_my_decks(request):
    """Get current user's decks"""
    session = get_db_session()
    try:
        # Get user ID from authenticated context
        user_id = request.ctx.user['id']
        
        decks = session.query(Deck).filter_by(user_id=user_id).order_by(Deck.created_at.desc()).all()
        decks_data = [deck.to_dict() for deck in decks]
        
        return json({"decks": decks_data})
    
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()
        
        
@decks_bp.route("/users/<user_id:int>", methods=["GET"])
async def get_user_decks(request, user_id):
    """Get all decks for a user"""
    session = get_db_session()
    try:
        decks = session.query(Deck).filter_by(user_id=user_id).order_by(Deck.created_at.desc()).all()
        
        decks_data = [deck.to_dict() for deck in decks]
        
        return json({"decks": decks_data})
    
    except Exception as e:
        return json({"error": str(e)}, status=500)
    finally:
        session.close()
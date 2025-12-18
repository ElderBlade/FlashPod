# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlashPod is a self-hosted flashcard learning platform built with Python (Sanic framework) on the backend and vanilla JavaScript on the frontend. It implements the SuperMemo-2 spaced repetition algorithm for intelligent study scheduling.

**Tech Stack:**
- Backend: Sanic (async Python web framework), SQLAlchemy ORM, SQLite database
- Frontend: Vanilla JavaScript, Tailwind CSS v4, Jinja2 templates
- Authentication: JWT-based with server-side verification
- Deployment: Docker/Podman containers with security hardening

## Development Commands

### CSS Build System
FlashPod uses Tailwind CSS v4 via PostCSS. CSS must be compiled before running the app.

```bash
# Development (watch mode - rebuilds on changes)
npm run build-css

# Production (minified)
npm run build-css-prod
```

### Python Environment Setup
```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Running the Application
```bash
# Development mode (from app/ directory)
cd app
python main.py

# With environment variables
DEBUG=true AUTO_RELOAD=true python main.py
```

The app runs on `http://0.0.0.0:8000` by default.

### Database
- Database auto-initializes on first run
- Creates test user: `testuser` / `password123`
- Location: `data/flashpod.db` (dev) or `/data/flashpod.db` (container)
- Schema is defined in SQLAlchemy models, reference design in `db_schema.sql`

### Testing
There is currently no automated test suite. Manual testing via the web interface is used.

## Architecture

### Application Structure
```
app/
├── main.py              # Sanic app initialization and route registration
├── __init__.py          # Version info and metadata
├── models/              # SQLAlchemy ORM models
│   ├── database.py      # DB session management, password hashing
│   ├── user.py          # User model
│   ├── deck.py          # Deck model
│   ├── card.py          # Card model
│   ├── pod.py           # Pod (deck collection) model
│   ├── pod_deck.py      # Many-to-many pod-deck association
│   ├── study_session.py # Study session tracking
│   └── card_review.py   # Spaced repetition data (SuperMemo-2)
├── routes/              # Sanic blueprints for API endpoints
│   ├── auth.py          # Login, register, JWT creation
│   ├── decks.py         # CRUD operations for decks
│   ├── cards.py         # CRUD operations for cards
│   ├── pods.py          # CRUD operations for pods
│   ├── study.py         # Study mode endpoints
│   ├── card_reviews.py  # Spaced repetition review submission
│   ├── dashboard.py     # Dashboard stats/analytics
│   └── config.py        # User preferences
├── middleware/
│   └── auth.py          # JWT verification and @require_auth decorator
├── utils/
│   └── statistics.py    # Study analytics calculations
└── config/
    └── timezone.py      # Timezone utilities

static/
├── css/                 # Tailwind input/output
├── js/
│   ├── app.js           # Main application logic, deck/pod CRUD
│   ├── study.js         # Study mode flashcard interactions
│   ├── features/        # Feature modules (deck manager, card editor, etc.)
│   ├── services/        # API client wrappers
│   ├── ui/              # UI components (modal, toast, navigation)
│   └── utils/           # Helper functions
└── img/                 # Static images

templates/               # Jinja2 templates (minimal server-side rendering)
├── dashboard.html       # Main SPA shell
├── login.html           # Login page
└── register.html        # Registration page
```

### Key Architectural Patterns

**Application Factory Pattern:**
- `create_app()` in `main.py` initializes the Sanic app
- All configuration comes from environment variables
- Database initialization happens in `@app.before_server_start` hook

**Database Session Management:**
- Use `get_db_session()` from `models/database.py` to get a session
- **Always** close sessions in `finally` blocks to prevent connection leaks
- Sessions are scoped and thread-safe via `scoped_session`

**Authentication Flow:**
1. User logs in via `/api/auth/login`
2. Server validates credentials and creates JWT with `create_jwt_token()`
3. JWT stored in HTTP-only cookie named `auth_token`
4. Protected routes use `@require_auth` decorator which calls `get_user_from_request()`
5. User info stored in `request.ctx.user` for route handlers

**Frontend-Backend Communication:**
- Frontend is a SPA that communicates via JSON APIs
- All API routes are under `/api/`
- Frontend uses `fetch()` with credentials for authenticated requests
- JWT sent automatically via cookie; also supports `Authorization: Bearer <token>` header

**Spaced Repetition Implementation:**
- SuperMemo-2 algorithm in `CardReview.calculate_next_review()` (app/models/card_review.py:47-72)
- Response quality: 1-5 scale (1=again, 5=easy)
- Calculates: ease_factor, interval_days, next_review_date, repetitions
- Reviews are submitted to `/api/card-reviews` endpoint

### Data Model Relationships

**Hierarchical Organization:**
```
User
├── Pods (collections of decks)
│   └── Decks (via pod_decks junction table)
├── Decks
│   └── Cards
└── CardReviews (spaced repetition tracking)
    └── References: Card, StudySession
```

**Key Relationships:**
- Decks can belong to multiple Pods (many-to-many via `pod_decks`)
- Cards belong to one Deck (one-to-many)
- CardReviews track individual card study events (one-to-many with Cards)
- All entities cascade delete when User is deleted

### Frontend JavaScript Architecture

**Modular Organization:**
- `static/js/features/` contains feature modules (DeckManager, CardEditor, PodManager, etc.)
- `static/js/services/` contains API wrappers (api-client.js)
- `static/js/ui/` contains reusable UI components (modal, toast, mobile-nav)
- Main app logic in `app.js` coordinates feature modules

**Study Mode:**
- Implemented in `static/js/study.js`
- Supports three flip animations: horizontal, vertical-up, vertical-down
- Keyboard shortcuts: Space (flip), arrows (navigate), S (shuffle), T (term/def toggle), Esc (exit)
- Real-time card editing during study sessions
- Local state management for shuffle/term-def modes

## Important Implementation Details

### Environment Variables
Required for production deployment:
- `JWT_SECRET` - Must be changed from default for security
- `SECRET_KEY` - Used for session security
- `DATABASE_URL` - Auto-set based on environment (container vs dev)
- `DEBUG` - Set to `false` in production
- `JWT_EXPIRATION_HOURS` - Token lifetime (default: 24)

### Database Path Logic
The app automatically detects container vs development environment:
- Container: Uses `/data/flashpod.db` (absolute path for bind mount)
- Development: Uses `./data/flashpod.db` (relative to app directory)

See `app/main.py:61-66` for implementation.

### Password Security
- Passwords hashed with PBKDF2-HMAC-SHA256 (100,000 iterations)
- Random 16-byte salt per password
- Implementation: `models/database.py:15-25`

### CSS Safelist
Tailwind config includes extensive safelist for dynamic classes (dark mode, flashcard animations, modals). When adding dynamic CSS classes in JavaScript, add them to `tailwind.config.js` safelist to ensure they're included in production builds.

### Mobile Navigation
The app uses a hamburger menu for mobile devices. The navigation logic is in `static/js/ui/mobile-nav.js` and manages sidebar visibility, overlay, and scroll locking.

### Import/Export
- Bulk card import supports CSV/TSV formats via `/api/decks/import` endpoint
- Auto-detects delimiters (tab or comma)
- Preview functionality before deck creation
- Implementation in `app/routes/decks.py`

## Common Development Patterns

### Adding a New API Endpoint
1. Create route handler in appropriate blueprint file under `app/routes/`
2. Use `@bp.route()` decorator
3. Protected routes: add `@require_auth` decorator
4. Access user via `request.ctx.user`
5. Get DB session, perform operations, close in `finally` block
6. Return JSON via `response.json()`

Example:
```python
from sanic import Blueprint, response
from middleware.auth import require_auth
from models.database import get_db_session

bp = Blueprint('my_feature', url_prefix='/api/my-feature')

@bp.route('/', methods=['GET'])
@require_auth
async def get_items(request):
    user = request.ctx.user
    session = get_db_session()
    try:
        # DB operations here
        return response.json({'items': []})
    finally:
        session.close()
```

### Adding a New Model
1. Create model file in `app/models/`
2. Inherit from `Base` (from `models.database`)
3. Define SQLAlchemy columns and relationships
4. Add `to_dict()` method for JSON serialization
5. Import model in `models/database.py:init_database()` to register it

### Modifying the Frontend
1. If adding new Tailwind classes dynamically, update `tailwind.config.js` safelist
2. Rebuild CSS: `npm run build-css`
3. Frontend API calls should use `credentials: 'include'` for cookie auth
4. UI feedback: use toast notifications from `static/js/ui/toast.js`

### Working with CardReviews (Spaced Repetition)
When a user reviews a card:
1. Create `CardReview` instance with `response_quality` (1-5)
2. Call `.calculate_next_review()` to compute next review date
3. Save to database
4. The algorithm automatically adjusts `ease_factor`, `interval_days`, and `repetitions`

Reference implementation: `app/routes/card_reviews.py`

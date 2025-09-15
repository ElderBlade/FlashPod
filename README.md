<p align="center">
<img src="design/flashpod-logo-main.png" alt="FlashPod Logo" width="300">
</p>
<h3 align="center">High performance self-hosted flashcard solution</h3>

<p align="center">
<i>Study anywhere, sync everywhere, own your data</i>
</p>

## ✨ Features

### 🎯 Smart Learning
- **Spaced Repetition Algorithm** - SuperMemo-2 based intelligent review scheduling
- **Interactive Study Mode** - Multi-directional card flipping with keyboard shortcuts
- **Real-time Card Editing** - Modify cards on-the-fly during study sessions
- **Progress Tracking** - Detailed analytics on learning performance and retention

### 📚 Deck Management
- **Intuitive Card Creation** - Drag-and-drop reordering with auto-resize text areas
- **Bulk Import Support** - Import from CSV, TSV, or paste tab/comma-separated data
- **Flexible Organization** - Group decks into pods for structured learning
- **Rich Content Support** - Text, HTML, and Markdown content types

### 🎮 Study Experience
- **Multiple Flip Animations** - Horizontal, vertical-up, and vertical-down card flips
- **Keyboard Navigation** - Full keyboard control for efficient studying
- **Shuffle & Randomize** - Mix up card order to prevent pattern memorization
- **Term/Definition Toggle** - Study in both directions
- **Mobile-Responsive** - Seamless experience across desktop, tablet, and mobile

### 🔒 Privacy & Control
- **Self-Hosted** - Complete data ownership and privacy
- **No External Dependencies** - All learning data stays on your server
- **Secure Authentication** - JWT-based session management
- **Offline Capable** - Study without internet connectivity

---

## 🚀 Quick Start

### Container Deployment (Recommended)

FlashPod can be deployed using Docker or Podman containers for easy setup and isolation.

#### Prerequisites
- Docker or Podman installed on your system

#### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/ElderBlade/FlashPod.git
   cd FlashPod
   ```

2. **Build the container image**
   ```bash
   # Using Docker
   docker build -f docker/Dockerfile -t localhost/flashpod .
   
   # Using Podman
   podman build -f docker/Dockerfile -t localhost/flashpod .
   ```
3. **docker-compose.yml**
   ```yml
   services:
     flashpod:
       image: localhost/flashpod:latest
       container_name: flashpod
       ports:
         - "8000:8000"
       environment:
         - JWT_SECRET=change-this-secure-jwt-secret-key
         - SECRET_KEY=change-this-secure-secret-key
         - DEBUG=false
         - JWT_EXPIRATION_HOURS=24
         - TZ=American/Los_Angeles
       volumes:
         - flashpod:/data
       user: "1001:1001"
       read_only: true
       tmpfs:
         - /tmp
       security_opt:
         - no-new-privileges:true
       restart: always

   volumes:
     flashpod:
       driver: local
   ```

5. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

6. **Access FlashPod**
   Open your browser to `http://localhost:8000`

#### Option 2: Docker Run

1. **Clone and build** (same as above)

2. **Run container**
   ```bash
   docker run -d \
     --name flashpod \
     --restart=always \
     -p 8000:8000 \
     -e JWT_SECRET=change-this-secure-jwt-secret-key \
     -e SECRET_KEY=change-this-secure-secret-key \
     -e DEBUG=false \
     -e JWT_EXPIRATION_HOURS=24 \
     -e TZ=America/Los_Angeles \
     -v flashpod:/data \
     --user 1001:1001 \
     --read-only \
     --tmpfs /tmp \
     --security-opt no-new-privileges:true \
     localhost/flashpod:latest
   ```

#### Option 3: Podman with Quadlet (Linux with systemd)

1. **Clone and build** (same as above)

2. **Quadlet file** - place file `/etc/containers/systemd/users/$(UID)` or `/etc/containers/systemd/users/`
   ```bash
   [Unit]
   Description=FlashPod - Smart Flashcard Learning Platform
   Wants=network-online.target
   After=network-online.target

   [Container]
   Image=localhost/flashpod:latest
   ContainerName=flashpod
   PublishPort=8000:8000

   # Environment variables
   Environment=JWT_SECRET=change-this-secure-jwt-secret-key
   Environment=SECRET_KEY=change-this-secure-secret-key
   Environment=DEBUG=false
   Environment=JWT_EXPIRATION_HOURS=24
   Environment=TZ=America/Los_Angeles

   # Data persistence
   Volume=flashpod:/data:Z

   # Security
   User=1001:1001
   ReadOnlyTmpfs=true
   Tmpfs=/tmp
   NoNewPrivileges=true

   [Service]
   Restart=always
   TimeoutStartSec=300

   [Install]
   WantedBy=multi-user.target
   EOF
   ```

3. **Start service**
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable --now flashpod.service
   ```

### 🛠️ Development Setup

For development or if you prefer running without containers:

#### Prerequisites
- Python 3.8+
- Node.js 16+ (for CSS building)

#### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ElderBlade/flashpod.git
   cd flashpod
   ```

2. **Set up Python environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Build CSS assets**
   ```bash
   npm install
   npm run build-css
   ```

4. **Initialize database**
   ```bash
   mkdir -p data
   cd app
   python main.py
   ```

5. **Access FlashPod**
   Open your browser to `http://localhost:8000`

### Demo Account
- **Username:** `testuser`
- **Password:** `password123`

### Security Notes

**⚠️ Important:** Change the default secrets before production use:
- `JWT_SECRET`: Used for JWT token signing
- `SECRET_KEY`: Used for session security

Generate secure secrets:
```bash
# Generate random secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For SECRET_KEY
```

---

## 🎮 Usage Guide

### Creating Your First Deck

1. **Navigate to "New Deck"** in the sidebar
2. **Enter deck details** - name and optional description
3. **Add flashcards** using the intuitive form
4. **Import bulk cards** (optional) via the Import button
5. **Save and start studying!**

### Study Mode Controls

| Action | Keyboard | Mouse |
|--------|----------|-------|
| Flip Horizontal | `Space` | Click card |
| Flip Up | `↑` | - |
| Flip Down | `↓` | - |
| Previous Card | `←` | Previous button |
| Next Card | `→` | Next button |
| Shuffle Toggle | `S` | Shuffle button |
| Term/Def Toggle | `T` | T/D button |
| Exit Study | `Escape` | Exit button |

### Import Formats

FlashPod supports multiple import formats:

**Tab-separated:**
```
Term 1	Definition 1
Term 2	Definition 2
```

**Comma-separated:**
```
Term 1, Definition 1
Term 2, Definition 2
```

---

## 📊 Database Schema

FlashPod uses a comprehensive relational schema designed for scalability:

- **Users** - Authentication and preferences
- **Decks** - Flashcard collections
- **Cards** - Individual flashcards with rich content
- **Pods** - Grouped deck collections
- **Study Sessions** - Learning session tracking
- **Card Reviews** - Spaced repetition data
- **Statistics** - Progress analytics

View the complete schema in [`db_schema.sql`](db_schema.sql).

---

## 🎨 Features in Detail

### Spaced Repetition Algorithm

FlashPod implements the SuperMemo-2 algorithm for optimal learning:

- **Ease Factor:** Adjusts based on response quality (1-5 scale)
- **Interval Calculation:** Exponential spacing for long-term retention
- **Review Scheduling:** Automatic next-review date calculation
- **Progress Tracking:** Repetition count and success metrics

### Study Interface

The study mode provides an immersive learning experience:

- **3D Card Animations:** Smooth CSS3 transforms for realistic card flipping
- **Keyboard-First Design:** Navigate entirely without mouse
- **Visual Feedback:** Progress bars, card counters, and status indicators
- **Accessibility:** Screen reader support and high contrast mode

### Import System

Flexible data import supporting various formats:

- **Format Detection:** Auto-detects delimiters (tab, comma)
- **Preview & Edit:** Review imported cards before creating deck
- **Error Handling:** Graceful handling of malformed data
- **Bulk Operations:** Efficient processing of large datasets

---

## 📱 Mobile Experience

FlashPod is fully responsive with mobile-specific optimizations:

- **Touch-Friendly Interface** - Large touch targets and swipe gestures
- **Collapsible Navigation** - Hamburger menu with smooth animations
- **Optimized Study Mode** - Card sizing and controls adapted for mobile
- **Offline Support** - Continue studying without internet connection

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file for custom configuration:

```env
DATABASE_URL=sqlite:///./data/flashpod.db
SECRET_KEY=your-super-secret-key
DEBUG=True
JWT_EXPIRATION_HOURS=24
TZ=America/Los_Angeles
```

### Production Deployment

For production environments:

1. Set `DEBUG=False`
2. Use a strong `SECRET_KEY`
3. Configure reverse proxy (nginx recommended)
4. Set up SSL/TLS certificates
5. Consider PostgreSQL for better performance

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

FlashPod is open source software licensed under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- **SuperMemo** - For the spaced repetition algorithm
- **Tailwind CSS** - For the utility-first CSS framework
- **Sanic** - For the high-performance async Python framework

---

## 📞 Support

- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/ElderBlade/FlashPod/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/ElderBlade/FlashPod/discussions)
- 📧 **Email:** support@flashpod.io

---

*Built with ❤️ for learners everywhere*

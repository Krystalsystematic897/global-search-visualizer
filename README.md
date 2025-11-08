# 🌍 Global Search Visualizer

**Multi-Region Search Result Screenshot Tool** - Discover how search results differ across countries and regions with automated browser automation, proxy-based geolocation, and a professional React dashboard.

---

## ✨ Features

### 🔍 Search & Automation
- **Multi-Region Search**: Test search results from different geographical locations using HTTP/SOCKS4/SOCKS5 proxies
- **Multiple Search Engines**: Support for Google, Bing, DuckDuckGo, and Yahoo
- **Google Programmable Search API**: Optional API integration to bypass CAPTCHA challenges for google search
- **Automated Screenshots**: Capture full-page and viewport screenshots with Playwright
- **Concurrent Processing**: Resource-aware parallel browser execution (2-8x faster)
- **Smart Auto-scaling**: Automatically adjusts concurrency based on CPU and memory

### 🎯 Proxy Management
- **Geolocation Detection**: Automatic proxy location identification via IP-API
- **Proxy Validation**: Test HTTP/SOCKS4/SOCKS5 proxies before use
- **Bulk Import**: Support for proxy lists via text input or URL
- **Real-time Validation**: Live validation feedback with success/failure indicators

### 📊 Dashboard & Visualization
- **Interactive Web UI**: Professional React + TypeScript interface
- **Real-time Updates**: WebSocket and polling-based job progress tracking
- **Session History**: Browse all previous search jobs with detailed metadata
- **Advanced Filtering**: Filter results by country, engine, status, and more
- **Screenshot Preview**: In-browser image viewing with download options
- **Export Options**: Download screenshots as ZIP

### �️ Technical
- **JSON Storage**: No database required - all data stored in structured JSON files
- **RESTful API**: Clean FastAPI backend with comprehensive endpoints
- **WebSocket Support**: Real-time job updates via WebSocket connections
- **Modern UI**: TailwindCSS with custom animations and Zustand state management
- **Type Safety**: Full TypeScript coverage on frontend

---

## 🏗️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.8+)
- **Browser Automation**: Playwright (Chromium)
- **Proxy Support**: HTTPX with SOCKS support
- **Resource Management**: psutil for system monitoring
- **Storage**: JSON files + local filesystem
- **WebSocket**: Native FastAPI WebSocket support

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with custom design system
- **State Management**: Zustand
- **Animations**: Framer Motion
- **API Client**: Axios with TypeScript types
- **Router**: React Router v6

### Key Libraries
- **Backend**: `fastapi`, `playwright`, `httpx`, `psutil`, `python-dotenv`
- **Frontend**: `react`, `typescript`, `tailwindcss`, `zustand`, `framer-motion`, `axios`

---


## 🚀 Quick Start

### Prerequisites
- **Python**: 3.8 or higher
- **Node.js**: 18+ (or Bun)
- **Operating System**: Windows, macOS, or Linux

### Installation

#### 1️⃣ Clone the Repository
```bash
git clone https://github.com/0xarchit/global-search-visualizer.git
cd global-search-visualizer
```

#### 2️⃣ Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browser
playwright install chromium
```

#### 3️⃣ Frontend Setup
```bash
cd frontend

# Install dependencies (choose one)
npm install
# or
bun install

# Build for production
npm run build
# or
bun run build
```

#### 4️⃣ Configuration (Optional)

Create a `.env` file in the project root for Google API credentials:
```env
GOOGLE_API_KEY=your-api-key-here
GOOGLE_CSE_ID=your-search-engine-id-here
CORS=https://example1.xyz,http://localhost:5173
```

Or configure via `config.json`:
```json
{
  "google_search_api": {
    "api_key": "your-api-key",
    "search_engine_id": "your-cse-id",
    "fallback_to_browser": true
  }
}
```

### Running the Application

```bash
python start.py
# or
# Terminal 1: Start backend with auto-reload
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start frontend dev server
cd frontend
npm run dev  # or: bun run dev
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **API Docs**: `http://localhost:8000/docs`

---

## 📖 Usage Guide

### Step 1: Validate Proxies

1. Navigate to **Proxy Management** page
2. Add proxies in `IP:PORT` format (one per line):
   ```
   142.111.48.253:7030
   198.23.239.134:6540
   216.10.27.159:6837
   ```
3. Or provide a proxy list URL
4. Click **Validate Proxies**
5. View geolocation data (country, city, ISP)

**Proxy Tips:**
- ✅ Paid residential/datacenter proxies work best
- 🆓 Free proxies: Try [Webshare](https://dashboard.webshare.io) (10 free rotating proxies)
- 🔄 Replace free proxies frequently (higher failure rates)

### Step 2: Configure Search

1. Go to **Search Jobs** page
2. Enter your search query (keyword, phrase, or URL)
3. Select search engines: Google, Bing, DuckDuckGo, Yahoo
4. Choose validated proxies (or all)
5. *Optional*: Enter Google API credentials (if using Google)
6. Click **Start Geo Search**

### Step 3: Monitor Progress

- **Real-time Progress Bar**: Track completion percentage
- **Live Status Updates**: See which tasks are running/completed/failed
- **WebSocket Updates**: Instant notifications on job state changes
- **Stop Job**: Cancel running jobs gracefully

### Step 4: View Results

1. Navigate to **Sessions** page
2. Browse all previous search jobs
3. Click on a session to view details:
   - Screenshots organized by country and engine
   - Metadata (timestamps, proxy info, status)
   - Filter by country, engine, or status
4. **Download Options**:
   - Download individual screenshots
   - Export screenshots as ZIP
   - Export session data as JSON

---

## ⚙️ Configuration

### Concurrency Settings

Edit `config.json` to optimize performance:

```json
{
  "concurrency": {
    "max_concurrent_browsers": null,  // null = auto-calculate (recommended)
    "max_concurrent_jobs": null,      // null = unlimited job submissions
    "auto_calculate": true             // Enable automatic resource detection
  },
  "behavior": {
    "shuffle_engines": true,           // Randomize engine order
    "task_delay_min_ms": 200,          // Minimum delay between tasks
    "task_delay_max_ms": 500           // Maximum delay between tasks
  }
}
```

**Performance Gains:**
- **Sequential**: 1 task at a time
- **Concurrent**: 2-8+ tasks simultaneously (auto-calculated)
- **Speed Increase**: Up to 5-8x faster

**Manual Limits:**
```json
{
  "concurrency": {
    "max_concurrent_browsers": 4,     // Max 4 browsers at once
    "max_concurrent_jobs": 2          // Max 2 jobs running
  }
}
```

**Resource Calculation:**
- **CPU**: Uses `(CPU cores - 1)` to leave headroom
- **Memory**: Assumes ~200MB per browser instance
- **Strategy**: Takes minimum of CPU-based and memory-based limits

### Google Programmable Search API

**Why use it?**
- Bypass Google CAPTCHA challenges
- Faster results (no browser loading)
- More reliable for large-scale searches

**Setup Options:**

1. **Environment Variables** (Recommended):
   ```powershell
   # PowerShell
   setx GOOGLE_API_KEY "<your-api-key>"
   setx GOOGLE_CSE_ID "<your-search-engine-id>"
   ```

2. **`.env` File**:
   ```env
   GOOGLE_API_KEY=your-api-key
   GOOGLE_CSE_ID=your-search-engine-id
   ```

3. **`config.json`** (Not recommended for secrets):
   ```json
   {
     "google_search_api": {
       "api_key": "your-key",
       "search_engine_id": "your-id",
       "fallback_to_browser": true
     }
   }
   ```

4. **Web UI** (Per-job):
   - Enter credentials in the search form
   - Stored in browser's localStorage
   - Sent with each job request

**Note**: If quota is exhausted, set `fallback_to_browser: true` to use Playwright as backup.

---

## 📂 Project Structure

```
05 globe-search-view/
├── app.py                      # FastAPI application entry point
├── models.py                   # Pydantic data models
├── config.py                   # Configuration management
├── utils.py                    # Utility functions (logging, file ops)
├── proxy.py                    # Proxy validation logic
├── search.py                   # Concurrent job processing engine
├── config.json                 # Application configuration
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Docker configuration
├── .env                        # Environment variables (optional)
│
├── routes/                     # Modular API routes
│   ├── proxy_routes.py        # POST /validate_proxies
│   ├── search_routes.py       # POST /start_search, POST /stop_job
│   ├── session_routes.py      # GET /list_sessions, GET /get_session
│   └── websocket_routes.py    # WS /ws/job/{job_id}
│
├── frontend/                   # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/        # Header, Sidebar, PageHeader
│   │   │   └── ui/            # Button, Card, Badge, Input, etc.
│   │   ├── pages/             # Dashboard, ProxyManagement, SearchJobs, etc.
│   │   ├── services/          # api.ts - Axios API client
│   │   ├── stores/            # Zustand state stores
│   │   │   ├── proxyStore.ts
│   │   │   ├── searchStore.ts
│   │   │   └── sessionStore.ts
│   │   └── types/             # TypeScript type definitions
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── dist/                  # Production build (served by FastAPI)
│
└── results/                   # Generated results
    ├── logs/                  # JSON metadata files (session data)
    ├── screenshots/           # Captured screenshots (organized by session/country)
    └── html/                  # Google API HTML mockups
```

---

## 🔌 API Documentation

### Base URL
```
http://localhost:8000
```

### Interactive Docs
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Endpoints

#### **GET** `/`
Get API information
```json
{
  "app": "Global Search Visualizer API",
  "version": "2.0",
  "status": "running"
}
```

#### **POST** `/validate_proxies`
Validate proxies and get geolocation data

**Request:**
```json
{
  "proxy_list": ["142.111.48.253:7030", "198.23.239.134:6540"],
  "proxy_url": "https://example.com/proxies.txt"  // Optional
}
```

**Response:**
```json
{
  "validated_proxies": [
    {
      "proxy": "142.111.48.253:7030",
      "working": true,
      "country": "United States",
      "city": "New York",
      "ip": "142.111.48.253"
    }
  ]
}
```

#### **POST** `/start_search`
Start a new search job with concurrent processing

**Request:**
```json
{
  "query": "artificial intelligence",
  "engines": ["google", "bing"],
  "proxies": [
    {
      "proxy": "142.111.48.253:7030",
      "country": "United States",
      "working": true
    }
  ],
  "google_api_key": "optional-key",
  "google_cse_id": "optional-id"
}
```

**Response:**
```json
{
  "job_id": "f0454e78-c9aa-4632-9ea7-efe5a08c3fac",
  "status": "started",
  "total_tasks": 4,
  "message": "Search job started with 4 tasks"
}
```

#### **POST** `/stop_job/{job_id}`
Stop a running search job

**Response:**
```json
{
  "status": "stopped",
  "message": "Job stopped successfully"
}
```

#### **GET** `/get_status?job_id={job_id}`
Get real-time job status

**Response:**
```json
{
  "job_id": "f0454e78-c9aa-4632-9ea7-efe5a08c3fac",
  "status": "running",
  "progress": 75.0,
  "completed": 3,
  "total": 4,
  "results": [...]
}
```

#### **GET** `/list_sessions`
List all search sessions

**Response:**
```json
{
  "sessions": [
    {
      "id": "f0454e78-c9aa-4632-9ea7-efe5a08c3fac",
      "query": "artificial intelligence",
      "timestamp": "2025-11-08T10:30:00",
      "total_tasks": 4,
      "completed": 4
    }
  ]
}
```

#### **GET** `/get_session/{session_id}`
Get detailed session data

**Response:**
```json
{
  "id": "f0454e78-c9aa-4632-9ea7-efe5a08c3fac",
  "query": "artificial intelligence",
  "engines": ["google", "bing"],
  "timestamp": "2025-11-08T10:30:00",
  "results": [...]
}
```

#### **WebSocket** `/ws/job/{job_id}`
Real-time job updates via WebSocket

**Messages:**
```json
{
  "type": "progress",
  "job_id": "f0454e78-...",
  "progress": 50.0,
  "completed": 2,
  "total": 4
}
```

---

## 🎨 Frontend Design System

### Color Palette
- **Primary**: Deep Blue `#1e40af`
- **Secondary**: Dark Slate `#0f172a`
- **Success**: Emerald `#10b981`
- **Warning**: Amber `#f59e0b`
- **Error**: Red `#ef4444`
- **Info**: Blue `#3b82f6`

### Key Components
- **Button**: Primary, Secondary, Outline, Ghost variants
- **Card**: Elevated and bordered styles with hover effects
- **Badge**: Color-coded status indicators
- **Input/Textarea**: Validated form controls
- **ProgressBar**: Animated progress indicators
- **Spinner**: Loading states

### State Management (Zustand)
- **proxyStore**: Manages proxy validation state
- **searchStore**: Handles search jobs with auto-polling
- **sessionStore**: Manages session history and details

### API Integration
```typescript
import api from './services/api';

// Validate proxies
const result = await api.validateProxies({ proxy_list: [...] });

// Start search
const job = await api.startSearch({
  query: 'example',
  engines: ['google'],
  proxies: [...]
});

// Get sessions
const sessions = await api.listSessions();
```

---

## 🐳 Docker Deployment

### Build Image
```bash
docker build -t Global Search-visualizer .
```

### Run Container
```bash
docker run -d \
  -p 8000:8000 \
  -v $(pwd)/results:/app/results \
  -e GOOGLE_API_KEY=your-key \
  -e GOOGLE_CSE_ID=your-id \
  Global Search-visualizer
```

---

## 🧪 Development

### Backend Development
```bash
# Auto-reload on code changes
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend

# Start dev server with HMR
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
```

### Testing
```bash
# Backend tests (if available)
pytest

# Frontend tests (if available)
cd frontend
npm run test
```

---

## 🚢 Deployment Options

### 1. Traditional Server
```bash
# Build frontend
cd frontend && npm run build && cd ..

# Run with gunicorn (production)
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### 2. Vercel/Netlify (Frontend Only)
- Deploy `frontend/dist` folder
- Set `VITE_API_URL` to your backend URL
- Configure environment variables in platform

### 3. Cloud Platforms
- **AWS EC2/ECS**: Use Docker container
- **Google Cloud Run**: Deploy containerized app
- **Heroku**: Add `Procfile` with `web: uvicorn app:app --host 0.0.0.0 --port $PORT`

---

## 🔧 Troubleshooting

### Common Issues

**1. Playwright Installation Errors**
```bash
# Reinstall Playwright browsers
playwright install --force chromium
```

**2. CORS Errors (Development)**
- Ensure backend is running on `http://localhost:8000`
- Check `frontend/.env` has correct `VITE_API_URL`

**3. Proxy Connection Failures**
- Verify proxy format: `IP:PORT` (no protocol prefix)
- Test proxies are active and support HTTPS
- Try paid proxies for better reliability

**4. Google API Quota Exceeded**
- Set `fallback_to_browser: true` in `config.json`
- Or use browser-only mode (disable API)

**5. High Memory Usage**
- Lower `max_concurrent_browsers` in `config.json`
- Close unused browser instances
- Monitor with `psutil` (built-in)

### Performance Optimization

**Backend:**
- Adjust concurrency settings based on system resources
- Use SSD storage for faster screenshot saves
- Enable compression for JSON logs

**Frontend:**
- Use production build (`npm run build`)
- Enable lazy loading for images
- Implement virtual scrolling for large result lists

---

## 📊 System Requirements

### Minimum
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 10 GB (results can grow)
- **Network**: Stable internet for proxy connections

### Recommended
- **CPU**: 4+ cores (for optimal concurrency)
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: High-speed connection

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Code Style**:
   - Backend: Follow PEP 8
   - Frontend: Use TypeScript strict mode
   - Run linters before committing

2. **Testing**:
   - Add tests for new features
   - Ensure existing tests pass

3. **Documentation**:
   - Update README for new features
   - Add docstrings to Python functions
   - Comment complex TypeScript logic

4. **Pull Requests**:
   - Create feature branches
   - Write clear commit messages
   - Reference related issues

---

## 📄 License

MIT License - Feel free to use this project for personal or commercial purposes.

---

## 🙏 Acknowledgments

- **Playwright**: Browser automation framework
- **FastAPI**: Modern Python web framework
- **React**: UI library
- **TailwindCSS**: Utility-first CSS framework
- **IP-API**: Geolocation service
- **Webshare**: Free proxy provider

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/0xarchit/global-search-visualizer/issues)
- **Discussions**2: [GitHub Discussions](https://github.com/0xarchit/global-search-visualizer/discussions)
- **Email**: mail@0xarchit.is-a.dev

---

**Built with ❤️ using FastAPI, React, and Playwright**
> Star 🌟 the repo if you like

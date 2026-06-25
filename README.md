# 🤖 AI Radar Pro

> **Discover, compare, and get expert AI recommendations for any task** — powered by a multi-LLM consultant engine, live GitHub repository discovery, and a curated database of AI tools across 17 canonical categories.

---

## What It Does

AI Radar Pro is a full-stack web app that helps users find the best AI tools for their needs. Instead of simple keyword search, it uses a **multi-step LLM-first consultation pipeline** powered by **Google Gemini 2.0 Flash** and **Groq LLaMA 3.3 70B** to deeply understand what the user actually needs — then recommends the most relevant, trusted tools from a curated MongoDB database and the live web.

It also features a **live GitHub Repository browser** that fetches top AI, web development, and data science repositories directly from the GitHub API in real time.

---

## Live URLs

```
Frontend:    http://localhost:5173
Backend API: http://localhost:3001/api
Health:      http://localhost:3001/api/health
```

---

## Key Features

### Smart Dual-Mode Search
The `searchModeDetector.js` service automatically classifies every query into one of two modes:

- **Direct tool search** — type a tool name like `ChatGPT` or `Midjourney` → instant exact/fuzzy DB match via `directToolSearchService.js`
- **Intent-based AI consultation** — describe a need like `I need AI to make YouTube Shorts` → full 10-step LLM pipeline via `aiConsultantOrchestrator.js`

Detection uses alias registry matching, intent keyword scanning (50+ signals), and async DB verification.

### Multi-LLM Consultant Pipeline (10 Steps)
Located in `backend/src/services/aiConsultantOrchestrator.js`:

| Step | Service | Action |
|------|---------|--------|
| 1 | `llmConsultantService.js` | Gemini 2.0 Flash parses query into structured intent, skill level, budget, capabilities, deal-breakers |
| 2 | `llmConsultantService.js` | LLM maps understanding → MongoDB filter fields |
| 3 | `intentCacheService.js` | Redis lookup by intent fingerprint (not raw text) |
| 4 | `capabilitySearchService.js` | Weighted MongoDB search: 45% capability + 25% use-case + 15% feature + 10% popularity + 5% trust |
| 5 | Orchestrator | Relevance filter — cut tools below minimum score threshold |
| 6 | Orchestrator | Sufficiency check — need ≥3 results with top score ≥70 |
| 7 | `intentWebDiscoveryService.js` | If insufficient: search GitHub, Hugging Face, Product Hunt + LLM suggestions |
| 8 | `toolValidationService.js` | Dedup by normalized name, validate required fields, URL check |
| 9 | `recommendationService.js` | LLM generates personalized why_recommended, pros, limitations, confidence (0–100) |
| 10 | `intentCacheService.js` | Write result to Redis for future same-intent queries |

### 17 Canonical Tool Categories
Defined in `categoryRegistry.js` and persisted to every tool via `canonical_categories` field:

`Writing` · `Reading` · `Coding` · `Image Generation` · `Video Generation` · `Audio` · `Productivity` · `Research` · `Marketing` · `Design` · `Finance` · `Legal` · `Cybersecurity` · `Website Builder` · `Search Engines` · `Chatbots` · `LLMs`

### Live GitHub Repository Browser
`githubRepoController.js` fetches directly from the GitHub Search API on every request — no stale cache. Features:
- 20 rotating default topic queries covering LLMs, Stable Diffusion, React, Next.js, RAG, DevOps, Blockchain, FastAPI, and more
- 28 smart keyword mappings: `"portfolio"` → `topic:portfolio language:JavaScript`, `"data analytics"` → `topic:data-analysis language:Python`
- Requires a `GITHUB_TOKEN` to raise limit from 60 → 5,000 req/hr

### Tool Comparison
- Select up to 4 tools side-by-side
- Sticky comparison bar with selected tool avatars
- Dedicated `/compare` page with detailed breakdown

### Authentication & Bookmarks
- Firebase Auth (Google OAuth + email/password)
- Bookmarks saved to MongoDB per user
- Personal Dashboard

### Admin Panel
- Approve/reject submitted tools
- Bulk operations on tool metadata

---

## Tech Stack

### Frontend
| Library | Version | Purpose |
|---------|---------|---------|
| React | 18 | UI framework |
| Vite | 5 | Build tool & dev server |
| Tailwind CSS | 3 | Styling |
| React Router | v6 | Client-side routing |
| Zustand | 4 | Global state (auth, compare, UI) |
| TanStack Query | v5 | Server state & caching |
| Axios | 1.6 | HTTP client |
| Firebase SDK | 10 | Authentication |
| Framer Motion | 10 | Animations |
| Lucide React | — | Icons |

### Backend
| Library | Version | Purpose |
|---------|---------|---------|
| Node.js + Express | 20 + v5 | API server |
| MongoDB + Mongoose | 7 + 8 | Primary database |
| Redis + ioredis | — | Caching + Bull queue backing |
| Bull | 4 | Background job queue |
| Firebase Admin SDK | 12 | JWT verification |
| Google Gemini 2.0 Flash | — | Primary LLM |
| Groq LLaMA 3.3 70B | — | LLM fallback |
| OpenAI GPT-4o | — | AI enrichment |
| Pinecone | — | Vector DB (semantic search) |
| Helmet + CORS | — | Security headers |
| Winston | — | Structured logging |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      BROWSER (React 18)                      │
│         Tailwind UI · Zustand · Firebase SDK · Axios         │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼───────────────────────────────────┐
│                   EXPRESS API (Node 20)                      │
│         Controllers · Middlewares · Rate Limiters            │
└──────┬──────────────┬──────────────┬──────────────┬──────────┘
       │              │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼──────┐ ┌────▼──────────┐
│  MONGODB 7  │ │   REDIS    │ │ FIREBASE  │ │  BULL QUEUE   │
│ Tools/Users │ │ Cache+Jobs │ │   AUTH    │ │    WORKERS    │
└─────────────┘ └────────────┘ └───────────┘ └───────┬───────┘
                                                      │
                       ┌──────────────────────────────▼──────────────┐
                       │               EXTERNAL APIs                 │
                       │  GitHub · HuggingFace · Product Hunt        │
                       │  Gemini 2.0 · Groq LLaMA · OpenAI GPT-4o   │
                       └─────────────────────────────────────────────┘
```

---

## Project Structure

```
ai-radar-pro/
├── backend/
│   ├── src/
│   │   ├── app.js                          # Express server entry
│   │   ├── config/
│   │   │   ├── db.js                       # MongoDB connection
│   │   │   ├── firebase.js                 # Firebase Admin init
│   │   │   ├── openai.js                   # OpenAI client
│   │   │   └── redis.js                    # ioredis client
│   │   ├── controllers/
│   │   │   ├── consultantController.js     # AI consultant (mode detection + routing)
│   │   │   ├── toolController.js           # Tool CRUD + AI search
│   │   │   ├── githubRepoController.js     # Live GitHub API fetching
│   │   │   ├── authController.js           # Auth endpoints
│   │   │   ├── bookmarkController.js       # Bookmark CRUD
│   │   │   ├── adminController.js          # Admin tool management
│   │   │   └── aiController.js             # AI enrichment triggers
│   │   ├── models/
│   │   │   ├── Tool.js                     # Tool schema (50+ fields, text indexes)
│   │   │   ├── User.js                     # User profile
│   │   │   ├── Bookmark.js                 # User bookmarks
│   │   │   ├── GitHubRepository.js         # Cached GitHub repos
│   │   │   └── Review.js                   # Tool reviews
│   │   ├── routes/
│   │   │   ├── tools.js                    # GET/POST/PUT/DELETE /tools
│   │   │   ├── consultant.js               # POST /consultant/recommend
│   │   │   ├── githubRepos.js              # GET /github-repos (live)
│   │   │   ├── auth.js                     # POST /auth/login|register
│   │   │   ├── bookmarks.js                # GET/POST/DELETE /bookmarks
│   │   │   ├── admin.js                    # Admin-only routes
│   │   │   ├── trending.js                 # GET /trending
│   │   │   ├── directToolSearch.js         # GET /tools/search/direct|smart
│   │   │   └── aiToolSearch.js             # POST /ai-tool-search/search
│   │   ├── services/
│   │   │   ├── aiConsultantOrchestrator.js # Master 10-step pipeline
│   │   │   ├── llmConsultantService.js     # Gemini/Groq requirement understanding
│   │   │   ├── capabilitySearchService.js  # Weighted MongoDB capability search
│   │   │   ├── recommendationService.js    # LLM recommendation generation
│   │   │   ├── intentWebDiscoveryService.js# GitHub/HF/PH/LLM web discovery
│   │   │   ├── intentCacheService.js       # Redis intent-based cache
│   │   │   ├── directToolSearchService.js  # Exact/fuzzy direct name search
│   │   │   ├── searchModeDetector.js       # Direct vs intent classifier
│   │   │   ├── categoryRegistry.js         # 17 canonical categories
│   │   │   ├── toolAliasRegistry.js        # Tool name aliases
│   │   │   ├── toolValidationService.js    # Tool data validation
│   │   │   ├── embeddingService.js         # OpenAI/Pinecone embeddings
│   │   │   └── enrichmentService.js        # AI metadata enrichment
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js           # Firebase JWT verify
│   │   │   ├── cacheMiddleware.js          # Redis response cache
│   │   │   ├── rateLimiter.js              # 1000 req/15min per IP
│   │   │   ├── errorHandler.js             # Global error handler
│   │   │   └── validateRequest.js          # Input validation
│   │   ├── jobs/
│   │   │   ├── toolDiscovery.js            # Bull job: discover new tools
│   │   │   ├── aiEnrichment.js             # Bull job: AI metadata enrichment
│   │   │   ├── trendingJob.js              # Bull job: trending score decay
│   │   │   └── worker.js                   # Bull worker process
│   │   └── utils/
│   │       ├── seed.js                     # DB seed runner
│   │       ├── seedCodingFromJson.js        # Seed coding tools from JSON
│   │       ├── seedGithubRepos.js           # Seed 20 curated GitHub repos
│   │       ├── megaSeeder.js               # Bulk tool seeder
│   │       ├── syncVectorDB.js             # Sync MongoDB → Pinecone
│   │       └── logger.js                   # Winston logger
│   └── utils/
│       └── assignCanonicalAndAliases.mjs   # One-time migration: assigns canonical_categories + aliases
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx          # Landing page
│   │   │   ├── Discover.jsx      # Main search + browse page
│   │   │   ├── ToolDetail.jsx    # Full tool profile
│   │   │   ├── RepoDetail.jsx    # GitHub repo detail
│   │   │   ├── Compare.jsx       # Side-by-side tool comparison
│   │   │   ├── Bookmarks.jsx     # User saved tools
│   │   │   ├── Dashboard.jsx     # User profile
│   │   │   └── Admin.jsx         # Admin panel
│   │   ├── components/
│   │   │   ├── tools/
│   │   │   │   ├── ToolCard.jsx        # Tool grid card
│   │   │   │   └── GithubRepoCard.jsx  # Repo card with language badge
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   └── Footer.jsx
│   │   │   └── ui/
│   │   │       └── Button.jsx
│   │   ├── services/
│   │   │   └── api.js            # All Axios API calls
│   │   ├── store/
│   │   │   ├── authStore.js      # Zustand auth state
│   │   │   ├── compareStore.js   # Zustand compare state
│   │   │   └── uiStore.js        # Zustand UI state (dark mode)
│   │   └── hooks/
│   │       └── useAuth.js        # Firebase auth listener
├── docker-compose.yml            # MongoDB 7 + Redis (Alpine)
├── ARCH.md                       # Detailed architecture docs
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js v20+
- npm v9+
- Docker & Docker Compose

### 1. Clone the Repository

```bash
git clone https://github.com/KrusanthS/AI-TOOL-FINDER-AI-RADAR-PRO-.git
cd AI-TOOL-FINDER-AI-RADAR-PRO-
```

### 2. Start MongoDB & Redis

```bash
docker-compose up -d
```

This starts:
- MongoDB 7 on `localhost:27017` (data persisted in `mongodb_data` volume)
- Redis Alpine on `localhost:6379` (data persisted in `redis_data` volume)

### 3. Backend Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in your keys — see Environment Variables below
```

Seed the database:

```bash
npm run seed           # General AI tools
npm run seed:coding    # Coding tools from JSON
```

Start the backend:

```bash
npm run dev            # http://localhost:3001
```

Optionally, run the one-time migration to assign canonical categories and aliases to all existing tools:

```bash
node utils/assignCanonicalAndAliases.mjs
```

### 4. Frontend Setup

```bash
cd ../frontend
npm install
# Create frontend/.env — see Environment Variables below
npm run dev            # http://localhost:5173
```

---

## Environment Variables

### Backend — `backend/.env`

```env
# Server
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

# Database
MONGODB_URI=mongodb://localhost:27017/ai-tools
REDIS_URL=redis://127.0.0.1:6379

# Firebase Admin (Firebase Console → Project Settings → Service Accounts)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AI Models
GEMINI_API_KEY=AIza...           # Primary LLM — Google AI Studio
GROQ_API_KEY=gsk_...             # Fallback LLM — groq.com
OPENAI_API_KEY=sk-...            # AI enrichment + embeddings
OPENAI_MODEL=gpt-4o

# External APIs
GITHUB_TOKEN=ghp_...             # Raises GitHub API limit: 60 → 5000 req/hr
PRODUCT_HUNT_API_KEY=your-key
PRODUCT_HUNT_API_SECRET=your-secret

# Vector DB (optional)
PINECONE_API_KEY=pcsk_...

# Security
JWT_SECRET=your-random-secret
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=1000

# Admin
ADMIN_EMAIL=admin@example.com
```

### Frontend — `frontend/.env`

```env
VITE_API_URL=http://localhost:3001/api
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

---

## Available Scripts

### Backend

```bash
npm run dev             # Start with nodemon (auto-reload)
npm run start           # Production start
npm run seed            # Seed general AI tools into MongoDB
npm run seed:coding     # Seed coding tools from JSON
npm run worker          # Start Bull queue worker process
npm run sync-vector-db  # Sync MongoDB tools → Pinecone
```

### Frontend

```bash
npm run dev       # Vite dev server → http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
npm run lint      # ESLint check
```

### Docker

```bash
docker-compose up -d        # Start MongoDB + Redis
docker-compose down         # Stop services
docker-compose down -v      # Stop + delete data volumes
docker-compose logs -f      # Follow logs
```

---

## API Reference

### Tools

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tools` | List tools (filter: category, pricing, sort, search) |
| `GET` | `/api/tools/:slug` | Single tool by slug |
| `GET` | `/api/tools/categories` | Canonical categories with counts + icons |
| `GET` | `/api/tools/by-category/:category` | Tools in a canonical category |
| `GET` | `/api/tools/search/direct?q=` | Direct tool name search |
| `GET` | `/api/tools/search/smart?q=` | Auto-detect: direct name vs intent |
| `POST` | `/api/tools` | Create tool (admin) |
| `PUT` | `/api/tools/:id` | Update tool (admin) |
| `DELETE` | `/api/tools/:id` | Soft delete tool (admin) |

### AI Consultant

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/consultant/recommend` | Full pipeline — auto-detects direct vs intent |
| `POST` | `/api/consultant/understand` | Preview intent understanding only |
| `POST` | `/api/consultant/direct` | Force direct tool search |
| `POST` | `/api/consultant/detect-mode` | Debug: returns detected mode + reason |

**Request body:**
```json
{
  "query": "I need an AI tool to create YouTube Shorts automatically",
  "limit": 8,
  "budget": "free",
  "skipCache": false
}
```

**Direct tool response** (`type: "direct_tool"`):
```json
{
  "type": "direct_tool",
  "exact_match": true,
  "tool": { "name": "...", "slug": "...", "category": "...", ... },
  "related": [...],
  "source": "direct_search"
}
```

**Intent response** (`type: "intent_search"`):
```json
{
  "type": "intent_search",
  "user_intent": { "intent": "...", "goal": "...", "required_capabilities": [...] },
  "recommended_tools": [{ "name": "...", "why_recommended": "...", "confidence_score": 85, ... }],
  "reasoning": "...",
  "confidence": 82,
  "source": "database | web | hybrid",
  "fromCache": false
}
```

### GitHub Repositories

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/github-repos` | Live repos from GitHub API |
| `GET` | `/api/github-repos/for-tool?toolName=&category=` | Repos related to a tool |
| `GET` | `/api/github-repos/categories` | Repo categories |
| `GET` | `/api/github-repos/:slug` | Single repo by slug |

**Query params:**
```
?search=react        →  topic:react language:JavaScript
?search=portfolio    →  topic:portfolio language:JavaScript
?page=2              →  rotates through 20 different topic queries
```

### Auth & User

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register with email/password |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Current user profile |
| `GET` | `/api/bookmarks` | User's bookmarks |
| `POST` | `/api/bookmarks` | Add bookmark |
| `DELETE` | `/api/bookmarks/:id` | Remove bookmark |
| `GET` | `/api/trending` | Trending tools |

---

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Landing page with featured tools and categories |
| Discover | `/discover` | Main page — unified search, filters, tool grid, GitHub repos |
| Tool Detail | `/tool/:slug` | Full tool profile with AI summary, pros/cons, related repos |
| Repo Detail | `/repo/:slug` | GitHub repository detail |
| Compare | `/compare` | Side-by-side comparison up to 4 tools |
| Bookmarks | `/bookmarks` | User's saved tools (auth required) |
| Dashboard | `/dashboard` | User profile and activity (auth required) |
| Admin | `/admin` | Tool moderation panel (admin only) |

---

## Database Models

### Tool (50+ fields)
Key fields:
```
name, slug                        — Identity
website_url, links, media         — URLs & logos
description, shortDescription     — Content
category, canonical_categories    — 17 canonical taxonomy (persisted)
capabilities, use_cases, features — LLM-searchable capability fields
pricing.model                     — free | freemium | paid | enterprise
stats.rating, stats.views         — Engagement
aiMeta.pros, aiMeta.cons          — AI-generated metadata
trust_score, popularity_score_v2  — Ranking inputs
aliases, search_normalized        — Direct search optimization
```

Indexes: full-text on name/description/tags/capabilities, compound indexes on `(status, capabilities, trust_score)`, `(status, canonical_categories, rating)`.

### GitHubRepository
```
repository_name, slug, repository_url
owner_name, description, stars, forks
language, license, topics, category
```

### User
```
firebaseUid, email, displayName
role (user | admin), bookmarks
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

**Code style:**
- Backend: ES Modules (`import/export`), async/await, Winston logging
- Frontend: React functional components, Tailwind CSS, no inline styles
- Never commit `.env` files
- LLM prompts must be explicit and deterministic (temperature ≤ 0.2)

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Author

**Krusanth S**
- GitHub: [@KrusanthS](https://github.com/KrusanthS)
- Repository: [AI-TOOL-FINDER-AI-RADAR-PRO-](https://github.com/KrusanthS/AI-TOOL-FINDER-AI-RADAR-PRO-.git)

---

<p align="center">Built with React 18 · Node.js 20 · MongoDB 7 · Gemini 2.0 Flash · Groq LLaMA 3.3 70B</p>

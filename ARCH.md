# AI RADAR PRO - SYSTEM ARCHITECTURE

## 1.1 Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AI RADAR PRO ECOSYSTEM                           │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
           ┌────────────────────────▼────────────────────────┐
           │                 BROWSER (React 18)              │
           │  (Tailwind UI, Zustand, Firebase SDK, SSE Client)│
           └────────────────────────┬────────────────────────┘
                                    │ HTTP / SSE / WS
           ┌────────────────────────▼────────────────────────┐
           │                NGINX REVERSE PROXY              │
           │        (SSL Termination, Static Assets)         │
           └────────────────────────┬────────────────────────┘
                                    │ Proxy Pass
           ┌────────────────────────▼────────────────────────┐
           │               EXPRESS API (Node 20)             │
           │   (Controllers, Middlewares, Rate Limiters)     │
           └──────────┬─────────────┬─────────────┬──────────┘
                      │             │             │
      ┌───────────────▼───────┐ ┌───▼─────────────▼───┐ ┌──────────────▼──────┐
      │       MONGODB 7       │ │     REDIS CACHE     │ │    FIREBASE AUTH    │
      │ (Tools, Users, Stats) │ │ (Trending, Sessions)│ │   (JWT Validation)  │
      └───────────────────────┘ └─────────────────────┘ └─────────────────────┘
                      ▲             ▲             ▲
                      │             │             │
           ┌──────────┴─────────────┴─────────────┴──────────┐
           │               BULL QUEUE WORKERS                │
           │  (Tool Discovery, AI Enrichment, Trend Decay)   │
           └──────────┬───────────────────────────┬──────────┘
                      │                           │
           ┌──────────▼──────────┐     ┌──────────▼──────────┐
           │      EXTERNAL       │     │     OPENAI API      │
           │ (ProductHunt, GitHub)│     │ (GPT-4o, Embeddings)│
           └─────────────────────┘     └─────────────────────┘

```

### Data Flow Explanation:
1. **Request Entry**: User interacts with the React frontend. Requests flow through Nginx to the Express backend.
2. **Authentication**: Firebase handles authentication. The backend validates JWTs via Firebase Admin SDK.
3. **Primary Storage**: MongoDB stores tool metadata, user profiles, and bookmarks.
4. **Caching**: Redis caches the tools list, categories, and "Trending" calculations to reduce DB load.
5. **Background Processing**: Bull Queue (backed by Redis) handles long-running jobs like scraping ProductHunt/GitHub and enrichment via OpenAI.
6. **AI Integration**: OpenAI GPT-4o generates descriptions, pros/cons, and comparisons. Embeddings are used for semantic search.

---

## 1.2 Environment Configuration

### .env.example (Backend)
```env
# Server Config
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/airadar
REDIS_URL=redis://localhost:6379

# Authentication (Firebase Admin)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# AI Integration
OPENAI_API_KEY=sk-....
OPENAI_MODEL=gpt-4o

# External APIs
PRODUCTHUNT_TOKEN=your-ph-token

# Security
JWT_SECRET=your-random-secret-for-internal-usage
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### .env.example (Frontend)
```env
VITE_API_URL=http://localhost:3001/api
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
```

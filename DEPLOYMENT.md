# AI Radar Pro - Render Unified Deployment Guide

This guide explains how to deploy both the **Frontend** and **Backend** of **AI Radar Pro** inside a **single Web Service** on Render. This configuration avoids CORS errors entirely, reduces deployment complexity, and hosts both components under the free tier of a single service.

---

## Deployment Strategy (Unified Service)

The project is hosted as a single **Web Service** on Render:
- At build time, Render installs backend and frontend packages, compiles the frontend into static assets (`frontend/dist`), and uploads the combined build.
- At runtime, the Express backend serves these static files directly. Any requests to `/api/*` are handled by backend routing, and any other routes are served the React frontend's `index.html`.

---

## Option 1: Automated Deployment using Render Blueprint (Recommended)

A `render.yaml` file is configured in the root of the repository.

1. Commit and push the `render.yaml` file to your GitHub/GitLab repository.
2. Log in to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** and select **Blueprint**.
4. Connect your git repository.
5. Render will automatically parse the `render.yaml` file and prompt you to fill in the environment variables.
6. Click **Apply** to deploy the services.

---

## Option 2: Manual Dashboard Setup

If you prefer to configure the service manually on the Render dashboard, follow these settings:

### Web Service Settings

Create a new **Web Service** on Render:

*   **Name**: `ai-radar-pro`
*   **Runtime**: `Node`
*   **Repo**: Link your Git repository.
*   **Root Directory**: *(Leave empty / blank)*
*   **Build Command**:
    ```bash
    npm install --prefix backend && npm install --prefix frontend --production=false && npm run build --prefix frontend
    ```
*   **Start Command**:
    ```bash
    npm start --prefix backend
    ```
*   **Instance Type**: `Free` (or any paid tier)

### Environment Variables

Go to the **Environment** tab in your service on Render and add the following keys.

> [!IMPORTANT]
> Since they share the same port and domain, the frontend's API URL is just `/api`.

#### Backend Variables

| Environment Variable | Value/Source | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations. |
| `PORT` | `3001` | Express port (default is 3001). |
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB connection string (e.g., from MongoDB Atlas). |
| `REDIS_URL` | `redis://...` | Connection URL for Redis (e.g., Upstash Redis). |
| `ENABLE_BACKGROUND_JOBS` | `false` | Leave off for a single Render web service unless you also provide Redis. |
| `VALIDATE_GEMINI_ON_STARTUP` | `false` | Skips startup quota checks that can spam logs or hit Gemini limits. |
| `JWT_SECRET` | *Click "Generate"* | Secret used for internal session/token signing. |
| `FIREBASE_PROJECT_ID` | `my-projects-59d67` | Firebase Project ID. |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-...` | Firebase Admin Service Account email. |
| `FIREBASE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\nMIIEvgI... (with literal \n characters)"` | **Note:** Include quotes to preserve newlines. |
| `GROQ_API_KEY` | `gsk_...` | For AI semantic search features. |
| `PINECONE_API_KEY` | `pcsk_...` | For AI Vector/RAG database. |
| `GEMINI_API_KEY` | `AIzaSy...` | For Gemini AI tasks. |
| `OPENAI_API_KEY` | `sk-...` | OpenAI API key (optional/required if using OpenAI). |
| `OPENAI_MODEL` | `gpt-4o` | The model to use. |
| `PRODUCT_HUNT_API_KEY` | `8YYH...` | Product Hunt client key for discovery. |
| `PRODUCT_HUNT_API_SECRET` | `ItUE...` | Product Hunt client secret. |
| `ADMIN_EMAIL` | `admin@example.com` | Main administrator email. |
| `GITHUB_TOKEN` | `ghp_...` | Optional GitHub PAT. |
| `CSP_CONNECT_ORIGINS` | `https://your-app.onrender.com` | Optional comma-separated extra origins allowed by backend CSP `connect-src`. |

#### Frontend Variables (Must start with `VITE_` and be set before building)

| Environment Variable | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `/api` | **Relative URL** since they are on the same domain. |
| `VITE_FIREBASE_API_KEY` | `AIzaSyBUo_ExMR8n...` | Firebase Client Web API Key. |
| `VITE_FIREBASE_AUTH_DOMAIN` | `my-projects-59d67.firebaseapp.com` | Firebase Client Auth Domain. |
| `VITE_FIREBASE_PROJECT_ID` | `my-projects-59d67` | Firebase Project ID. |
| `VITE_FIREBASE_STORAGE_BUCKET` | `my-projects-59d67.firebasestorage.app` | Firebase Storage Bucket. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| `582208044818` | Firebase Messaging Sender ID. |
| `VITE_FIREBASE_APP_ID` | `1:582208044818:web:5085...` | Firebase Web App ID. |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-577MCR1X4E` | Firebase Measurement ID. |

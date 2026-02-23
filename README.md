# Oasis

A full-stack educational quiz platform with adaptive difficulty (TrueSkill), chapters, levels, and user performance tracking.

## Project structure

| Folder | Description |
|--------|-------------|
| **Backend/NodeOne** | Node.js + Express + TypeScript API, WebSockets, auth, quiz logic |
| **Frontend/ReactOne** | React 19 + Vite SPA with MUI, Redux, quiz and admin UIs |
| **Services** | Python scripts for aggregations and topic performance (MongoDB) |

## Tech stack

- **Backend:** Express, TypeScript, MongoDB (Mongoose), Redis, Socket.IO, [better-auth](https://www.better-auth.com/), [ts-trueskill](https://github.com/sublee/trueskill), Google Cloud Storage
- **Frontend:** React 19, Vite, MUI, Redux Toolkit, Socket.IO client, React Router, Framer Motion, KaTeX
- **Services:** Python 3, PyMongo, python-dotenv
- **Deploy:** Docker, Google Cloud (Artifact Registry, Cloud Run)

## Prerequisites

- Node.js (LTS, e.g. 20+)
- Python 3.x (for Services)
- MongoDB
- Redis (optional, for backend features that use it)
- `.env` files in Backend and Services with `MONGO_URI`, etc.

## Quick start

### 1. Backend (NodeOne)

```bash
cd Backend/NodeOne
# Create virtual env if needed: python -m venv env (or use nvm/node)
npm install
# Add .env (PORT, MONGO_URI, REDIS_URL, FRONTEND_URL, etc.)
npm run dev
```

Runs by default on **http://localhost:3000** (API + Socket.IO).

### 2. Frontend (ReactOne)

```bash
cd Frontend/ReactOne
npm install
# Add .env with VITE_BACKEND_URL (e.g. http://localhost:3000)
npm run dev
```

Runs by default on **http://localhost:5173**.

### 3. Services (Python)

```bash
cd Services
python -m venv env
# Windows: .\env\Scripts\activate
# Linux/macOS: source env/bin/activate
pip install -r requirements.txt
# Add .env with MONGO_URI
python daily_aggregation.py      # Session/topic aggregation
python user_topic_performance.py # User topic performance
```

## Main features

- **Auth:** Login/register, approval flow (better-auth)
- **Content:** Subjects → Chapters → Levels; admin CRUD for questions, chapters, topics, sections
- **Quiz:** Multiple flows (Quiz, QuizV2, QuizV3) with batch submission, question palette, TrueSkill-based difficulty
- **Progress:** User chapter sessions, ratings, rank badges (Silver/Gold/Platinum), topic performance
- **Metadata:** Ranks and config driven by admin-defined metadata
- **Profile & dashboard:** Stats, avatars, onboarding, levels UI

## API overview

- `/api/auth/*` — better-auth handlers  
- `/api/chapters`, `/api/levels` — content  
- `/api/level_v2`, `/api/level_v3` — quiz session start/submit  
- `/api/performance` — performance data  
- `/api/admin/*` — admin routes (questions, users, chapters, topics, sections)  
- `/api/user/*` — user profile, chapter sessions  
- `/api/metadata`, `/api/misc` — metadata and misc  
- `/health` — health check (e.g. for Cloud Run)

## Docker

Backend and frontend have Dockerfiles. Example (from repo root or each app dir):

```bash
# Backend
docker build -t nodeone-nodeone:latest ./Backend/NodeOne

# Frontend
docker build -t reactone-reactone:latest ./Frontend/ReactOne
```

Images can be tagged and pushed to Google Artifact Registry (see `Start.txt` for sample `gcloud`/`docker` commands).

## Environment notes

- **Backend:** `PORT`, `MONGO_URI`, `REDIS_URL` (or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`), `FRONTEND_URL`, and any keys for auth/storage as required.
- **Frontend:** `VITE_BACKEND_URL` for API and Socket.IO.
- **Services:** `MONGO_URI` (and any other vars used by the scripts).

Do not commit `.env` files; they are gitignored.

## License

Private / internal use unless otherwise specified.

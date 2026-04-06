# AI Email Assistant Agent

An AI-powered email assistant that classifies emails, generates summaries, and drafts replies in different tones.

## Features

- Email classification (Urgent, Action Required, FYI, Spam) with confidence scores
- One-line email summarization
- Reply draft generation in 3 tones (Formal, Friendly, Brief)
- User preference learning from feedback
- Gmail inbox integration
- File attachment analysis (PDF, DOCX, TXT, CSV)
- JWT authentication + Google OAuth
- Priority inbox and analytics dashboard
- Dark/Light mode

## Tech Stack

**Frontend:** React 19, Vite, Tailwind CSS v4, Framer Motion, Recharts, Axios

**Backend:** FastAPI, SQLAlchemy (async), MySQL 8, Groq API (LLaMA 3.1), JWT Auth

## Getting Started

### Backend
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

Open http://localhost:5173

# VoiceTrace - AI-Powered Business Ledger & Intelligence

[![Backend](https://img.shields.io/badge/Backend-Node.js%20TS-blue)](https://nodejs.org)
[![Frontend](https://img.shields.io/badge/Frontend-React%20Vite-green)](https://react.dev)
[![Database](https://img.shields.io/badge/DB-Drizzle%20SQL-orange)](https://drizzle.team)
[![AI](https://img.shields.io/badge/AI-Groq%20Whisper/LLM-purple)](https://groq.com)

VoiceTrace (aka VyaaparSathi) is a full-stack AI-powered application for small business owners/vendors. It transforms voice notes and paper ledgers into structured financial data using OCR and LLM extraction. Features anomaly detection, supplier mapping, business intelligence, alerts, stock tracking, and more.

![Logo](frontend/public/VyaaparSathi.png)

## 🚀 Features

### Backend
- **Voice Processing**: Record Hindi/English audio → Groq Whisper transcription → LLM structured extraction (sales, expenses, totals)
- **OCR Ledger Upload**: Image → Tesseract OCR → LLM parsing → Ledger entries
- **Ledger Management**: Entries, summaries, earnings reports
- **Customers & Suppliers**: CRUD, balances, nearby suppliers (OSM integration)
- **Stock Tracking**: Items, low-stock alerts, movements
- **Intelligence**: Pattern detection, vendor scores, AI suggestions
- **Alerts & Anomalies**: Real-time notifications, resolution
- **Admin Dashboard**: Stats, logs, vendor management
- API-first: Fastify + Drizzle ORM + PostgreSQL

### Frontend
- Modern React/Vite + Shadcn/UI + Tailwind
- **Pages**: Dashboard, Ledger, Alerts, Admin, Insights/Suggestions, Nearby Suppliers, Upload Ledger, Profile, Udhaar Book
- Voice Recorder Modal, Charts (Recharts), PDF/QR export
- Responsive, brutalist design with animations
- Auth (ProtectedRoutes), Tanstack Query for API

## 🛠 Tech Stack
- **Backend**: Node.js, TypeScript, Fastify, Drizzle ORM, Groq API, Cloudinary, Tesseract OCR
- **Frontend**: React 18, Vite, TypeScript, Shadcn/UI, React Router, Tanstack Query, Recharts, jsPDF, QRCode
- **Database**: PostgreSQL (via Drizzle migrations)
- **Dev**: Vitest, Playwright E2E, ESLint, Tailwind, PostCSS

## 📋 Prerequisites
- Node.js 18+
- PostgreSQL (setup DB, update backend/.env DB_URL)
- Groq API key (free tier ok)
- Cloudinary account
- Bun (optional, frontend lockfile)

## 🔧 Environment Variables

### Backend (backend/.env)
```env
# Database
DATABASE_URL=\"postgresql://user:pass@localhost:5432/voicetrace\"

# AI
GROQ_API_KEY=your_groq_key_here
GROQ_LEDGER_MODEL=llama-3.3-70b-versatile  # Optional

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_VOICE_FOLDER=voicetrace/audio
CLOUDINARY_LEDGER_FOLDER=voicetrace/ledger-images

# App
PORT=3000
CORS_ORIGIN=http://localhost:5173,http://localhost:8080
VOICE_DEFAULT_USER_ID=  # Optional fallback
JWT_SECRET=your_jwt_secret
```

### Frontend (frontend/.env - optional)
```env
VITE_API_BASE_URL=http://localhost:3000
```

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
npx drizzle-kit generate:pg  # Generate migrations
npx drizzle-kit push:pg      # Or migrate
npm run dev
```

### Frontend
```bash
cd frontend
npm install  # or bun install
npm run dev
```

App runs at http://localhost:5173. Backend API at http://localhost:3000.

## 📖 API Documentation
Full endpoints in [backend/docs.md](./backend/docs.md)

### Key Examples

**Voice Processing** `POST /voice/process`
- Upload audio file
- Returns: transcript, structured {items, expenses, earnings, totals, confidence}

**Ledger OCR** `POST /ledger-upload/process`
- Upload image → OCR + LLM → Ledger entries (auto-save if confirmSave=true)

See docs for Admin, Customers, Suppliers, Stock, Alerts, etc.

## 🧩 Frontend Pages
- `/`: Landing
- `/dashboard`: Stats, charts
- `/ledger`: Entries, summaries
- `/alerts`: Notifications
- `/ledger-upload`: OCR paper ledgers
- `/suppliers/nearby`: Mapped suppliers
- `/insights`: AI intelligence
- `/admin`: Vendor management

## 🧪 Testing
```bash
# Frontend
npm test          # Vitest
npm run test:e2e  # Playwright

# Backend (add jest/tsx if needed)
npm test
```

## 📁 Project Structure
```
VoiceTrace/
├── backend/     # API, DB schemas, controllers, services (voice/ocr)
├── frontend/    # React app, pages, shadcn components
├── drizzle/     # DB migrations
├── README.md    ← This file
└── TODO.md
```

## 🤝 Contributing
1. Fork & PR
2. Follow TS/ESLint
3. Update docs.md after API changes
4. Test voice/OCR flows

## 📄 License
MIT

---

⭐ **Built with ❤️ for small business owners. Voice your ledger!**


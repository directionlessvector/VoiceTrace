# VoiceTrace

## Voice AI Ledger Flow

This project now supports an end-to-end voice pipeline:

1. Frontend records audio with `MediaRecorder`
2. Frontend uploads audio to backend (`POST /voice/process`)
3. Backend sends audio to Groq Whisper API for transcription
4. Backend sends transcript to Groq LLM (default `llama-3.3-70b-versatile`) for structured ledger extraction
5. Backend returns JSON with `items`, `expenses`, `earnings`, totals, notes, and confidence flags

## Environment Variables

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key
# Optional override for extraction model
GROQ_LEDGER_MODEL=llama-3.3-70b-versatile
# Cloudinary (required for voice file storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
# Optional folder for uploaded voice assets
CLOUDINARY_VOICE_FOLDER=voicetrace/audio
# Optional folder for OCR ledger images
CLOUDINARY_LEDGER_FOLDER=voicetrace/ledger-images
# Optional fallback user id if frontend does not send userId
VOICE_DEFAULT_USER_ID=existing_user_uuid
# Optional: comma-separated CORS allowed origins
CORS_ORIGIN=http://localhost:8080,http://localhost:5173
PORT=3000
```

Create `frontend/.env` (optional if backend runs on `http://localhost:3000`):

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Run

Backend:

```bash
cd backend
npm i
npm run dev
```

Frontend:

```bash
cd frontend
npm i
npm run dev
```

## API

### `POST /voice/process`

- Content type: `multipart/form-data`
- File field: `audio`
- Optional text fields: `userId`, `recordedAt`
- Optional header: `x-user-id`
- Max file size: 25 MB

Example response shape:

```json
{
	"ok": true,
	"transcript": "aaj 1200 ka sale hua aur 300 ka kharcha hua",
	"languageDetected": "hi",
	"structured": {
		"items": [],
		"expenses": [
			{
				"label": "kharcha",
				"amount": 300,
				"currency": "INR",
				"isApproximate": false,
				"confidence": "high"
			}
		],
		"earnings": [
			{
				"label": "sale",
				"amount": 1200,
				"currency": "INR",
				"isApproximate": false,
				"confidence": "high"
			}
		],
		"totals": {
			"expenseTotal": 300,
			"earningsTotal": 1200,
			"net": 900
		},
		"notes": []
	}
}
```

### `POST /ledger-upload/process`

- Content type: `multipart/form-data`
- File field: `image` (`jpg`/`png`)
- Optional fields: `userId`, `confirmSave` (`true` or `false`)

Behavior:

1. Upload image to Cloudinary
2. Run OCR on image text
3. Send extracted text to Groq for structured extraction
4. If `confirmSave=true`, persist to `voice_sessions` (`session_type=ledger_upload`) and `ledger_entries`

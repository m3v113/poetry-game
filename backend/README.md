# Poetry TTS Backend

A FastAPI backend for text-to-speech generation and poem analysis using Fish Audio API and Claude AI.

## 📁 Project Structure

```
backend/
├── main.py                          # Main FastAPI application
├── requirements.txt                 # Python dependencies
├── temp_audio/                      # Generated audio files (auto-created)
└── app/
    ├── __init__.py
    ├── core/
    │   ├── __init__.py
    │   └── config.py                # Configuration and constants
    ├── models/
    │   ├── __init__.py
    │   └── schemas.py               # Pydantic models
    ├── services/
    │   ├── __init__.py
    │   ├── tts_service.py           # Text-to-speech logic
    │   └── analysis_service.py      # Poem analysis logic
    └── routes/
        ├── __init__.py
        ├── tts.py                   # TTS endpoints
        ├── analysis.py              # Analysis endpoints
        └── audio.py                 # Audio serving endpoints
```

## 🚀 Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Update API keys in `app/core/config.py`:
   - `FISH_AUDIO_API_KEY`
   - `ANTHROPIC_API_KEY`

3. Run the server:
```bash
python main.py
```

or with uvicorn:
```bash
uvicorn main:app --reload
```

## 📡 API Endpoints

### TTS Endpoints
- `GET /api/voices` - Get available voice models
- `POST /api/tts` - Generate speech from text

### Analysis Endpoints
- `POST /api/analyze-poem` - Analyze a poem with Claude AI

### Audio Endpoints
- `GET /audio/{audio_id}` - Serve generated audio file

## 🏗️ Architecture

The codebase follows a clean architecture pattern:

- **Routes**: Handle HTTP requests and responses
- **Services**: Contain business logic
- **Models**: Define data structures (Pydantic schemas)
- **Core**: Configuration and shared utilities

This modular structure makes the code:
- ✅ Easy to test
- ✅ Easy to maintain
- ✅ Easy to scale
- ✅ Easy to understand

# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import httpx
import uuid
from pathlib import Path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FISH_AUDIO_API_KEY = 'eca51db39496421785ed421cd07278f9'
FISH_AUDIO_ENDPOINT = 'https://api.fish.audio/v1/tts'

TEMP_DIR = Path("temp_audio")
TEMP_DIR.mkdir(exist_ok=True)

# 🎤 Voice model mapping (name -> ID)
VOICE_MODELS = {
    "spongebob": "54e3a85ac9594ffa83264b8a494b901b",
    "horror": "ef9c79b62ef34530bf452c0e50e3c260",
    "alle": "59e9dc1cb20c452584788a2690c80970",
    "king_von": "15f5e9388ddd4d7cafebb98e0cae8b8e",
    "cringe": "e9325769eb0b4ba688c8e36fee36e7ae",
    "chinese": "4f201abba2574feeae11e5ebf737859e",
}

class TTSRequest(BaseModel):
    text: str
    pitch: float = 1.0
    speed: float = 1.0
    voice_name: str = "spongebob"  # Send name, not ID!

@app.get("/api/voices")
async def get_voices():
    """Return available voice names"""
    return {"voices": list(VOICE_MODELS.keys())}

@app.post("/api/tts")
async def generate_speech(request: TTSRequest):
    try:
        # Convert voice name to ID
        voice_id = VOICE_MODELS.get(request.voice_name, VOICE_MODELS["spongebob"])
        
        payload = {
            "text": request.text,
            "reference_id": voice_id,
            "temperature": 0.9,
            "top_p": 0.9,
            "prosody": {
                "speed": request.speed,
                "volume": 0
            },
            "chunk_length": 200,
            "normalize": True,
            "format": "mp3",
            "latency": "normal"
        }
        
        print(f"🎤 Voice: {request.voice_name} ({voice_id})")
        print(f"📝 Text: {request.text}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                FISH_AUDIO_ENDPOINT,
                headers={
                    'Authorization': f'Bearer {FISH_AUDIO_API_KEY}',
                    'Content-Type': 'application/json',
                },
                json=payload,
                timeout=30.0
            )
            
            print(f"📊 Status: {response.status_code}, Size: {len(response.content)} bytes")
            
            if response.status_code == 200:
                if len(response.content) == 0:
                    raise HTTPException(status_code=500, detail="Empty audio")
                
                audio_id = str(uuid.uuid4())
                audio_path = TEMP_DIR / f"{audio_id}.mp3"
                
                with open(audio_path, 'wb') as f:
                    f.write(response.content)
                
                print(f"✅ Audio saved")
                
                return {"audio_url": f"http://localhost:8000/audio/{audio_id}"}
            else:
                raise HTTPException(status_code=500, detail=response.text)
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/audio/{audio_id}")
async def get_audio(audio_id: str):
    audio_path = TEMP_DIR / f"{audio_id}.mp3"
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(audio_path, media_type="audio/mpeg")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
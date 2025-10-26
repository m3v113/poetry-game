import httpx
import uuid
from pathlib import Path
from fastapi import HTTPException
from app.core.config import FISH_AUDIO_API_KEY, FISH_AUDIO_ENDPOINT, TEMP_DIR, VOICE_MODELS
from app.models.schemas import TTSRequest

class TTSService:
    """Text-to-Speech service using Fish Audio API"""
    
    @staticmethod
    async def generate_audio(request: TTSRequest) -> str:
        """
        Generate audio from text and return the audio URL
        
        Args:
            request: TTSRequest with text, pitch, speed, and voice_name
            
        Returns:
            str: URL to the generated audio file
        """
        try:
            # Convert voice name to ID
            voice_id = VOICE_MODELS.get(request.voice_name, VOICE_MODELS["poem"])
            
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
                    
                    return f"http://localhost:8000/audio/{audio_id}"
                else:
                    raise HTTPException(status_code=500, detail=response.text)
                    
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @staticmethod
    def get_available_voices() -> list:
        """Get list of available voice names"""
        return list(VOICE_MODELS.keys())

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.core.config import TEMP_DIR

router = APIRouter()

@router.get("/audio/{audio_id}")
async def get_audio(audio_id: str):
    """Serve generated audio file by ID"""
    audio_path = TEMP_DIR / f"{audio_id}.mp3"
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(audio_path, media_type="audio/mpeg")

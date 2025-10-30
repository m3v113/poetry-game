from fastapi import APIRouter
from app.services.diagnostics_service import diagnostics_service

router = APIRouter()

@router.get("/check-fish-audio")
async def check_fish_audio():
    """Test Fish Audio API key and connection"""
    return await diagnostics_service.check_fish_audio_key()
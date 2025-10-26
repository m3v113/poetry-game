from fastapi import APIRouter
from app.models.schemas import TTSRequest, TTSResponse, VoicesResponse
from app.services.tts_service import TTSService

router = APIRouter()

@router.get("/voices", response_model=VoicesResponse)
async def get_voices():
    """Get list of available voice models"""
    voices = TTSService.get_available_voices()
    return {"voices": voices}

@router.post("/tts", response_model=TTSResponse)
async def generate_speech(request: TTSRequest):
    """Generate speech from text using selected voice"""
    audio_url = await TTSService.generate_audio(request)
    return {"audio_url": audio_url}

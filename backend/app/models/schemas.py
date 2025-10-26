from pydantic import BaseModel
from typing import List

class TTSRequest(BaseModel):
    text: str
    pitch: float = 1.0
    speed: float = 1.0
    voice_name: str = "poem"

class TTSResponse(BaseModel):
    audio_url: str

class PoemAnalysisRequest(BaseModel):
    text: str

class PoemAnalysisResponse(BaseModel):
    score: int
    strengths: List[str]
    improvements: List[str]
    literary_devices: List[str]
    mood: str

class VoicesResponse(BaseModel):
    voices: List[str]

from fastapi import APIRouter
from app.models.schemas import PoemAnalysisRequest, PoemAnalysisResponse
from app.services.analysis_service import analysis_service

router = APIRouter()

@router.post("/analyze-poem", response_model=PoemAnalysisResponse)
async def analyze_poem(request: PoemAnalysisRequest):
    """Analyze a poem using Claude AI and return feedback"""
    analysis = await analysis_service.analyze_poem(request)
    return analysis

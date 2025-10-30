import httpx
from fastapi import HTTPException
from app.core.config import FISH_AUDIO_API_KEY, FISH_AUDIO_ENDPOINT

class DiagnosticsService:
    """Service for API diagnostics and health checks"""
    
    @staticmethod
    async def check_fish_audio_key() -> dict:
        """
        Test Fish Audio API key with a minimal request
        Returns diagnostic info without exposing the full key
        """
        try:
            # Use a minimal payload just to test auth
            test_payload = {
                "text": "test",
                "reference_id": "2253ebf60c844c36addfd8939f12e5c2",
                "format": "mp3"
            }
            
            print(f"🔍 Testing Fish Audio API connection...")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    FISH_AUDIO_ENDPOINT,
                    headers={
                        'Authorization': f'Bearer {FISH_AUDIO_API_KEY}',
                        'Content-Type': 'application/json',
                    },
                    json=test_payload,
                    timeout=10.0
                )
                
                status = response.status_code
                response_text = response.text
                
                print(f"📊 Fish Audio Status: {status}")
                if status != 200:
                    print(f"❌ Error response: {response_text}")
                
                return {
                    "service": "Fish Audio API",
                    "status": status,
                    "success": status == 200,
                    "error": None if status == 200 else response_text,
                    "key_info": {
                        "starts_with": FISH_AUDIO_API_KEY[:4] if FISH_AUDIO_API_KEY else None,
                        "length": len(FISH_AUDIO_API_KEY) if FISH_AUDIO_API_KEY else 0
                    }
                }
                
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Connection error: {error_msg}")
            return {
                "service": "Fish Audio API",
                "status": 0,
                "success": False,
                "error": error_msg,
                "key_info": {
                    "starts_with": FISH_AUDIO_API_KEY[:4] if FISH_AUDIO_API_KEY else None,
                    "length": len(FISH_AUDIO_API_KEY) if FISH_AUDIO_API_KEY else 0
                }
            }

diagnostics_service = DiagnosticsService()
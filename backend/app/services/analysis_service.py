import json
from anthropic import Anthropic
from fastapi import HTTPException
from app.core.config import ANTHROPIC_API_KEY
from app.models.schemas import PoemAnalysisRequest, PoemAnalysisResponse
from dotenv import load_dotenv, find_dotenv
import os
load_dotenv
class AnalysisService:
    """Poem analysis service using Claude AI"""
    
    def __init__(self):
        ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
        self.client = Anthropic(api_key=ANTHROPIC_API_KEY)
    
    async def analyze_poem(self, request: PoemAnalysisRequest) -> dict:
        """
        Analyze a poem using Claude AI
        
        Args:
            request: PoemAnalysisRequest with the poem text
            
        Returns:
            dict: Analysis results with score, strengths, improvements, etc.
        """
        try:
            print(f"Analyzing poem: {request.text}")
            
            # Call Claude API
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[{
                    "role": "user",
                    "content": self._build_prompt(request.text)
                }]
            )
            
            # Extract and parse the JSON response
            response_text = message.content[0].text
            analysis = self._parse_response(response_text)
            
            print(f"✅ Analysis complete - Score: {analysis['score']}/10")
            
            return analysis
            
        except Exception as e:
            print(f"❌ Analysis error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    def _build_prompt(self, poem_text: str) -> str:
        """Build the analysis prompt for Claude"""
        return f"""You are an ENCOURAGING poetry mentor who understands this is a creative game with random words. The user is making poetry from ONLY 20 random fridge magnets - this is super creative and challenging!

Poem: "{poem_text}"

IMPORTANT: Be very positive and supportive! This is made from random words, so celebrate their creativity. Don't be harsh or critical.

Respond in valid JSON format:
{{
    "score": <number 6-10 (be generous! minimum 6)>,
    "strengths": [<array of 2-3 enthusiastic compliments about what they did well>],
    "improvements": [<array of 1-2 gentle, optional suggestions framed as "you could try..." not "you should">],
    "literary_devices": [<array of ANY literary devices found - be generous in recognizing patterns>],
    "mood": "<one positive or neutral word describing the vibe>"
}}

SCORING GUIDE:
- 6-7: They tried! Found some cool combinations
- 7-8: Nice work with the random words given
- 8-9: Really creative use of limited words
- 9-10: Wow, amazing poetry from random magnets!

Be enthusiastic, use phrases like:
- "Love how you..."
- "Great job with..."
- "Creative use of..."
- "Nice touch with..."

Remember: They're working with RANDOM words, so celebrate any coherent meaning or interesting combinations!"""
    
    def _parse_response(self, response_text: str) -> dict:
        """Parse Claude's response into a dictionary"""
        try:
            analysis = json.loads(response_text)
        except json.JSONDecodeError:
            # If Claude wrapped it in markdown, extract it
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
                analysis = json.loads(json_str)
            else:
                raise ValueError("Could not parse Claude's response as JSON")
        
        return analysis

# Create singleton instance
analysis_service = AnalysisService()

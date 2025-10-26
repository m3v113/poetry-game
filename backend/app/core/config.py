from pathlib import Path

# API Keys
FISH_AUDIO_API_KEY = 'eca51db39496421785ed421cd07278f9'
ANTHROPIC_API_KEY = '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'

# Endpoints
FISH_AUDIO_ENDPOINT = 'https://api.fish.audio/v1/tts'

# Directories
TEMP_DIR = Path("temp_audio")
TEMP_DIR.mkdir(exist_ok=True)

# Voice model mapping (name -> ID)
VOICE_MODELS = {
    "poem": "2253ebf60c844c36addfd8939f12e5c2",
    "poem2": "b66ab2250cc840e1974c53ffa0196d4b",
    "spongebob": "54e3a85ac9594ffa83264b8a494b901b",
    "horror": "ef9c79b62ef34530bf452c0e50e3c260",
    "alle": "59e9dc1cb20c452584788a2690c80970",
    "king_von": "15f5e9388ddd4d7cafebb98e0cae8b8e",
    "cringe": "e9325769eb0b4ba688c8e36fee36e7ae",
}

class Settings:
    """Application settings"""
    pass

settings = Settings()

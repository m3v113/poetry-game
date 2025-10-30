from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import tts, analysis, audio, diagnostics
from app.core.config import settings

app = FastAPI(title="Poetry TTS API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*","http://localhost:5174/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tts.router, prefix="/api", tags=["TTS"])
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])
app.include_router(audio.router, tags=["Audio"])
app.include_router(diagnostics.router, prefix="/api/debug", tags=["Diagnostics"])

@app.get("/")
async def root():
    return {"message": "Poetry TTS API is running!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

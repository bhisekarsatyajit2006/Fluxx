import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the same directory as this file
BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
    print(f"DEBUG: Loaded environment from {ENV_FILE}")
else:
    load_dotenv() # Fallback to default behavior
    print(f"DEBUG: .env not found at {ENV_FILE}, searching default paths")

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://satyajitbhisekar9_db_user:TestPassword123@cluster0.6hhwge7.mongodb.net/myapp?retryWrites=true&w=majority&appName=Cluster0")
MONGO_DB  = os.getenv("MONGO_DB", "iq_test")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

FRONTEND_URL   = os.getenv("FRONTEND_URL", "http://localhost:5500")
JWT_SECRET     = os.getenv("JWT_SECRET", "super-secret-key-change-me")
ALGORITHM      = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Test config
TOTAL_QUESTIONS = 20
TEST_DURATION_SECONDS = 1800   # 30 minutes

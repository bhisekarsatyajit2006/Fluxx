from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import random
# pyrefly: ignore [missing-import]
import google.generativeai as genai
from datetime import datetime, timezone
from config import GEMINI_API_KEY
from coding_questions import CODING_BANK
from database import get_db

router = APIRouter(prefix="/api/coding", tags=["coding"])

genai.configure(api_key=GEMINI_API_KEY)

class CodeSubmission(BaseModel):
    question_id: str
    code: str
    language: str = "python"
    email: str = None  # Optional email for linking

@router.get("/start")
async def get_coding_question():
    # Pick 1 random question for the round
    question = random.choice(CODING_BANK)
    return question

@router.post("/submit")
async def submit_code(submission: CodeSubmission):
    # Find question
    q = next((x for x in CODING_BANK if x["id"] == submission.question_id), None)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    db = get_db()

    prompt = f"""
Evaluate this code for: {q['title']}
Code:
{submission.code}

Output exactly these sections (BE BRIEF, 2 sentences max each):
1. [SCORE]: X/10
2. [FEEDBACK]: Logic/cleanliness critique.
3. [REFACTOR]: Short suggestion or fix.
"""

    ai_evaluation = None

    try:
        if not GEMINI_API_KEY:
            print("ERROR: No GEMINI_API_KEY configured")
            ai_evaluation = "AI evaluation failed: No API key configured."
        else:
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel('models/gemini-2.5-flash')
            response = model.generate_content(prompt)
            ai_evaluation = response.text
            print("✅ Gemini evaluation successful")
    except Exception as e:
        print(f"⚠️ Gemini Error: {type(e).__name__}: {str(e)}")
        ai_evaluation = f"AI evaluation failed: {str(e)}"

    # Save to history if email provided
    if submission.email and ai_evaluation:
        await db.users.update_one(
            {"email": submission.email},
            {
                "$set": {
                    "coding_rank": "Advanced Candidate",
                    "last_activity": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
                },
                "$push": {
                    "test_history": {
                        "type": "coding",
                        "title": q["title"],
                        "date": datetime.now(timezone.utc)
                    }
                }
            }
        )

    return {
        "question_id": q["id"],
        "title": q["title"],
        "evaluation": ai_evaluation
    }

"""
AI-powered result analysis using Google Gemini.
Falls back to a template-based analysis if no API key is configured.
"""

import httpx
import google.generativeai as genai
from config import GEMINI_API_KEY, NVIDIA_API_KEY, AI_PROVIDER

def _build_prompt(result: dict) -> str:
    breakdown_lines = "\n".join(
        f"  - {cat}: {v['correct']}/{v['total']} correct"
        for cat, v in result["breakdown"].items()
    )
    return f"""
Results: IQ {result['iq_score']} ({result['category']}), {result['percentile']}th percentile.
Correct: {result['correct_count']}/{result['total']}.
Breakdown:
{breakdown_lines}

Task: Write a VERY BRIEF cognitive profile. 
Use these headings and keep each section under 2-3 sentences:
1. [PROFILE]: Summary of standing.
2. [TRENDS]: Strongest vs weakest areas.
3. [TIPS]: 3 quick improvement tips.
4. [SOLUTIONS]: Short logic for 1-2 categories.

Tone: Professional and concise. No bold/italics.
""".strip()


async def generate_ai_analysis(result: dict) -> str:
    """Returns an AI-generated textual analysis of the test result."""
    
    # Priority: NVIDIA NIM
    if NVIDIA_API_KEY:
        print("DEBUG: NVIDIA_API_KEY found. Using NVIDIA NIM for Result Analysis")
        print(f"DEBUG: NVIDIA_API_KEY length: {len(NVIDIA_API_KEY)}")
        try:
            return await _generate_nvidia_analysis(result)
        except Exception as e:
            print(f"⚠️ NVIDIA NIM Error: {type(e).__name__}: {str(e)}")
            print("DEBUG: Falling back to Gemini")

    # Fallback: Gemini
    if not GEMINI_API_KEY:
        print("DEBUG: No AI keys found, using static template.")
        return _fallback_analysis(result)

    print("DEBUG: Using Gemini for Result Analysis")
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        response = await model.generate_content_async(_build_prompt(result))
        return response.text.strip()
    except Exception as exc:
        print(f"⚠️ Gemini error: {type(exc).__name__}: {str(exc)}")
        print("DEBUG: Using fallback template")
        return _fallback_analysis(result)

async def _generate_nvidia_analysis(result: dict) -> str:
    """
    Evaluate code using NVIDIA NIM API.
    Raises: Exception if API call fails
    """
    if not NVIDIA_API_KEY:
        raise ValueError("NVIDIA_API_KEY is not configured")
    
    url = "https://integrate.api.nvidia.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "meta/llama-3.1-405b-instruct",
        "messages": [{"role": "user", "content": _build_prompt(result)}],
        "temperature": 0.5,
        "max_tokens": 800,
        "top_p": 0.95
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            error_text = response.text
            raise Exception(f"NVIDIA API returned status {response.status_code}: {error_text}")
        
        data = response.json()
        
        if "choices" not in data or not data["choices"]:
            raise Exception(f"Unexpected NVIDIA API response: {data}")
        
        return data["choices"][0]["message"]["content"].strip()


def _fallback_analysis(result: dict) -> str:
    iq   = result["iq_score"]
    cat  = result["category"]
    pct  = result["percentile"]
    corr = result["correct_count"]
    tot  = result["total"]

    # Find best and worst categories
    breakdown = result.get("breakdown", {})
    sorted_cats = sorted(
        breakdown.items(),
        key=lambda x: x[1]["correct"] / max(x[1]["total"], 1),
        reverse=True,
    )
    best  = sorted_cats[0][0]  if sorted_cats else "Logical Reasoning"
    worst = sorted_cats[-1][0] if len(sorted_cats) > 1 else "Numerical Reasoning"

    return (
        f"Your IQ score of {iq} places you in the '{cat}' range, "
        f"performing better than approximately {pct}% of the population. "
        f"You answered {corr} out of {tot} questions correctly — a commendable result.\n\n"
        f"Your strongest performance was in {best}, where your logical structuring and "
        f"analytical thinking clearly stood out. "
        f"There is an opportunity to develop further in {worst}; "
        f"targeted practice with puzzles and exercises in this area will yield noticeable gains.\n\n"
        f"Intelligence is not fixed — it grows with consistent mental exercise, curiosity, and "
        f"deliberate practice. Keep challenging yourself every day and your cognitive abilities "
        f"will continue to expand. Well done on completing this assessment!"
    )

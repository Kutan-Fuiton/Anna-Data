from google import genai
from config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)


def generate_summary(aggregated_data: dict) -> str:
    prompt = f"""
You are summarizing aggregated mess feedback for administrators.

Rules:
- Do NOT invent numbers
- Do NOT estimate quantities
- If feedback is limited, clearly say so
- Use neutral, factual language

DATA:
{aggregated_data}
"""

    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=prompt
    )

    # ✅ Safe extraction (Gemini 3 sometimes returns structured output)
    if hasattr(response, "text") and response.text:
        return response.text

    try:
        return response.candidates[0].content.parts[0].text
    except Exception:
        return "No sufficient feedback data available for this period."

"""
Gemini AI Service for Human-Friendly Food Waste Insights
Uses Google Gemini 2.0 Flash to generate natural, engaging messages.
"""

import os
import google.generativeai as genai
from typing import Dict, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class GeminiInsightGenerator:
    """Generates human-friendly insights using Google Gemini API."""
    
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            self.enabled = False
            print("⚠️ Gemini API key not configured. AI insights will be disabled.")
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel("gemini-3-flash-preview")
            self.enabled = True
            print("✓ Gemini AI service initialized successfully")
    
    def _build_user_prompt(self, analysis: Dict, food_counts: Dict) -> str:
        """Build prompt for user-facing insight."""
        items_list = ", ".join([f"{count}x {name}" for name, count in food_counts.items()])
        
        return f"""You are a friendly food waste awareness assistant for a mess/cafeteria.

Based on this plate analysis, generate a SHORT, friendly message (2-3 sentences max) for the person who just finished eating:

- Waste Level: {analysis['waste_level']}
- Food Coverage on Plate: {analysis['coverage_percent']}%
- Items Remaining: {items_list if items_list else 'None (plate is clean!)'}

Guidelines:
- Use an encouraging, non-judgmental tone
- Include a relevant emoji at the start
- If waste is low/none: congratulate them warmly
- If waste is medium/high: gently suggest taking smaller portions next time
- Keep it conversational and human

Respond with ONLY the message, no extra text."""

    def _build_admin_prompt(self, analysis: Dict, food_counts: Dict) -> str:
        """Build prompt for admin-facing insight."""
        items_list = ", ".join([f"{count}x {name}" for name, count in food_counts.items()])
        
        return f"""You are a food waste analytics assistant for mess/cafeteria management.

Generate a concise admin report (3-4 bullet points) based on this data:

- Waste Level: {analysis['waste_level']}
- Food Coverage: {analysis['coverage_percent']}%
- Items Left: {items_list if items_list else 'None'}
- Total Food Items Detected: {analysis.get('food_items_detected', 0)}

Provide:
1. One line summary of waste severity
2. If specific foods are commonly wasted, mention them
3. 1-2 actionable recommendations to reduce waste

Use professional but accessible language. Format as bullet points with emojis.
Respond with ONLY the report, no extra headers or text."""

    async def generate_user_insight(self, analysis: Dict, food_counts: Dict) -> Optional[str]:
        """Generate a human-friendly message for the user."""
        if not self.enabled:
            return None
        
        try:
            prompt = self._build_user_prompt(analysis, food_counts)
            response = await self.model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"⚠️ Gemini user insight failed: {e}")
            return None

    async def generate_admin_insight(self, analysis: Dict, food_counts: Dict) -> Optional[str]:
        """Generate detailed insight for admin/management."""
        if not self.enabled:
            return None
        
        try:
            prompt = self._build_admin_prompt(analysis, food_counts)
            response = await self.model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"⚠️ Gemini admin insight failed: {e}")
            return None

    def generate_user_insight_sync(self, analysis: Dict, food_counts: Dict) -> Optional[str]:
        """Synchronous version for user insight."""
        if not self.enabled:
            return None
        
        try:
            prompt = self._build_user_prompt(analysis, food_counts)
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"⚠️ Gemini user insight failed: {e}")
            return None

    def generate_admin_insight_sync(self, analysis: Dict, food_counts: Dict) -> Optional[str]:
        """Synchronous version for admin insight."""
        if not self.enabled:
            return None
        
        try:
            prompt = self._build_admin_prompt(analysis, food_counts)
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"⚠️ Gemini admin insight failed: {e}")
            return None


# Singleton instance
gemini_service = GeminiInsightGenerator()

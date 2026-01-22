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
            print("[OK] Gemini AI service initialized successfully")
    
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

    async def generate_user_insight(self, analysis: Dict, food_counts: Dict, image_bytes: Optional[bytes] = None) -> Optional[str]:
        """Generate a human-friendly message for the user, with image validation."""
        if not self.enabled:
            return None
        
        try:
            prompt = self._build_user_prompt(analysis, food_counts)
            
            content = [prompt]
            if image_bytes:
                content.append({
                    "mime_type": "image/jpeg",
                    "data": image_bytes
                })
            
            # Add strict validation instruction to the prompt context if image is provided
            if image_bytes:
                validation_prompt = """
                CRITICAL VALIDATION RULE:
                Before generating the insight, look at the image carefully.
                This app is strictly for analyzing food plates and meals.
                
                If this image is NOT a photo of a food plate, a meal, or cafeteria food:
                (e.g., if it's an animal, a screenshot of an app, a computer screen, a person's face, a landscape, text, or any random object)
                Respond with EXACTLY the word: INVALID_IMAGE
                Do not provide any other text, explanation, or polite message.
                """
                content[0] = validation_prompt + "\n\n" + prompt

            response = await self.model.generate_content_async(content)
            return response.text.strip()
        except Exception as e:
            print(f"⚠️ Gemini user insight failed: {e}")
            return None

    async def generate_admin_insight(self, analysis: Dict, food_counts: Dict, image_bytes: Optional[bytes] = None) -> Optional[str]:
        """Generate detailed insight for admin/management."""
        if not self.enabled:
            return None
        
        try:
            prompt = self._build_admin_prompt(analysis, food_counts)
            content = [prompt]
            if image_bytes:
                content.append({
                    "mime_type": "image/jpeg",
                    "data": image_bytes
                })
                
            response = await self.model.generate_content_async(content)
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

    async def generate_weekly_summary(self, aggregated_data: Dict) -> str:
        """Generate a weekly summary of meal feedback using AI."""
        if not self.enabled:
            return "AI summary not available - Gemini API not configured."
        
        try:
            prompt = f"""You are summarizing aggregated mess feedback for administrators.

Rules:
- Do NOT invent numbers
- Do NOT estimate quantities
- If feedback is limited, clearly say so
- Use neutral, factual language
- Format with clear sections and bullet points

DATA:
{aggregated_data}

Provide a concise summary including:
1. Overview of feedback volume
2. Key insights by meal type
3. Common issues or praise
4. Actionable recommendations for mess management"""

            response = await self.model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"⚠️ Gemini weekly summary failed: {e}")
            return "No sufficient feedback data available for this period."

    async def generate_structured_insights(self, aggregated_data: Dict, time_range: str = "weekly") -> Optional[Dict]:
        """
        Generate structured AI insights for admin dashboard.
        Returns categorized insights: issues, improvements, well-performing items.
        """
        if not self.enabled:
            return None
        
        try:
            prompt = f"""You are an AI analyst for a college mess/cafeteria feedback system.
Analyze the following aggregated student feedback data and generate structured insights.

TIME RANGE: {time_range}
FEEDBACK DATA:
{aggregated_data}

IMPORTANT RULES:
- Base insights ONLY on actual data provided - do NOT invent statistics
- If data is insufficient, clearly state that
- Focus on patterns in ratings and comments
- Extract specific dish names mentioned in feedback
- Identify trending issues (things getting worse) vs improvements (things getting better)

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{{
    "issues": [
        {{
            "id": "1",
            "title": "Brief issue title",
            "description": "Detailed description with specific examples from feedback",
            "frequency": <number of mentions or affected items>,
            "trend": "up" | "down" | "stable"
        }}
    ],
    "improvements": [
        {{
            "id": "1", 
            "title": "Brief improvement title",
            "description": "Details on what improved based on feedback"
        }}
    ],
    "wellPerforming": [
        {{
            "id": "1",
            "title": "Well performing dish/aspect",
            "description": "Why this is performing well"
        }}
    ],
    "summary": "One paragraph executive summary of the overall feedback trends"
}}

If there's no data for a category, return an empty array for that category.
Limit to maximum 5 items per category."""

            response = await self.model.generate_content_async(prompt)
            response_text = response.text.strip()
            
            # Clean up response if it has markdown code blocks
            if response_text.startswith("```"):
                response_text = response_text.split("\n", 1)[1]  # Remove first line
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()
            
            import json
            return json.loads(response_text)
        except Exception as e:
            print(f"⚠️ Gemini structured insights failed: {e}")
            return None


# Singleton instance
gemini_service = GeminiInsightGenerator()


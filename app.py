"""
FastAPI Server for Food Detection & Waste Analysis
Upload an image to detect food items, analyze leftovers, and get AI insights.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np
import cv2
import sys
from pathlib import Path
from datetime import datetime

# Add model directory to path
sys.path.insert(0, str(Path(__file__).parent / "model"))

from model.inference import FoodDetector
from gemini_service import gemini_service

app = FastAPI(
    title="Mess-O-Meter Food Waste Analysis API",
    description="Analyze plates to detect food leftovers and generate waste insights",
    version="2.0.0"
)

# Add CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for production/deployment flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize detector once at startup
detector = None

# Global Firestore client
db = None

def get_firestore_client():
    """Get or initialize a global Firestore client."""
    global db
    if db is None:
        from google.cloud import firestore
        import os
        
        # Priority 1: GOOGLE_APPLICATION_CREDENTIALS env var (Best for Render)
        if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            db = firestore.Client()
        else:
            # Priority 2: Look for file in root or mess-o-meter-backend
            paths = [
                Path(__file__).parent / "serviceAccountKey.json",
                Path(__file__).parent / "mess-o-meter-backend" / "serviceAccountKey.json",
                Path("/etc/secrets/service-account.json"), # common Render secret path
                Path("/etc/secrets/serviceAccountKey.json")
            ]
            
            for p in paths:
                if p.exists():
                    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(p)
                    db = firestore.Client()
                    break
        
        if db is None:
            print("⚠️ Warning: Firestore client not initialized - no credentials found")
            
    return db



# ============== Helper Functions ==============

def calculate_box_area(bbox: list) -> float:
    """Calculate area of bounding box."""
    x1, y1, x2, y2 = bbox
    return (x2 - x1) * (y2 - y1)


def analyze_plate_coverage(detections: list, image_shape: tuple) -> dict:
    """
    Analyze how much of the plate is covered with food.
    Returns coverage metrics and waste analysis.
    """
    image_area = image_shape[0] * image_shape[1]
    
    plate_bbox = None
    food_items = []
    
    for det in detections:
        if det["class_name"].lower() == "plate":
            plate_bbox = det["bbox"]
        else:
            food_items.append(det)
    
    # Calculate plate area (use detected plate or estimate as 70% of image)
    if plate_bbox:
        plate_area = calculate_box_area(plate_bbox)
    else:
        plate_area = image_area * 0.7  # Estimate
    
    # Calculate total food area
    total_food_area = sum(calculate_box_area(item["bbox"]) for item in food_items)
    
    # Coverage percentage (food area relative to plate)
    coverage_percent = min((total_food_area / plate_area) * 100, 100) if plate_area > 0 else 0
    
    # Determine waste level
    if coverage_percent >= 60:
        waste_level = "HIGH"
        waste_description = "Significant food remaining"
    elif coverage_percent >= 30:
        waste_level = "MEDIUM"
        waste_description = "Moderate food remaining"
    elif coverage_percent >= 10:
        waste_level = "LOW"
        waste_description = "Minimal food remaining"
    else:
        waste_level = "NONE"
        waste_description = "Plate is clean"
    
    return {
        "plate_detected": plate_bbox is not None,
        "coverage_percent": round(coverage_percent, 1),
        "waste_level": waste_level,
        "waste_description": waste_description,
        "food_items_detected": len(food_items),
        "total_food_area_px": round(total_food_area),
        "plate_area_px": round(plate_area)
    }


def generate_food_details(detections: list) -> list:
    """Generate detailed info for each food item."""
    food_details = []
    
    for det in detections:
        if det["class_name"].lower() == "plate":
            continue
            
        bbox = det["bbox"]
        area = calculate_box_area(bbox)
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        
        # Estimate portion size based on area
        if area > 40000:
            portion = "Large"
        elif area > 15000:
            portion = "Medium"
        else:
            portion = "Small"
        
        food_details.append({
            "item": det["class_name"],
            "confidence": round(det["confidence"] * 100, 1),
            "portion_size": portion,
            "dimensions": {
                "width": round(width),
                "height": round(height)
            }
        })
    
    return food_details


def generate_user_insight(analysis: dict, food_counts: dict) -> str:
    """Generate friendly insight message for the user."""
    waste_level = analysis["waste_level"]
    coverage = analysis["coverage_percent"]
    items = list(food_counts.keys())
    
    if waste_level == "NONE":
        return "🌟 Great job! You finished your meal completely. Thank you for minimizing food waste!"
    
    elif waste_level == "LOW":
        return f"👍 Well done! Only a little bit of food remaining ({coverage:.0f}% coverage). You're helping reduce food waste!"
    
    elif waste_level == "MEDIUM":
        items_str = ", ".join(items[:3])
        return f"⚠️ About {coverage:.0f}% of food is remaining ({items_str}). Consider taking smaller portions next time to reduce waste."
    
    else:  # HIGH
        items_str = ", ".join(items[:3])
        return f"🚨 Significant food waste detected ({coverage:.0f}% coverage). Items remaining: {items_str}. Please consider taking only what you can finish."


def generate_admin_insight(analysis: dict, food_counts: dict) -> dict:
    """Generate detailed insights for admin/mess management."""
    
    # Find most wasted items
    sorted_items = sorted(food_counts.items(), key=lambda x: x[1], reverse=True)
    
    # Recommendations based on waste level
    recommendations = []
    
    if analysis["waste_level"] in ["HIGH", "MEDIUM"]:
        if "Rice" in food_counts:
            recommendations.append("Consider reducing default rice portion size")
        if "Roti" in food_counts:
            recommendations.append("Offer rotis on-demand rather than pre-plated")
        if len(food_counts) > 4:
            recommendations.append("Too many items may lead to waste - consider combo meals")
        recommendations.append("Display waste awareness signage near serving area")
    
    return {
        "waste_level": analysis["waste_level"],
        "coverage_percent": analysis["coverage_percent"],
        "items_left": dict(sorted_items),
        "most_wasted_item": sorted_items[0][0] if sorted_items else None,
        "total_items_remaining": sum(food_counts.values()),
        "recommendations": recommendations,
        "action_required": analysis["waste_level"] in ["HIGH", "MEDIUM"]
    }


# ============== API Endpoints ==============

@app.on_event("startup")
async def load_model():
    """Load the food detection model on startup."""
    global detector
    try:
        model_path = Path(__file__).parent / "model" / "food_detection_model.pt"
        detector = FoodDetector(model_path=str(model_path))
        print("✓ Food detection model loaded successfully")
    except Exception as e:
        print(f"✗ Failed to load model: {e}")
        raise e


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Mess-O-Meter Food Waste Analysis API is running"}


@app.post("/analyze")
async def analyze_food_waste(image: UploadFile = File(...)):
    """
    Upload an image of a plate to analyze food waste.
    
    Returns:
        - food_summary: Count of each food type remaining
        - waste_analysis: Coverage %, waste level (NONE/LOW/MEDIUM/HIGH)
        - user_insight: Friendly message for the user
        - admin_insight: Detailed stats and recommendations for admins
    """
    if detector is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode image")
        
        results = detector.detect(img)
        
        # Count items by class (excluding 'Plate')
        food_counts = {}
        for det in results["detections"]:
            class_name = det["class_name"]
            if class_name.lower() != "plate":
                food_counts[class_name] = food_counts.get(class_name, 0) + 1
        
        # Perform analysis
        waste_analysis = analyze_plate_coverage(results["detections"], results["image_shape"])
        food_details = generate_food_details(results["detections"])
        user_insight = generate_user_insight(waste_analysis, food_counts)
        admin_insight = generate_admin_insight(waste_analysis, food_counts)
        
        # Generate AI-powered insights using Gemini (passing raw image for verification)
        ai_user_insight = await gemini_service.generate_user_insight(waste_analysis, food_counts, contents)
        
        # Check for rejection
        if ai_user_insight == "INVALID_IMAGE":
            return JSONResponse({
                "success": False,
                "error": "INVALID_IMAGE",
                "message": "The uploaded photo does not appear to be a food plate. Please upload a clear photo of your meal."
            }, status_code=400)

        ai_admin_insight = await gemini_service.generate_admin_insight(waste_analysis, food_counts, contents)
        
        return JSONResponse({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "image_size": {
                "width": results["image_shape"][1],
                "height": results["image_shape"][0]
            },
            "food_summary": food_counts,
            "food_details": food_details,
            "waste_analysis": waste_analysis,
            "user_insight": ai_user_insight if ai_user_insight else user_insight,
            "admin_insight": {
                **admin_insight,
                "ai_summary": ai_admin_insight
            }
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/generate-weekly-summary")
async def generate_weekly_summary():
    """
    Generate an AI-powered weekly summary of meal feedback.
    Aggregates all feedback from Firestore and uses Gemini to create insights.
    """
    try:
        from google.cloud import firestore
        import os
        
        # Initialize Firestore (uses GOOGLE_APPLICATION_CREDENTIALS env var)
        service_key_path = Path(__file__).parent / "mess-o-meter-backend" / "serviceAccountKey.json"
        if service_key_path.exists():
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(service_key_path)
        
        db = firestore.Client()
        
        # Fetch all meal feedback
        feedback_docs = db.collection("mealFeedback").stream()
        
        dish_stats = {}
        total_feedback = 0
        
        for doc in feedback_docs:
            data = doc.to_dict()
            meal = data.get("mealType", "unknown")
            ratings = data.get("ratings", {})
            text = data.get("text") or data.get("comment") or ""
            
            dish_stats.setdefault(meal, {
                "count": 0,
                "ratingsSum": {},
                "issues": {}
            })
            
            dish_stats[meal]["count"] += 1
            total_feedback += 1
            
            # Aggregate ratings
            for k, v in ratings.items():
                if isinstance(v, (int, float)):
                    dish_stats[meal]["ratingsSum"][k] = (
                        dish_stats[meal]["ratingsSum"].get(k, 0) + v
                    )
            
            # Extract issues from text
            for word in text.lower().split():
                dish_stats[meal]["issues"][word] = (
                    dish_stats[meal]["issues"].get(word, 0) + 1
                )
        
        # No feedback guard
        if total_feedback == 0:
            return {
                "success": True,
                "message": "No feedback available",
                "content": "No meal feedback was submitted during this period."
            }
        
        aggregated_data = {
            "range": "weekly",
            "totalFeedback": total_feedback,
            "dishStats": dish_stats
        }
        
        # Generate AI summary using Gemini
        summary = await gemini_service.generate_weekly_summary(aggregated_data)
        
        # Save AI output to Firestore
        db.collection("aiSummaries").document("weekly_summary").set({
            "range": "weekly",
            "type": "feedback",
            "content": summary,
            "generatedAt": datetime.utcnow()
        })
        
        return {
            "success": True,
            "message": "Weekly AI summary generated",
            "content": summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")


class AIInsightsRequest(BaseModel):
    time_range: str = "weekly"  # 'daily', 'weekly', or 'monthly'


@app.post("/generate-ai-insights")
async def generate_ai_insights(request: AIInsightsRequest):
    """
    Generate structured AI insights from student meal feedback.
    Returns categorized insights: issues, improvements, well-performing dishes.
    """
    try:
        from google.cloud import firestore
        from datetime import timedelta
        import os
        
        # Initialize Firestore (uses GOOGLE_APPLICATION_CREDENTIALS env var)
        service_key_path = Path(__file__).parent / "serviceAccountKey.json"
        if not service_key_path.exists():
            service_key_path = Path(__file__).parent / "mess-o-meter-backend" / "serviceAccountKey.json"
            
        if service_key_path.exists():
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(service_key_path)
        
        db = firestore.Client()
        
        # Determine date range
        now = datetime.utcnow()
        if request.time_range == "daily":
            start_date = now - timedelta(days=1)
        elif request.time_range == "monthly":
            start_date = now - timedelta(days=30)
        else:  # weekly (default)
            start_date = now - timedelta(days=7)
        
        # Fetch meal feedback within range
        feedback_query = db.collection("mealFeedback").where("createdAt", ">=", start_date)
        feedback_docs = feedback_query.stream()
        
        # Aggregate feedback data
        aggregated_data = {
            "timeRange": request.time_range,
            "totalFeedback": 0,
            "mealTypes": {},
            "comments": [],
            "wasteAnalysis": {
                "totalAnalyses": 0,
                "wasteLevelCounts": {"NONE": 0, "LOW": 0, "MEDIUM": 0, "HIGH": 0},
                "avgCoveragePercent": 0,
                "foodItemsWasted": {}
            },
            "ratingAverages": {"taste": [], "oil": [], "quantity": [], "hygiene": []}
        }
        
        for doc in feedback_docs:
            data = doc.to_dict()
            aggregated_data["totalFeedback"] += 1
            
            # Track by meal type
            meal_type = data.get("mealType", "unknown")
            if meal_type not in aggregated_data["mealTypes"]:
                aggregated_data["mealTypes"][meal_type] = {"count": 0, "ratings": []}
            aggregated_data["mealTypes"][meal_type]["count"] += 1
            
            # Collect comments
            comment = data.get("comment") or data.get("text") or ""
            if comment.strip():
                aggregated_data["comments"].append({
                    "mealType": meal_type,
                    "text": comment[:200],  # Limit length
                    "ratings": data.get("ratings", {})
                })
            
            # Aggregate ratings
            ratings = data.get("ratings", {})
            for key in ["taste", "oil", "quantity", "hygiene"]:
                if key in ratings and isinstance(ratings[key], (int, float)):
                    aggregated_data["ratingAverages"][key].append(ratings[key])
            
            # Aggregate waste analysis
            waste = data.get("wasteAnalysis")
            if waste:
                aggregated_data["wasteAnalysis"]["totalAnalyses"] += 1
                waste_level = waste.get("wasteLevel", "NONE")
                if waste_level in aggregated_data["wasteAnalysis"]["wasteLevelCounts"]:
                    aggregated_data["wasteAnalysis"]["wasteLevelCounts"][waste_level] += 1
                
                coverage = waste.get("coveragePercent", 0)
                aggregated_data["wasteAnalysis"]["avgCoveragePercent"] += coverage
                
                food_items = waste.get("foodItems", {})
                for item, count in food_items.items():
                    current = aggregated_data["wasteAnalysis"]["foodItemsWasted"].get(item, 0)
                    aggregated_data["wasteAnalysis"]["foodItemsWasted"][item] = current + count
        
        # Calculate averages
        for key in ["taste", "oil", "quantity", "hygiene"]:
            values = aggregated_data["ratingAverages"][key]
            if values:
                aggregated_data["ratingAverages"][key] = round(sum(values) / len(values), 2)
            else:
                aggregated_data["ratingAverages"][key] = 0
        
        if aggregated_data["wasteAnalysis"]["totalAnalyses"] > 0:
            aggregated_data["wasteAnalysis"]["avgCoveragePercent"] = round(
                aggregated_data["wasteAnalysis"]["avgCoveragePercent"] / 
                aggregated_data["wasteAnalysis"]["totalAnalyses"], 1
            )
        
        # No feedback guard
        if aggregated_data["totalFeedback"] == 0:
            empty_insights = {
                "issues": [],
                "improvements": [],
                "wellPerforming": [],
                "summary": f"No feedback data available for the {request.time_range} period."
            }
            return {
                "success": True,
                "insights": empty_insights,
                "generatedAt": datetime.utcnow().isoformat()
            }
        
        # Generate structured AI insights using Gemini
        insights = await gemini_service.generate_structured_insights(
            aggregated_data, 
            request.time_range
        )
        
        if not insights:
            # Fallback if AI fails
            insights = {
                "issues": [],
                "improvements": [],
                "wellPerforming": [],
                "summary": "AI analysis temporarily unavailable. Please try again later."
            }
        
        # Save to Firestore
        doc_id = f"insights_{request.time_range}"
        db.collection("aiSummaries").document(doc_id).set({
            "type": "structured_insights",
            "timeRange": request.time_range,
            "insights": insights,
            "aggregatedData": {
                "totalFeedback": aggregated_data["totalFeedback"],
                "wasteAnalyses": aggregated_data["wasteAnalysis"]["totalAnalyses"],
                "ratingAverages": aggregated_data["ratingAverages"]
            },
            "generatedAt": datetime.utcnow()
        })
        
        return {
            "success": True,
            "insights": insights,
            "meta": {
                "totalFeedback": aggregated_data["totalFeedback"],
                "wasteAnalyses": aggregated_data["wasteAnalysis"]["totalAnalyses"],
                "timeRange": request.time_range
            },
            "generatedAt": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")


# ============== QR Code API Endpoints ==============

class QRGenerateRequest(BaseModel):
    meal_type: str  # 'breakfast', 'lunch', or 'dinner'
    force_refresh: bool = False


class QRResponse(BaseModel):
    success: bool
    qr_data: Optional[str] = None
    meal_type: Optional[str] = None
    date: Optional[str] = None
    error: Optional[str] = None


def get_today_date_str() -> str:
    """Get today's date as YYYY-MM-DD string."""
    return datetime.now().strftime("%Y-%m-%d")


def generate_qr_payload(meal_type: str, date_str: str) -> dict:
    """Generate QR payload for a meal."""
    import time
    qr_id = f"{meal_type}_{date_str}_{int(time.time() * 1000)}"
    return {
        "type": "admin_attendance",
        "mealType": meal_type,
        "date": date_str,
        "qrId": qr_id,
        "generatedAt": int(time.time() * 1000)
    }


@app.post("/qr/generate", response_model=QRResponse)
async def generate_qr(request: QRGenerateRequest):
    """
    Generate or get existing QR code for a meal.
    
    Args:
        meal_type: breakfast, lunch, or dinner
        force_refresh: If true, generates a new QR even if one exists
    
    Returns:
        QR data as JSON string to be encoded into QR image
    """
    import json
    
    meal_type = request.meal_type.lower()
    if meal_type not in ['breakfast', 'lunch', 'dinner']:
        raise HTTPException(status_code=400, detail="Invalid meal_type. Must be breakfast, lunch, or dinner.")
    
    try:
        db = get_firestore_client()
        if db is None:
            return QRResponse(success=False, error="Database connection failed")
            
        date_str = get_today_date_str()
        doc_id = f"{meal_type}_{date_str}"
        doc_ref = db.collection("adminAttendanceQR").document(doc_id)
        
        # Force refresh: delete existing and create new
        if request.force_refresh:
            doc_ref.delete()
        else:
            # Check if QR already exists
            existing = doc_ref.get()
            if existing.exists:
                data = existing.to_dict()
                return QRResponse(
                    success=True,
                    qr_data=data.get("qrData"),
                    meal_type=meal_type,
                    date=date_str
                )
        
        # Generate new QR
        payload = generate_qr_payload(meal_type, date_str)
        qr_data = json.dumps(payload)
        
        # Save to Firestore
        doc_ref.set({
            "mealType": meal_type,
            "date": date_str,
            "qrData": qr_data,
            "qrId": payload["qrId"],
            "createdAt": datetime.utcnow()
        })
        
        return QRResponse(
            success=True,
            qr_data=qr_data,
            meal_type=meal_type,
            date=date_str
        )
        
    except Exception as e:
        return QRResponse(success=False, error=str(e))


@app.get("/qr/{meal_type}", response_model=QRResponse)
async def get_qr(meal_type: str):
    """Get current QR code for a meal."""
    import json
    
    meal_type = meal_type.lower()
    if meal_type not in ['breakfast', 'lunch', 'dinner']:
        raise HTTPException(status_code=400, detail="Invalid meal_type.")
    
    try:
        db = get_firestore_client()
        if db is None:
            return QRResponse(success=False, error="Database connection failed")
            
        date_str = get_today_date_str()
        doc_id = f"{meal_type}_{date_str}"
        doc_ref = db.collection("adminAttendanceQR").document(doc_id)
        
        existing = doc_ref.get()
        if existing.exists:
            data = existing.to_dict()
            return QRResponse(
                success=True,
                qr_data=data.get("qrData"),
                meal_type=meal_type,
                date=date_str
            )
        else:
            return QRResponse(
                success=False,
                error="No QR code generated for this meal yet"
            )
        
    except Exception as e:
        return QRResponse(success=False, error=str(e))

# ============== Static File Serving for Single URL Deployment ==============

# Path to the frontend build directory
FRONTEND_BUILD_DIR = Path(__file__).parent / "app" / "dist"

# Only mount static files if the build directory exists
if FRONTEND_BUILD_DIR.exists():
    # Mount static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_BUILD_DIR / "assets")), name="static_assets")
    
    # Serve other static files from the root
    @app.get("/logo.png")
    async def serve_logo():
        logo_path = FRONTEND_BUILD_DIR / "logo.png"
        if logo_path.exists():
            return FileResponse(str(logo_path))
        raise HTTPException(status_code=404)
    
    @app.get("/vite.svg")
    async def serve_vite_svg():
        svg_path = FRONTEND_BUILD_DIR / "vite.svg"
        if svg_path.exists():
            return FileResponse(str(svg_path))
        raise HTTPException(status_code=404)
    
    # Catch-all route for SPA - must be LAST
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve the React SPA for all non-API routes."""
        # Don't serve index.html for API routes
        if full_path.startswith(("analyze", "generate", "qr", "health", "docs", "openapi", "redoc")):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        index_path = FRONTEND_BUILD_DIR / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path), media_type="text/html")
        raise HTTPException(status_code=404, detail="Frontend not built")
    
    print(f"[OK] Serving frontend from {FRONTEND_BUILD_DIR}")
else:
    print(f"⚠️ Frontend build not found at {FRONTEND_BUILD_DIR}. Run 'cd app && npm run build' first.")


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

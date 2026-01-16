"""
FastAPI Server for Food Detection & Waste Analysis
Upload an image to detect food items, analyze leftovers, and get AI insights.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
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

app = FastAPI(
    title="Mess-O-Meter Food Waste Analysis API",
    description="Analyze plates to detect food leftovers and generate waste insights",
    version="2.0.0"
)

# Initialize detector once at startup
detector = None


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
            "user_insight": user_insight,
            "admin_insight": admin_insight
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

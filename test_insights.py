
import asyncio
import os
from pathlib import Path
from google.cloud import firestore
from datetime import datetime, timedelta
from gemini_service import GeminiInsightGenerator

# Setup
service_key_path = Path(__file__).parent / "serviceAccountKey.json"
if not service_key_path.exists():
    service_key_path = Path(__file__).parent / "mess-o-meter-backend" / "serviceAccountKey.json"

if service_key_path.exists():
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(service_key_path)
    print(f"Using credentials from {service_key_path}")

try:
    db = firestore.Client.from_service_account_json(str(service_key_path))
    print("Firestore client initialized explicitly.")
except Exception as e:
    print(f"Failed to initialize Firestore: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

gemini_service = GeminiInsightGenerator()

async def test_aggregation():
    print("--- Starting Isolation Test (google-cloud-firestore) ---")
    time_range = "weekly"
    days = 7
    # Use UTC to match app.py logic
    start_date = datetime.utcnow() - timedelta(days=days)
    
    print(f"Fetching feedback since {start_date}...")
    try:
        # Note: google-cloud-firestore might need specific field names
        # Check if 'createdAt' or 'date' is the timestamp field
        feedback_ref = db.collection('mealFeedback').where('createdAt', '>=', start_date)
        docs = list(feedback_ref.stream())
        
        print(f"Found {len(docs)} feedback entries.")
        
        if not docs:
            print("No feedback found in range. Checking ALL feedback to see field names...")
            all_docs = list(db.collection('mealFeedback').limit(1).stream())
            if all_docs:
                print("Fields in first document:", all_docs[0].to_dict().keys())
            return

        aggregated_data = {
            "timeRange": time_range,
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

        for doc in docs:
            f = doc.to_dict()
            aggregated_data["totalFeedback"] += 1
            
            # Meal type stats
            m_type = f.get("mealType", "unknown")
            aggregated_data["mealTypes"][m_type] = aggregated_data["mealTypes"].get(m_type, 0) + 1
            
            # Ratings
            r = f.get("ratings", {})
            for key in ["taste", "oil", "quantity", "hygiene"]:
                if key in r:
                    aggregated_data["ratingAverages"][key].append(r[key])
            
            # Comments
            comment = f.get("comment") or f.get("text")
            if comment:
                aggregated_data["comments"].append(comment)
            
            # Waste Analysis
            wa = f.get("wasteAnalysis")
            if wa:
                aggregated_data["wasteAnalysis"]["totalAnalyses"] += 1
                level = wa.get("wasteLevel")
                if level in aggregated_data["wasteAnalysis"]["wasteLevelCounts"]:
                    aggregated_data["wasteAnalysis"]["wasteLevelCounts"][level] += 1
                
                aggregated_data["wasteAnalysis"]["avgCoveragePercent"] += wa.get("coveragePercent", 0)
                
                items = wa.get("foodItems", {})
                for item, waste in items.items():
                    if item not in aggregated_data["wasteAnalysis"]["foodItemsWasted"]:
                        aggregated_data["wasteAnalysis"]["foodItemsWasted"][item] = []
                    aggregated_data["wasteAnalysis"]["foodItemsWasted"][item].append(waste)

        # Calculate averages
        for key in aggregated_data["ratingAverages"]:
            vals = aggregated_data["ratingAverages"][key]
            aggregated_data["ratingAverages"][key] = sum(vals) / len(vals) if vals else 0
            
        wa_stats = aggregated_data["wasteAnalysis"]
        if wa_stats["totalAnalyses"] > 0:
            wa_stats["avgCoveragePercent"] /= wa_stats["totalAnalyses"]
            
        for item in wa_stats["foodItemsWasted"]:
            vals = wa_stats["foodItemsWasted"][item]
            wa_stats["foodItemsWasted"][item] = sum(vals) / len(vals) if vals else 0

        print("Aggregated data completed.")
        print(f"Calling Gemini with {aggregated_data['totalFeedback']} entries...")
        
        insights = await gemini_service.generate_structured_insights(aggregated_data, time_range)
        
        if insights:
            print("--- Generated Insights ---")
            print(insights)
            
            # Test saving to Firestore
            doc_id = f"insights_{time_range}"
            doc_data = {
                **insights,
                "generatedAt": firestore.SERVER_TIMESTAMP,
                "timeRange": time_range,
                "feedbackCount": aggregated_data["totalFeedback"]
            }
            db.collection('aiSummaries').document(doc_id).set(doc_data)
            print(f"Successfully saved to aiSummaries/{doc_id}")
        else:
            print("Gemini failed to generate insights.")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_aggregation())

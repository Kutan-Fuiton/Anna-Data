from fastapi import FastAPI
from firestore import db
from ai import generate_summary
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/generate-weekly-summary")
def generate_weekly_summary():
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

        # 🔹 Aggregate ratings
        for k, v in ratings.items():
            if isinstance(v, (int, float)):
                dish_stats[meal]["ratingsSum"][k] = (
                    dish_stats[meal]["ratingsSum"].get(k, 0) + v
                )

        # 🔹 Extract issues from text
        for word in text.lower().split():
            dish_stats[meal]["issues"][word] = (
                dish_stats[meal]["issues"].get(word, 0) + 1
            )

    # 🛑 No feedback guard
    if total_feedback == 0:
        return {
            "message": "No feedback available",
            "content": "No meal feedback was submitted during this period."
        }

    aggregated_data = {
        "range": "weekly",
        "totalFeedback": total_feedback,
        "dishStats": dish_stats
    }

    summary = generate_summary(aggregated_data)

    # 🔹 Save AI output
    db.collection("aiSummaries").document("weekly_summary").set({
        "range": "weekly",
        "type": "feedback",
        "content": summary,
        "generatedAt": datetime.utcnow()
    })

    return {
        "message": "Weekly AI summary generated",
        "content": summary
    }

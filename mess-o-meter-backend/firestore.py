from google.cloud import firestore
import os

try:
    # IMPORTANT: path to your service account key
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "serviceAccountKey.json"
    if os.path.exists("serviceAccountKey.json"):
        db = firestore.Client()
        print("✓ Firestore connected using serviceAccountKey.json")
    else:
        print("⚠ serviceAccountKey.json not found. Firestore features will fail.")
        db = None
except Exception as e:
    print(f"⚠ Firestore connection failed: {e}")
    db = None

from google.cloud import firestore
import os

# IMPORTANT: path to your service account key
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "serviceAccountKey.json"

db = firestore.Client()

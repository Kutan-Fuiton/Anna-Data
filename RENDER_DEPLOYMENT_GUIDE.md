# 🚀 Render Deployment Guide - Frontend to Backend Connection

## Issues Fixed ✅

1. **CORS Configuration** - Updated backend to accept all origins
2. **Environment Variables** - Frontend now points to deployed backend URL
3. **API Endpoint Configuration** - Verified `/analyze` endpoint exists in `app.py`

---

## Critical Steps for Render Deployment

### 1. **Environment Variables on Render**

Go to your **Render Dashboard** → **Services** → **mess-o-meter-api**:

#### Add these environment variables:
```
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/service-account.json
PYTHON_VERSION=3.10.0
```

### 2. **Upload Google Cloud Service Account Key**

1. In Render Dashboard, go to **Environment** → **Secret Files**
2. **File Path:** `/etc/secrets/service-account.json`
3. **Content:** Paste your entire `serviceAccountKey.json` file

This is **CRITICAL** for Firestore to work!

---

### 3. **Frontend Environment Variable**

The `VITE_API_URL` is now set to:
```
https://mess-o-meter-api.onrender.com
```

⚠️ **Replace `mess-o-meter-api` with your actual Render service name** if different.

To find your backend URL:
- Go to Render Dashboard
- Click on **mess-o-meter-api** service
- Copy the URL from the top (e.g., `https://mess-o-meter-api-xyz123.onrender.com`)

---

### 4. **Redeploy on Render**

1. **Commit changes locally:**
   ```bash
   git add .
   git commit -m "Fix: Frontend-Backend connection for Render deployment"
   git push origin main
   ```

2. **Trigger Render redeploy:**
   - Render auto-deploys on push (if connected to GitHub)
   - OR manually redeploy in Render Dashboard

3. **Wait for builds to complete:**
   - First `mess-o-meter-api` (Python backend)
   - Then `mess-o-meter-web` (React frontend)

---

## Troubleshooting Checklist

### Backend not responding?
```bash
# Check backend logs in Render Dashboard
# Look for errors like:
# - "ModuleNotFoundError" → pip install issue
# - "GOOGLE_APPLICATION_CREDENTIALS" → missing service account key
# - "Connection refused" → Firestore credentials issue
```

### Frontend can't reach backend?
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Check API calls:
   - Should call: `https://mess-o-meter-api.onrender.com/analyze`
   - NOT: `http://localhost:8000/analyze`

### CORS errors?
- Check browser console for: `Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy`
- Backend CORS is now set to allow all origins (`*`)
- If still failing, check if request headers are correct

### Firestore errors?
- Verify service account key is uploaded to Render secrets
- Check if key has proper Firestore permissions
- Ensure `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/service-account.json` is set

---

## API Endpoints Available

Frontend calls these endpoints on the backend:

```
POST /analyze
  - Upload image for food waste analysis
  - Returns: waste_level, coverage_percent, food_items_detected, etc.

POST /generate-ai-insights
  - Generate admin-friendly waste insights
  
POST /qr/generate
  - Generate QR code for meals

GET /qr/{mealType}
  - Get existing QR code
```

---

## Quick Test

After deployment, test the connection:

1. Open frontend URL: `https://mess-o-meter-web.onrender.com`
2. Go to upload page (student section)
3. Upload a meal image
4. Check if analysis shows food items
5. Check browser console for any errors

If you see results → ✅ **Connection works!**

---

## Files Modified

- ✅ `render.yaml` - Fixed API URL configuration
- ✅ `mess-o-meter-backend/main.py` - Added CORS for all origins
- ✅ `app/src/config/apiConfig.ts` - Uses `VITE_API_URL` env var (no changes needed)

---

## Important Notes

- **Don't commit** `serviceAccountKey.json` to GitHub
- Use Render's **Secret Files** feature instead
- Production CORS is set to `*` (accepts all origins) - tighten this later for security
- Keep `GEMINI_API_KEY` secret on Render (use sync=false)

Good luck! 🎉

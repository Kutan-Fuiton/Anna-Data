# 🍛 AnnaData

> AI-Powered Mess Management System for Reducing Food Waste in Institutional Kitchens

[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-FF6F00)](https://docs.ultralytics.com/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-Google-4285F4?logo=google)](https://ai.google.dev/)

---

## 📋 Overview

**AnnaData** is a full-stack solution that combines **Computer Vision** and **Generative AI** to tackle food waste in hostel mess facilities. Students can provide meal feedback and upload plate photos, which are analyzed by AI to quantify waste levels and generate actionable insights for administrators.

🔗 **Live Demo:** [anna-data.in](https://anna-data-7854.onrender.com/)
🔗 **Backend:** [Running @](https://anna-data.onrender.com)

---

### 🎬 Video Walkthrough

[![AnnaData Demo](https://img.youtube.com/vi/t8gW-YC3Egk/maxresdefault.jpg)](https://youtu.be/t8gW-YC3Egk?si=Ejs16ebPzwhPzWEr)

> 👆 Click the image above to watch the full demo on YouTube

### Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Waste Detection** | YOLOv8 model trained on 17 Indian food classes detects food items and calculates waste levels |
| ⭐ **Smart Feedback System** | Students rate meals on taste, oil content, quantity, and hygiene |
| 🧠 **Gemini AI Insights** | Natural language summaries and recommendations for mess administrators |
| 📊 **Admin Dashboard** | Real-time analytics, wastage trends, and operational reports |
| 🔒 **Privacy-First** | No student identifiers stored; only aggregated anonymous data |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     STUDENT APP (React)                         │
│   📸 Capture Plate Image    ⭐ Rate Meal (Taste/Oil/Qty/Hygiene)│
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              FOOD WASTE ANALYSIS API (Port 8000)                │
│   YOLOv8 Detection → Waste Level Calculation → Gemini Insights  │
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND API (Port 8001) + FIRESTORE                │
│   Store Feedback → Aggregate Stats → Generate AI Summaries      │
└─────────────────────────────┬───────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN DASHBOARD                            │
│   📊 Wastage Trends    🧠 AI Insights    📋 Operational Reports │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Recharts |
| **Backend** | FastAPI (Python), Uvicorn |
| **AI/ML** | YOLOv8 (Ultralytics), Google Gemini API |
| **Database** | Firebase Firestore |
| **Authentication** | Firebase Auth (planned) |

---

## 📁 Project Structure

```
AnnaData/
├── app/                          # React Frontend
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── pages/
│   │   │   ├── student/          # Student-facing pages
│   │   │   └── admin/            # Admin dashboard pages
│   │   ├── services/             # API service layer
│   │   └── types/                # TypeScript interfaces
│   └── .env                      # Frontend environment variables
│
├── mess-o-meter-backend/         # Backend API (Port 8001)
│   ├── main.py                   # FastAPI endpoints
│   ├── ai.py                     # Gemini AI integration
│   ├── firestore.py              # Database connection
│   └── .env                      # Backend environment variables
│
├── model/                        # ML Model
│   ├── inference.py              # YOLOv8 detection class
│   ├── train.py                  # Model training script
│   └── food_detection_model.pt   # Trained weights
│
├── app.py                        # Food Waste Analysis API (Port 8000)
├── gemini_service.py             # Gemini AI service
└── requirements.txt              # Python dependencies
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Firebase project with Firestore enabled
- Google Gemini API key

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/AnnaData.git
cd AnnaData

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd app
npm install
```

### 2. Configure Environment Variables

**Root `.env`:**
```env
GEMINI_API_KEY=your_gemini_api_key
```

**`app/.env`:**
```env
VITE_FOOD_WASTE_API_URL=http://localhost:8000
VITE_BACKEND_API_URL=http://localhost:8001
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
```

**`mess-o-meter-backend/.env`:**
```env
GEMINI_API_KEY=your_gemini_api_key
```

Also place your Firebase `serviceAccountKey.json` in the `mess-o-meter-backend/` folder.

### 3. Run the Application

```bash
# Terminal 1: Start Food Waste API (Port 8000)
python app.py

# Terminal 2: Start Backend API (Port 8001)
cd mess-o-meter-backend
uvicorn main:app --port 8001

# Terminal 3: Start Frontend (Port 5173)
cd app
npm run dev
```

### 4. Access the App

- **Frontend:** http://localhost:5173
- **Food Waste API:** http://localhost:8000/docs
- **Backend API:** http://localhost:8001/docs

---

## 🎯 API Endpoints

### Food Waste Analysis API (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analyze` | POST | Upload plate image for AI waste analysis |
| `/` | GET | Health check |

### Backend API (Port 8001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/submit-feedback` | POST | Save student meal feedback |
| `/wastage-stats` | GET | Aggregated wastage statistics |
| `/feedback-summary` | GET | Rating averages by meal type |
| `/generate-weekly-summary` | POST | Generate Gemini AI summary |

---

## 🍽️ Waste Level Detection

The YOLOv8 model detects 17 Indian food classes and calculates waste levels:

| Level | Coverage | Description |
|-------|----------|-------------|
| 🟢 NONE | < 10% | Plate is clean |
| 🟡 LOW | 10-30% | Minimal food remaining |
| 🟠 MEDIUM | 30-60% | Moderate food remaining |
| 🔴 HIGH | > 60% | Significant food waste |

### Supported Food Classes

`Aalu Ki Sabji`, `Chana Dal`, `Chhaina`, `Chhole`, `Curry`, `Dahi`, `Dal`, `Fried Rice`, `Gulab Jamun`, `Mix Veg`, `Naan`, `Paneer`, `Plain Rice`, `Poori`, `Raita`, `Roti`, `Sabji`

---

## 📊 Admin Features

- **Dashboard:** Real-time KPIs, meal ratings, feedback trends
- **AI Insights:** Gemini-generated weekly summaries
- **Wastage Trends:** Category-wise waste analysis
- **Operations:** Menu planning, staff management

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgements

- [Ultralytics YOLOv8](https://docs.ultralytics.com/) for object detection
- [Google Gemini](https://ai.google.dev/) for generative AI
- [Firebase](https://firebase.google.com/) for backend services
- [Tailwind CSS](https://tailwindcss.com/) for styling

---

<p align="center">
  Made with ❤️ for reducing food waste in India
</p>



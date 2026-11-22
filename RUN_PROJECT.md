
# AI Audio Authenticity Detection System
## Project Setup and Running Guide

This document explains how to install dependencies, configure
the environment, and run the AI Audio Authenticity Detection
System locally on Windows using VS Code.

---

## 1. Project Overview

The AI Audio Authenticity Detection System is an AI-powered
platform designed to analyze digital media and identify whether
content may be AI-generated or authentic.

The project includes detection modules for:

- Audio Detection
- Image Detection
- Video Detection
- Text Detection

It also includes a frontend dashboard and backend services
for processing uploaded media and returning detection results.

---

## 2. Prerequisites

Install the following software before running the project:

- Python 3.10 or newer
- Node.js (LTS version)
- npm
- Git
- Visual Studio Code

Check installed versions:

```bash
python --version
node --version
npm --version
git --version
```

---

## 3. Open Project in VS Code

1. Open Visual Studio Code.
2. Click File → Open Folder.
3. Select the project root directory.
4. Open Terminal → New Terminal.

Ensure the terminal is opened in the project root directory.

---

## 4. Environment Configuration

Locate the `.env.example` file, if available.

Create your environment configuration file:

```bash
copy .env.example .env
```

Configure the required environment variables.

Never upload actual API keys, passwords, secret keys,
or database credentials to GitHub.

---

## 5. Backend Setup

Open a terminal in the backend directory.

### Windows

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
```

Upgrade pip:

```bash
python -m pip install --upgrade pip
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### Start Backend

If the backend uses FastAPI:

```bash
uvicorn app.main:app --reload
```

If the main application file or module path is different,
use the actual entry point defined in the project.

Backend API documentation, if FastAPI documentation is enabled:

http://127.0.0.1:8000/docs

Backend URL:

http://127.0.0.1:8000

---

## 6. Frontend Setup

Open a new terminal in VS Code.

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm run dev
```

Open the local URL displayed in the terminal.

Usually:

http://localhost:5173

---

## 7. Running the Complete Project

Keep both terminals running.

### Terminal 1 — Backend

```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

### Terminal 2 — Frontend

```powershell
cd frontend
npm run dev
```

Open the frontend URL in your browser.

---

## 8. Troubleshooting

### Python Not Found

```bash
python --version
```

Install Python and ensure it is added to PATH.

### Node/npm Not Found

```bash
node --version
npm --version
```

Install Node.js LTS.

### Missing Python Dependencies

```bash
pip install -r requirements.txt
```

### Missing Frontend Dependencies

```bash
npm install
```

### Port Already in Use

Try another available port or stop the process using
the port currently occupied.

### Backend API Not Connecting

Check:

- Backend is running.
- Frontend API URL is correct.
- Required environment variables are configured.
- Backend and frontend ports are correct.
- No firewall is blocking local requests.

### AI Model Errors

Check that the required AI models are available and that
the configured model paths and dependencies are correct.

---

## 9. Important Notes

- Run commands from the correct project directory.
- Backend and frontend must be running simultaneously.
- Never commit `.env` files containing credentials.
- AI detection results should be interpreted as predictions,
  not absolute proof of authenticity or manipulation.
- Some detection modules may require additional model
  downloads during their first run.

---

## 10. Shutdown

To stop the backend or frontend:

Press:

```text
CTRL + C
```

in the respective terminal.

---

## 11. Quick Start

### Backend

```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

### Frontend

```powershell
cd frontend
npm run dev
```

---

**Project:** AI Audio Authenticity Detection System  
**Purpose:** AI-powered media authenticity analysis  
**Environment:** Local Development


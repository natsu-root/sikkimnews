# SikkimNews Application Setup

This document provides instructions on how to start the backend and frontend servers for the SikkimNews application.

## Prerequisites

- **Python 3.x** installed for the backend.
- **Node.js** installed for the frontend.

---

## 1. Running the Backend (FastAPI)

The backend is built using FastAPI and Python.

1. **Open a terminal** and navigate to the backend directory:
   ```bash
   cd e:\Abi_Drive\SikkimNews\backend
   ```

2. **Activate the virtual environment**:
   - On Windows (Powershell/CMD):
     ```bash
     .\venv\Scripts\activate
     ```

3. **Install dependencies** (if you haven't already or if you've added new ones):
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: If `requirements.txt` doesn't exist, you can just install FastAPI and Uvicorn manually or skip this step if they are already in the venv)*

4. **Run the FastAPI server**:
   ```bash
   uvicorn main:app --reload
   ```
   
   The backend API will now be running at `http://127.0.0.1:8000`. 
   You can view the interactive API documentation at `http://127.0.0.1:8000/docs`.

---

## 2. Running the Frontend (React + Vite)

The frontend is a React application powered by Vite.

1. **Open a new terminal** (keep the backend running in the first one) and navigate to the frontend directory:
   ```bash
   cd e:\Abi_Drive\SikkimNews\frontend
   ```

2. **Install the Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

   The frontend application will start and typically be available at `http://localhost:5173`. 
   Open that URL in your web browser to view the application.

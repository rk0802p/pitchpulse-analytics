# Sports Analytics Dashboard

A full-stack application that provides sports analytics, with a React frontend and a Python/Flask backend.

## Features

- View player stats from different leagues.
- Compare players.
- View league leaders.
- Dynamic theme that changes based on the selected league.
- Light and dark mode support.

## Project Structure

- `frontend/`: Contains the React application.
- `Backend/`: Contains the Python/Flask API.

## Getting Started

### Prerequisites

- Node.js and npm (or yarn)
- Python and pip

### Backend Setup

1. Navigate to the `Backend` directory:
   ```sh
   cd Backend
   ```
2. Create and activate a virtual environment (recommended):
   ```sh
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```
3. Install the dependencies:
   ```sh
   pip install -r requirements.txt
   ```
4. Run the backend server:
   ```sh
   python api.py
   ```
The backend will be running at `http://localhost:5000`.

### Frontend Setup

1. Navigate to the `frontend` directory:
   ```sh
   cd frontend
   ```
2. Install the dependencies:
   ```sh
   npm install
   ```
3. Run the frontend application:
   ```sh
   npm start
   ```
The frontend will be running at `http://localhost:3000`.

## Deployment

The project is configured for deployment on Vercel. The `vercel.json` files in the `frontend` and `Backend` directories are used for this purpose.

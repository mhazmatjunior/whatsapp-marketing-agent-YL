# WhatsApp Marketing Agent (Standalone)

This is a standalone, full-stack application for managing WhatsApp connections and broadcasting marketing messages to groups. It is designed to be decoupled from the main project and deployed independently on a persistent host like Railway or Render.

## Features
- **Standalone UI**: Built with React + Vite.
- **Persistent Connection**: Uses Baileys socket for 24/7 connectivity.
- **Optimized Database**: Batching writes to prevent Neon database throttling.
- **Session Management**: Built-in QR scanner, logout, and force-reset tools.
- **Marketing Tools**: Broadcast images, videos, and multi-line messages to selected groups.

## Deployment to Render (Free Tier)

1.  **Cut the Folder**: Copy the `whatsapp-service` folder into a new, dedicated GitHub repository.
2.  **Render Setup**:
    - Build Command: `npm run build`
    - Start Command: `npm start`
3.  **Environment Variables**:
    - `DATABASE_URL`: Your Neon database connection string.
    - `API_KEY`: A secure key (e.g., `media123`).
    - `VITE_API_KEY`: Same as `API_KEY` (required for build).
    - `PORT`: (Automatically set by Render).

## Local Development

1.  **Install dependencies**:
    ```bash
    npm install
    cd client && npm install
    ```
2.  **Run Dev Mode**:
    - Backend: `npm run dev` (starts on port 3001)
    - Frontend: `cd client && npm run dev` (proxies to 3001)

## Folder Structure
- `/client`: The React frontend code.
- `/db.js`: Database schema and connection.
- `/whatsapp-logic.js`: Auth state & batching logic.
- `/connection.js`: Socket management.
- `/server.js`: API endpoints and static file serving.
- `/wipe-db.js`: Emergency script to clear all sessions.

# 🗺️ Bitcoin Map

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/) [![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/) [![Docker](https://img.shields.io/badge/Docker-Ready-blue)](#-running-with-docker-compose) [![Bitcoin](https://img.shields.io/badge/Bitcoin-Accepted-orange)](https://bitcoin.org/)

A web application that displays Bitcoin-accepting locations on an interactive map, making it easier for users to find and support businesses that accept Bitcoin.

<div align="center">
  
  https://github.com/user-attachments/assets/db6d6971-6577-47c4-b9d8-a9e80b901a93
  
  *Quick demo of Bitcoin Map in action*
</div>

## 🚀 Getting Started

This project consists of a Next.js frontend and Node.js Express backend. You can run the application using Docker Compose or in development mode.

### 🐳 Running with Docker Compose

The easiest way to run the entire application in production mode is using Docker Compose:

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/synonymdev/bitcoin-map.git
cd bitcoin-map

# Build and start the containers
docker-compose up --build -d

# To stop the containers
docker-compose down
```

The application will be available at:

- 🌐 Frontend: http://localhost:3000
- 🔌 Backend API: http://localhost:3001/api

### 💻 Development Mode

If you want to run the application in development mode, follow these steps:

#### 🔙 Backend

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The backend server will run at http://localhost:3001.

#### 🔜 Frontend

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment variables file
cp .env-sample .env

# Start the development server
npm run dev
```

The frontend application will run at http://localhost:3000.

## 📁 Project Structure

- `frontend/`: Next.js frontend application
- `backend/`: Node.js Express backend API
- `docker-compose.yml`: Docker Compose configuration for running the entire application

## 🔌 External APIs

The backend integrates with the following external services:

- **[BTCMap.org](https://btcmap.org/api)**: Provides data on Bitcoin-accepting locations worldwide
- **[Overpass API](https://overpass-api.de/)**: Used to fetch additional geographic and point-of-interest data from OpenStreetMap

These APIs are used to synchronize and maintain our database of Bitcoin-accepting locations.

## ⏱️ Development Progress

### 🎨 Frontend

- [x] Interactive map display using Leaflet
- [x] Marker clustering for improved performance
- [x] Bitcoin location markers on the map
- [x] Responsive design
- [x] Location details popup
- [ ] Name-based search interface
- [ ] Proximity search UI with radius selector
- [ ] Country leaderboard UI
- [ ] Direct links to OpenStreetMap for adding/editing locations
- [ ] Documentation page
- [ ] About page

### ⚙️ Backend

- [x] RESTful API for Bitcoin locations
- [x] SQLite database integration
- [x] Data synchronization system
- [x] CORS configuration for frontend access
- [x] Basic error handling
- [ ] Name-based search API endpoint
- [ ] Proximity search implementation using latitude and longitude
- [ ] Country ranking data aggregation
- [ ] API rate limiting implementation
- [ ] API documentation

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the [MIT LICENSE](LICENSE).

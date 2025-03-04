# 🎨 Bitcoin Map Frontend

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/) [![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC)](https://tailwindcss.com/)

Frontend application for Bitcoin Map that displays an interactive map of Bitcoin-accepting locations.

## 🚀 Getting Started

### 💻 Development Mode

```bash
# Install dependencies
npm install

# Copy environment variables file
cp .env-sample .env

# Start the development server
npm run dev
```

The development server will run at http://localhost:3000 with hot-reloading enabled.

### 🏭 Production Mode

```bash
# Install dependencies
npm install

# Copy environment variables file
cp .env-sample .env

# Build the application
npm run build

# Start the production server
npm run start
```

The production server will run at http://localhost:3000.

## 🧩 Environment Variables

The application requires environment variables for configuration. Copy the sample file and adjust as needed:

```bash
cp .env-sample .env
```

Key variables:

- `NEXT_PUBLIC_API_URL`: The URL of the backend API

## 🛠️ Technologies Used

- **Next.js**: React framework for server-rendered applications
- **React**: JavaScript library for building user interfaces
- **Leaflet**: Interactive map library
- **React-Leaflet**: React components for Leaflet maps
- **Tailwind CSS**: Utility-first CSS framework

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request for bug fixes, new features, or improvements.

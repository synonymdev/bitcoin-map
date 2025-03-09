# ⚙️ Bitcoin Map Backend

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/) [![Express](https://img.shields.io/badge/Express-4.x-lightgrey)](https://expressjs.com/) [![SQLite](https://img.shields.io/badge/SQLite-3-blue)](https://www.sqlite.org/) [![Jest](https://img.shields.io/badge/Jest-29.x-red)](https://jestjs.io/)

Backend service for the Bitcoin Map application that provides APIs for Bitcoin-accepting locations.

## 🚀 Getting Started

### 💻 Development Mode

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The development server will run at http://localhost:3001 with auto-reload enabled.

### 🏭 Production Mode

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start the production server
npm run start
```

The production server will run at http://localhost:3001.

## 🧪 Testing

The application includes a comprehensive test suite built with Jest:

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

The test coverage report will be generated in the `coverage/` directory.

For more details about the testing approach and structure, see the [tests README](./src/__tests__/README.md).

## 🔌 API Routes

| Method | Route            | Description                                                                                            |
| ------ | ---------------- | ------------------------------------------------------------------------------------------------------ |
| GET    | `/health`        | Health check endpoint                                                                                  |
| GET    | `/api/locations` | Get all Bitcoin-accepting locations                                                                    |
| GET    | `/api/stats`     | Get statistics about Bitcoin locations including total count, location types, and country distribution |

## 🔄 External API Integration

The backend integrates with the following external services:

- **[BTCMap.org](https://btcmap.org/api)**:

  - Used to fetch Bitcoin-accepting locations worldwide
  - Synchronized hourly using a cron job
  - Provides essential location data, including coordinates and business details

- **[Overpass API](https://overpass-api.de/)**:
  - Used to fetch Bitcoin-accepting locations from OpenStreetMap
  - Synchronized hourly along with BTCMap data
  - Provides additional geographic and point-of-interest data

## 🛠️ Technologies Used

- **Express.js**: Web server framework
- **SQLite**: Database for storing location data
- **Node Cron**: For scheduling hourly data synchronization
- **Axios**: For HTTP requests to external APIs
- **TypeScript**: For type-safe code
- **Jest**: For testing
- **ts-jest**: For TypeScript support in Jest

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request for bug fixes, new features, or improvements.

When contributing, please ensure:
1. All tests pass (`npm test`)
2. New features include appropriate tests
3. Code follows the existing style and conventions

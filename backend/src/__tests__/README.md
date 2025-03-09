# Backend Tests

This directory contains automated tests for the Bitcoin Map backend application.

## Structure

```
__tests__/
├── services/
│   ├── database.test.ts  # Tests for the database service
│   ├── overpass.test.ts  # Tests for the Overpass service
│   └── btcmap.test.ts    # Tests for the BTCMap service
├── index.test.ts         # Tests for the main application file
├── setup.ts              # Global configuration for tests
└── README.md             # This file
```

## Running Tests

To run all tests:

```bash
npm test
```

To run tests in watch mode (useful during development):

```bash
npm run test:watch
```

To generate a code coverage report:

```bash
npm run test:coverage
```

The coverage report will be generated in the `coverage/` directory.

## Testing Approach

The tests were implemented following these approaches:

1. **Unit Tests**: Test individual components in isolation, using mocks for external dependencies.
2. **Mocks**: We use mocks to simulate behaviors of external APIs and the database.
3. **Code Coverage**: We aim for good code coverage, especially for critical business logic.

## Mocks

- **sqlite3**: Mocked to avoid real database operations during tests.
- **axios**: Mocked to avoid real calls to the Overpass API.
- **fetch**: Mocked to avoid real calls to the BTCMap API.
- **express**: Mocked to test routes without starting a real server.
- **node-cron**: Mocked to avoid running scheduled tasks during tests.

## Adding New Tests

When adding new tests:

1. Follow the naming pattern: `[file-name].test.ts`
2. Place tests in the appropriate folder (e.g., services in `services/`)
3. Use mocks to isolate the component being tested
4. Check code coverage to ensure all important paths are being tested 
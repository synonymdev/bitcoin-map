// Global configuration for tests

// Global environment configuration for tests
(global as any).console = {
  ...console,
  // Silence logs during tests
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Global fetch configuration for tests
if (!global.fetch) {
  global.fetch = jest.fn() as jest.Mock;
}

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Add a dummy test to avoid empty test suite error
describe('Setup', () => {
  it('should set up test environment', () => {
    expect(true).toBe(true);
  });
}); 
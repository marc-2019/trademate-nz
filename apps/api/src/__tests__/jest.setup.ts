/**
 * Jest Test Setup
 * Global setup for all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '29001';
process.env.DATABASE_URL = 'postgresql://trademate:trademate_dev_2026@localhost:29432/trademate_test';
process.env.REDIS_URL = 'redis://localhost:29379';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret';

// Increase timeout for async tests
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Allow pending operations to complete
  await new Promise((resolve) => setTimeout(resolve, 500));
});

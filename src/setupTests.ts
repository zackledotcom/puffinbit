// Jest setup file
// Add any global test setup here

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  // Uncomment to ignore console outputs in tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}

// Mock electron modules that aren't available in test environment
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path'),
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  BrowserWindow: jest.fn(),
}))

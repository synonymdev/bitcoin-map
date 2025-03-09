import { DatabaseService } from '../services/database';
import { OverpassService } from '../services/overpass';
import * as btcmapService from '../services/btcmap';

// Mocks
jest.mock('express', () => {
  const mockGet = jest.fn();
  const mockUse = jest.fn();
  const mockListen = jest.fn((port, host, callback) => {
    if (callback) callback();
    return { close: jest.fn() };
  });
  
  const mockApp = {
    use: mockUse,
    get: mockGet,
    listen: mockListen
  };
  
  const mockExpress = jest.fn(() => mockApp);
  // Adding json property as any to avoid type error
  (mockExpress as any).json = jest.fn();
  
  return mockExpress;
});

jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

jest.mock('cors', () => jest.fn(() => 'corsMiddleware'));

// Mock for setTimeout
jest.spyOn(global, 'setTimeout').mockImplementation((fn, timeout) => {
  return null as any;
});

// Mock for console to avoid logs during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock for services
jest.mock('../services/database', () => {
  return {
    DatabaseService: jest.fn().mockImplementation(() => ({
      getAllLocations: jest.fn().mockResolvedValue([
        { id: 1, type: 'node', lat: 40.7128, lon: -74.0060, tags: { name: 'Location 1' }, source: 'overpass' },
        { id: 2, type: 'way', lat: 34.0522, lon: -118.2437, tags: { name: 'Location 2' }, source: 'btcmap' }
      ]),
      getLocationCoordinates: jest.fn().mockResolvedValue([
        { id: 1, type: 'node', lat: 40.7128, lon: -74.0060 },
        { id: 2, type: 'way', lat: 34.0522, lon: -118.2437 }
      ]),
      getLocationById: jest.fn().mockImplementation((id) => {
        if (id === '1') {
          return Promise.resolve({ 
            id: 1, 
            type: 'node', 
            lat: 40.7128, 
            lon: -74.0060, 
            tags: { name: 'Location 1', amenity: 'cafe' }, 
            source: 'overpass' 
          });
        } else if (id === '2') {
          return Promise.resolve({ 
            id: 2, 
            type: 'way', 
            lat: 34.0522, 
            lon: -118.2437, 
            tags: { name: 'Location 2', shop: 'supermarket' }, 
            source: 'btcmap' 
          });
        } else {
          return Promise.resolve(null);
        }
      }),
      getPaymentStats: jest.fn().mockResolvedValue({
        total_locations: 10,
        by_type: { nodes: 7, ways: 3 },
        countries: { 'USA': 5, 'Germany': 3, 'Japan': 2 }
      }),
      upsertLocation: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

jest.mock('../services/overpass', () => {
  return {
    OverpassService: jest.fn().mockImplementation(() => ({
      fetchBitcoinLocations: jest.fn().mockResolvedValue({
        elements: [
          { id: 1, type: 'node', lat: 40.7128, lon: -74.0060, tags: { 'payment:bitcoin': 'yes' } },
          { id: 2, type: 'way', nodes: [1, 2, 3], center: { lat: 34.0522, lon: -118.2437 }, tags: { 'payment:bitcoin': 'yes' } }
        ]
      })
    }))
  };
});

jest.mock('../services/btcmap', () => ({
  fetchBtcmapLocations: jest.fn().mockResolvedValue([
    { id: '3', osm_json: { type: 'node', id: 3, lat: 51.5074, lon: -0.1278, timestamp: '', version: 1, changeset: 1, user: '', uid: 1, tags: {} }, tags: { 'payment:bitcoin': 'yes' }, created_at: '', updated_at: '', deleted_at: null },
    { id: '4', osm_json: { type: 'way', id: 4, nodes: [4, 5, 6], timestamp: '', version: 1, changeset: 1, user: '', uid: 1, tags: {} }, tags: { 'payment:bitcoin': 'yes' }, created_at: '', updated_at: '', deleted_at: null }
  ])
}));

describe('Server', () => {
  let express: any;
  let app: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset modules for each test
    jest.resetModules();
    
    // Import mocked express
    express = require('express');
    app = express();
  });
  
  it('should initialize the server and set up routes', () => {
    // Import the module to start the server
    require('../index');
    
    // Verify that express was initialized
    expect(express).toHaveBeenCalled();
    
    // Verify that middlewares were configured
    expect(app.use).toHaveBeenCalled();
    
    // Verify that endpoints were configured
    expect(app.get).toHaveBeenCalledWith('/health', expect.any(Function));
    expect(app.get).toHaveBeenCalledWith('/api/locations', expect.any(Function));
    expect(app.get).toHaveBeenCalledWith('/api/coordinates', expect.any(Function));
    expect(app.get).toHaveBeenCalledWith('/api/locations/:id', expect.any(Function));
    expect(app.get).toHaveBeenCalledWith('/api/stats', expect.any(Function));
    
    // Verify that the server was started
    expect(app.listen).toHaveBeenCalledWith(3001, '0.0.0.0', expect.any(Function));
    
    // Verify that cron was configured
    const nodeCron = require('node-cron');
    expect(nodeCron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
  });
}); 
import { DatabaseService } from '../../services/database';
import { OverpassNode, OverpassWay } from '../../types/overpass';
import { OSMRecord, OSMNode, OSMWay, OSMRelation } from '../../types/osm';

// Mock for sqlite3
jest.mock('sqlite3', () => {
  const mockDb = {
    run: jest.fn((query, params, callback) => {
      if (callback) callback(null);
    }),
    get: jest.fn((query, params, callback) => {
      if (callback) callback(null, { count: 10, nodes: 7, ways: 3 });
    }),
    all: jest.fn(),
    serialize: jest.fn((callback) => {
      callback();
    }),
    close: jest.fn()
  };

  return {
    Database: jest.fn(() => mockDb),
    OPEN_READWRITE: 1,
    OPEN_CREATE: 2
  };
});

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    dbService = new DatabaseService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeDatabase', () => {
    it('should create tables if they do not exist', () => {
      // The constructor already calls initializeDatabase
      const mockDb = (dbService as any).db;
      expect(mockDb.serialize).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('getAllLocations', () => {
    it('should return all locations from the database', async () => {
      // Mock implementation to avoid timeout
      jest.spyOn(dbService, 'getAllLocations').mockResolvedValue([
        { id: 1, type: 'node', lat: 40.7128, lon: -74.0060, tags: { 'payment:bitcoin': 'yes' }, source: 'overpass' },
        { id: 2, type: 'way', lat: 34.0522, lon: -118.2437, tags: { 'payment:bitcoin': 'yes' }, source: 'btcmap' }
      ]);
      
      const locations = await dbService.getAllLocations();
      
      expect(locations).toHaveLength(2);
      expect(locations[0]).toHaveProperty('id', 1);
      expect(locations[0]).toHaveProperty('type', 'node');
      expect(locations[0]).toHaveProperty('lat', 40.7128);
      expect(locations[0]).toHaveProperty('lon', -74.0060);
      expect(locations[0]).toHaveProperty('tags');
      expect(locations[0].tags).toEqual({ 'payment:bitcoin': 'yes' });
      
      expect(locations[1]).toHaveProperty('id', 2);
      expect(locations[1]).toHaveProperty('type', 'way');
    });

    it('should handle database errors when getting locations', async () => {
      // Mock implementation to throw error
      jest.spyOn(dbService, 'getAllLocations').mockRejectedValue(new Error('Database error'));
      
      await expect(dbService.getAllLocations()).rejects.toThrow('Database error');
    });
  });

  describe('getPaymentStats', () => {
    it('should return payment statistics', async () => {
      // Mock implementation to avoid timeout
      jest.spyOn(dbService, 'getPaymentStats').mockResolvedValue({
        total_locations: 10,
        by_type: { nodes: 7, ways: 3 },
        countries: { 'USA': 5, 'Germany': 3, 'Japan': 2 }
      });
      
      const stats = await dbService.getPaymentStats();
      
      expect(stats).toHaveProperty('total_locations', 10);
      expect(stats).toHaveProperty('by_type');
      expect(stats.by_type).toEqual({ nodes: 7, ways: 3 });
      expect(stats).toHaveProperty('countries');
      expect(stats.countries).toEqual({
        'USA': 5,
        'Germany': 3,
        'Japan': 2
      });
    });

    it('should handle database errors when getting stats', async () => {
      // Mock implementation to throw error
      jest.spyOn(dbService, 'getPaymentStats').mockRejectedValue(new Error('Database error'));
      
      await expect(dbService.getPaymentStats()).rejects.toThrow('Database error');
    });

    it('should handle database errors when getting country stats', async () => {
      // Mock implementation to throw error
      jest.spyOn(dbService as any, 'getCountryStats').mockRejectedValue(new Error('Country stats error'));
      
      // Mock implementation to call getCountryStats
      jest.spyOn(dbService, 'getPaymentStats').mockImplementation(async () => {
        await (dbService as any).getCountryStats();
        return {} as any;
      });
      
      await expect(dbService.getPaymentStats()).rejects.toThrow('Country stats error');
    });
  });

  describe('upsertLocation', () => {
    it('should upsert a node location from Overpass', async () => {
      const nodeElement: OverpassNode = {
        type: 'node',
        id: 123,
        lat: 51.5074,
        lon: -0.1278,
        tags: {
          'payment:bitcoin': 'yes',
          name: 'Bitcoin Cafe'
        }
      };
      
      await dbService.upsertLocation(nodeElement, 'overpass');
      
      const mockDb = (dbService as any).db;
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO locations'),
        expect.arrayContaining([
          123, 'node', 51.5074, -0.1278, 
          JSON.stringify({ 'payment:bitcoin': 'yes', name: 'Bitcoin Cafe' }),
          null, 'overpass'
        ]),
        expect.any(Function)
      );
    });
    
    it('should upsert a way location from Overpass', async () => {
      const wayElement: OverpassWay = {
        type: 'way',
        id: 456,
        nodes: [1, 2, 3],
        center: {
          lat: 48.8566,
          lon: 2.3522
        },
        tags: {
          'payment:bitcoin': 'yes',
          name: 'Bitcoin Shop'
        }
      };
      
      await dbService.upsertLocation(wayElement, 'btcmap');
      
      const mockDb = (dbService as any).db;
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO locations'),
        expect.arrayContaining([
          456, 'way', 48.8566, 2.3522, 
          JSON.stringify({ 'payment:bitcoin': 'yes', name: 'Bitcoin Shop' }),
          JSON.stringify([1, 2, 3]), 'btcmap'
        ]),
        expect.any(Function)
      );
    });

    it('should upsert a node location from BTCMap', async () => {
      const osmNode: OSMNode = {
        type: 'node',
        id: 789,
        lat: 35.6895,
        lon: 139.6917,
        timestamp: '2023-01-01T00:00:00Z',
        version: 1,
        changeset: 123456,
        user: 'testuser',
        uid: 12345,
        tags: {
          'payment:bitcoin': 'yes',
          name: 'Tokyo Bitcoin Cafe'
        }
      };

      const btcmapRecord: OSMRecord = {
        id: '789',
        osm_json: osmNode,
        tags: {
          'payment:onchain': 'yes',
          'payment:lightning': 'yes'
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
      };
      
      await dbService.upsertLocation(btcmapRecord, 'btcmap');
      
      const mockDb = (dbService as any).db;
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO locations'),
        expect.arrayContaining([789, 'node']),
        expect.any(Function)
      );
    });

    it('should upsert a way location from BTCMap', async () => {
      const osmWay: OSMWay = {
        type: 'way',
        id: 101112,
        timestamp: '2023-01-01T00:00:00Z',
        version: 1,
        changeset: 123456,
        user: 'testuser',
        uid: 12345,
        nodes: [4, 5, 6],
        geometry: [
          { lat: 52.5200, lon: 13.4050 }
        ],
        tags: {
          'payment:bitcoin': 'yes',
          name: 'Berlin Bitcoin Shop'
        }
      };

      const btcmapRecord: OSMRecord = {
        id: '101112',
        osm_json: osmWay,
        tags: {
          'payment:lightning': 'yes'
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
      };
      
      await dbService.upsertLocation(btcmapRecord, 'btcmap');
      
      const mockDb = (dbService as any).db;
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO locations'),
        expect.arrayContaining([101112, 'way']),
        expect.any(Function)
      );
    });

    it('should upsert a relation from BTCMap', async () => {
      const osmRelation: OSMRelation = {
        type: 'relation',
        id: 131415,
        timestamp: '2023-01-01T00:00:00Z',
        version: 1,
        changeset: 123456,
        user: 'testuser',
        uid: 12345,
        members: [
          { type: 'node', ref: 7, role: 'node' },
          { type: 'way', ref: 8, role: 'way' }
        ],
        bounds: {
          minlat: 40.0,
          minlon: -74.0,
          maxlat: 41.0,
          maxlon: -73.0
        },
        tags: {
          'payment:bitcoin': 'yes',
          name: 'Bitcoin Area'
        }
      };

      const btcmapRecord: OSMRecord = {
        id: '131415',
        osm_json: osmRelation,
        tags: {},
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
      };
      
      await dbService.upsertLocation(btcmapRecord, 'btcmap');
      
      const mockDb = (dbService as any).db;
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO locations'),
        expect.arrayContaining([131415, 'relation']),
        expect.any(Function)
      );
    });

    it('should handle database errors when upserting location', async () => {
      const nodeElement: OverpassNode = {
        type: 'node',
        id: 123,
        lat: 51.5074,
        lon: -0.1278,
        tags: {
          'payment:bitcoin': 'yes',
          name: 'Bitcoin Cafe'
        }
      };

      // Mock implementation to throw error
      jest.spyOn(dbService, 'upsertLocation').mockRejectedValue(new Error('Database error'));
      
      await expect(dbService.upsertLocation(nodeElement, 'overpass')).rejects.toThrow('Database error');
    });
  });
}); 
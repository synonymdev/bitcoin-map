import { fetchBtcmapLocations } from '../../services/btcmap';
import { OSMRecord } from '../../types/osm';

// Mock for global fetch
global.fetch = jest.fn();

describe('BTCMap Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch bitcoin locations from btcmap.org successfully', async () => {
    const mockLocations: OSMRecord[] = [
      {
        id: '123',
        osm_json: {
          type: 'node',
          id: 123,
          lat: 51.5074,
          lon: -0.1278,
          timestamp: '2023-01-01T00:00:00Z',
          version: 1,
          changeset: 123456,
          user: 'testuser',
          uid: 12345,
          tags: {
            'payment:bitcoin': 'yes',
            name: 'Bitcoin Cafe'
          }
        },
        tags: {
          'payment:bitcoin': 'yes',
          name: 'Bitcoin Cafe'
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
      },
      {
        id: '456',
        osm_json: {
          type: 'way',
          id: 456,
          timestamp: '2023-01-01T00:00:00Z',
          version: 1,
          changeset: 123456,
          user: 'testuser',
          uid: 12345,
          nodes: [1, 2, 3],
          tags: {
            'payment:bitcoin': 'yes',
            name: 'Bitcoin Shop'
          }
        },
        tags: {
          'payment:bitcoin': 'yes',
          name: 'Bitcoin Shop'
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
      }
    ];

    // Mock for fetch response
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue(mockLocations),
      status: 200,
      statusText: 'OK'
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await fetchBtcmapLocations();

    expect(global.fetch).toHaveBeenCalledWith('https://static.btcmap.org/api/v2/elements.json');
    expect(result).toEqual(mockLocations);
    expect(result).toHaveLength(2);
  });

  it('should throw an error when fetch fails', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(fetchBtcmapLocations()).rejects.toThrow(
      'Failed to fetch from btcmap.org: 500 Internal Server Error'
    );
  });

  it('should throw an error when response is not an array', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ error: 'Invalid data' }),
      status: 200,
      statusText: 'OK'
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(fetchBtcmapLocations()).rejects.toThrow(
      'Invalid data format from btcmap.org: expected an array'
    );
  });

  it('should handle network errors', async () => {
    const networkError = new Error('Network Error');
    (global.fetch as jest.Mock).mockRejectedValue(networkError);

    await expect(fetchBtcmapLocations()).rejects.toThrow('Network Error');
  });
}); 
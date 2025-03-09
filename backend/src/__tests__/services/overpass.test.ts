import { OverpassService } from '../../services/overpass';
import axios from 'axios';
import { OverpassResponse } from '../../types/overpass';

// Mock for axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OverpassService', () => {
  let overpassService: OverpassService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    overpassService = new OverpassService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildQuery', () => {
    it('should build a query with default parameters', () => {
      const query = (overpassService as any).buildQuery();
      
      expect(query).toContain('[out:json][timeout:180][maxsize:1073741824];');
      expect(query).toContain('node["payment:bitcoin"="yes"];');
      expect(query).toContain('way["payment:bitcoin"="yes"];');
      expect(query).toContain('relation["payment:bitcoin"="yes"];');
      expect(query).toContain('out center;');
    });

    it('should build a query with custom timeout and maxsize', () => {
      const query = (overpassService as any).buildQuery({
        timeout: 300,
        maxsize: 2147483648
      });
      
      expect(query).toContain('[out:json][timeout:300][maxsize:2147483648];');
    });

    it('should build a query with bounding box', () => {
      const query = (overpassService as any).buildQuery({
        boundingBox: {
          south: 40.7,
          west: -74.1,
          north: 40.8,
          east: -74.0
        }
      });
      
      // Check only if it contains the essential parts
      expect(query).toContain('node["payment:bitcoin"="yes"](');
      expect(query).toContain('40.7,-74.1,40.8,-74');
      expect(query).toContain('way["payment:bitcoin"="yes"](');
      expect(query).toContain('relation["payment:bitcoin"="yes"](');
    });
  });

  describe('fetchBitcoinLocations', () => {
    it('should fetch bitcoin locations successfully', async () => {
      const mockResponse: OverpassResponse = {
        version: 0.6,
        generator: 'Overpass API',
        osm3s: {
          timestamp_osm_base: '2023-01-01T00:00:00Z',
          copyright: 'OpenStreetMap contributors'
        },
        elements: [
          {
            type: 'node',
            id: 123,
            lat: 51.5074,
            lon: -0.1278,
            tags: {
              'payment:bitcoin': 'yes',
              name: 'Bitcoin Cafe'
            }
          },
          {
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
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await overpassService.fetchBitcoinLocations();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://overpass-api.de/api/interpreter',
        expect.objectContaining({
          params: expect.objectContaining({
            data: expect.any(String)
          })
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.elements).toHaveLength(2);
    });

    it('should handle axios error', async () => {
      const axiosError = new Error('Network Error');
      (axiosError as any).isAxiosError = true;
      (axiosError as any).response = {
        status: 500,
        data: 'Internal Server Error'
      };
      (axiosError as any).config = {
        params: {
          data: 'test query'
        }
      };

      mockedAxios.get.mockRejectedValueOnce(axiosError);
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(overpassService.fetchBitcoinLocations()).rejects.toThrow(
        'Failed to fetch bitcoin locations: Network Error'
      );
    });

    it('should handle non-axios error', async () => {
      const error = new Error('Unknown error');
      mockedAxios.get.mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValueOnce(false);

      await expect(overpassService.fetchBitcoinLocations()).rejects.toThrow(
        'Failed to fetch bitcoin locations'
      );
    });
  });
}); 
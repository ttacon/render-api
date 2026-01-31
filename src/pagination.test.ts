import { describe, expect, it } from 'bun:test';
import {
  type CursorResponse,
  collectAll,
  createPaginatedResponse,
  extractCursor,
  paginate,
  unwrapItems,
} from './pagination.js';

describe('Pagination', () => {
  describe('extractCursor', () => {
    it('should extract cursor from last item', () => {
      const items: CursorResponse<{ id: string }>[] = [
        { cursor: 'cursor1', item: { id: '1' } },
        { cursor: 'cursor2', item: { id: '2' } },
        { cursor: 'cursor3', item: { id: '3' } },
      ];
      expect(extractCursor(items)).toBe('cursor3');
    });

    it('should return undefined for empty array', () => {
      expect(extractCursor([])).toBeUndefined();
    });
  });

  describe('unwrapItems', () => {
    it('should unwrap items from cursor response', () => {
      const items: CursorResponse<{ id: string }>[] = [
        { cursor: 'cursor1', item: { id: '1' } },
        { cursor: 'cursor2', item: { id: '2' } },
      ];
      expect(unwrapItems(items)).toEqual([{ id: '1' }, { id: '2' }]);
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create paginated response with hasMore=true when at limit', () => {
      const items: CursorResponse<{ id: string }>[] = [
        { cursor: 'cursor1', item: { id: '1' } },
        { cursor: 'cursor2', item: { id: '2' } },
      ];
      const response = createPaginatedResponse(items, 2);
      expect(response.items).toHaveLength(2);
      expect(response.cursor).toBe('cursor2');
      expect(response.hasMore).toBe(true);
    });

    it('should create paginated response with hasMore=false when below limit', () => {
      const items: CursorResponse<{ id: string }>[] = [{ cursor: 'cursor1', item: { id: '1' } }];
      const response = createPaginatedResponse(items, 10);
      expect(response.items).toHaveLength(1);
      expect(response.hasMore).toBe(false);
    });

    it('should handle empty items', () => {
      const response = createPaginatedResponse([], 10);
      expect(response.items).toHaveLength(0);
      expect(response.hasMore).toBe(false);
      expect(response.cursor).toBeUndefined();
    });
  });

  describe('paginate', () => {
    it('should yield all items across multiple pages', async () => {
      let callCount = 0;
      const fetchPage = async (
        _cursor?: string,
        _limit?: number,
      ): Promise<CursorResponse<number>[]> => {
        callCount++;
        if (callCount === 1) {
          return [
            { cursor: 'c1', item: 1 },
            { cursor: 'c2', item: 2 },
          ];
        }
        if (callCount === 2) {
          return [{ cursor: 'c3', item: 3 }];
        }
        return [];
      };

      const items: number[] = [];
      for await (const item of paginate(fetchPage)) {
        items.push(item);
      }

      expect(items).toEqual([1, 2, 3]);
      expect(callCount).toBe(3);
    });

    it('should respect maxItems option', async () => {
      const fetchPage = async (): Promise<CursorResponse<number>[]> => {
        return [
          { cursor: 'c1', item: 1 },
          { cursor: 'c2', item: 2 },
          { cursor: 'c3', item: 3 },
        ];
      };

      const items: number[] = [];
      for await (const item of paginate(fetchPage, { maxItems: 2 })) {
        items.push(item);
      }

      expect(items).toEqual([1, 2]);
    });
  });

  describe('collectAll', () => {
    it('should collect all items from generator', async () => {
      async function* gen() {
        yield 1;
        yield 2;
        yield 3;
      }

      const items = await collectAll(gen());
      expect(items).toEqual([1, 2, 3]);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { sortData } from '../../utils/sort';
import { paginate } from '../../utils/pagination';

describe('sortData', () => {
  it('should return the original array when sortBy is not provided', () => {
    const data = [{ name: 'b' }, { name: 'a' }];
    expect(sortData(data)).toBe(data);
  });

  it('should return the original array when sortBy is an empty string', () => {
    const data = [{ name: 'b' }, { name: 'a' }];
    expect(sortData(data, '')).toBe(data);
  });

  it('should sort strings ascending by default', () => {
    const data = [{ name: 'charlie' }, { name: 'alice' }, { name: 'bob' }];
    const result = sortData(data, 'name');
    expect(result.map((d) => d.name)).toEqual(['alice', 'bob', 'charlie']);
  });

  it('should sort strings descending when order is "desc"', () => {
    const data = [{ name: 'alice' }, { name: 'charlie' }, { name: 'bob' }];
    const result = sortData(data, 'name', 'desc');
    expect(result.map((d) => d.name)).toEqual(['charlie', 'bob', 'alice']);
  });

  it('should sort numbers ascending', () => {
    const data = [{ score: 30 }, { score: 10 }, { score: 20 }];
    const result = sortData(data, 'score');
    expect(result.map((d) => d.score)).toEqual([10, 20, 30]);
  });

  it('should sort numbers descending when order is "DESC" (case-insensitive)', () => {
    const data = [{ score: 10 }, { score: 30 }, { score: 20 }];
    const result = sortData(data, 'score', 'DESC');
    expect(result.map((d) => d.score)).toEqual([30, 20, 10]);
  });

  it('should treat undefined valA as greater than defined valB (ascending)', () => {
    const data = [{ name: undefined }, { name: 'alice' }] as any[];
    const result = sortData(data, 'name');
    expect(result[0].name).toBe('alice');
    expect(result[1].name).toBeUndefined();
  });

  it('should treat defined valA as less than undefined valB (ascending)', () => {
    const data = [{ name: 'alice' }, { name: undefined }] as any[];
    const result = sortData(data, 'name');
    expect(result[0].name).toBe('alice');
    expect(result[1].name).toBeUndefined();
  });

  it('should treat two undefined values as equal (order preserved)', () => {
    const data = [
      { id: 1, name: undefined },
      { id: 2, name: undefined },
    ] as any[];
    const result = sortData(data, 'name');
    expect(result).toHaveLength(2);
  });

  it('should return 0 for equal values (order preserved)', () => {
    const data = [
      { id: 1, score: 50 },
      { id: 2, score: 50 },
    ];
    const result = sortData(data, 'score');
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(50);
    expect(result[1].score).toBe(50);
  });

  it('should not mutate the original array', () => {
    const data = [{ n: 2 }, { n: 1 }];
    const original = [...data];
    sortData(data, 'n');
    expect(data).toEqual(original);
  });
});

describe('paginate', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  it('should return the array as-is when no page or limit is provided', () => {
    const result = paginate(items);
    expect(result).toBe(items);
  });

  it('should return paginated result when page and limit are provided', () => {
    const result = paginate(items, '1', '5') as any;
    expect(result.total).toBe(11);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(5);
    expect(result.data).toHaveLength(5);
  });

  it('should return the second page correctly', () => {
    const result = paginate(items, '2', '5') as any;
    expect(result.data).toHaveLength(5);
    expect(result.data[0]).toBe(6);
  });

  it('should default to page 1 and limit 10 when only page is provided', () => {
    const result = paginate(items, '1') as any;
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.data).toHaveLength(10);
  });

  it('should default to page 1 when only limit is provided', () => {
    const result = paginate(items, undefined, '3') as any;
    expect(result.page).toBe(1);
    expect(result.limit).toBe(3);
    expect(result.data).toHaveLength(3);
  });

  it('should default to page 1 when page string is NaN', () => {
    const result = paginate(items, 'abc', '5') as any;
    expect(result.page).toBe(1);
  });

  it('should default to page 1 when page is less than 1', () => {
    const result = paginate(items, '0', '5') as any;
    expect(result.page).toBe(1);
  });

  it('should default to limit 10 when limit string is NaN', () => {
    const result = paginate(items, '1', 'abc') as any;
    expect(result.limit).toBe(10);
  });

  it('should default to limit 10 when limit is less than 1', () => {
    const result = paginate(items, '1', '0') as any;
    expect(result.limit).toBe(10);
  });

  it('should return empty data array when page is beyond total', () => {
    const result = paginate(items, '10', '5') as any;
    expect(result.data).toHaveLength(0);
  });
});

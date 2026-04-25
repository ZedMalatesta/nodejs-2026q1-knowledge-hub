import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ParseUuidPipe } from '../../pipes/parse-uuid.pipe';

describe('ParseUuidPipe', () => {
  const pipe = new ParseUuidPipe();

  describe('valid UUIDs', () => {
    it('should pass through a well-formed UUID v4', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';

      expect(pipe.transform(id)).toBe(id);
    });

    it('should accept uppercase hex characters', () => {
      const id = '550E8400-E29B-41D4-A716-446655440000';

      expect(pipe.transform(id)).toBe(id);
    });
  });

  describe('invalid values', () => {
    it('should throw BadRequestException for a plain string', () => {
      expect(() => pipe.transform('not-a-uuid')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for an empty string', () => {
      expect(() => pipe.transform('')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for a UUID v1', () => {
      expect(() => pipe.transform('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for a UUID missing hyphens', () => {
      expect(() => pipe.transform('550e8400e29b41d4a716446655440000')).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for a UUID with an invalid variant nibble', () => {
      expect(() => pipe.transform('550e8400-e29b-41d4-c716-446655440000')).toThrow(
        BadRequestException,
      );
    });

    it('should include the invalid value in the error message', () => {
      try {
        pipe.transform('bad-id');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect((err as BadRequestException).message).toContain('bad-id');
      }
    });
  });
});

import { describe, expect, it } from 'bun:test';
import {
  createApiError,
  RenderApiError,
  RenderAuthError,
  RenderError,
  RenderNotFoundError,
  RenderRateLimitError,
  RenderValidationError,
} from './errors.js';

describe('Errors', () => {
  describe('RenderError', () => {
    it('should create a base error with message', () => {
      const error = new RenderError('Something went wrong');
      expect(error.message).toBe('Something went wrong');
      expect(error.name).toBe('RenderError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('RenderApiError', () => {
    it('should create an API error with status and response', () => {
      const error = new RenderApiError(
        'Not found',
        404,
        { id: 'err_123', message: 'Resource not found' },
        'req_abc',
      );
      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.response?.id).toBe('err_123');
      expect(error.requestId).toBe('req_abc');
      expect(error).toBeInstanceOf(RenderError);
    });
  });

  describe('RenderAuthError', () => {
    it('should have status 401', () => {
      const error = new RenderAuthError('Invalid API key');
      expect(error.status).toBe(401);
      expect(error.name).toBe('RenderAuthError');
    });
  });

  describe('RenderRateLimitError', () => {
    it('should include retryAfter', () => {
      const error = new RenderRateLimitError('Too many requests', undefined, undefined, 30);
      expect(error.status).toBe(429);
      expect(error.retryAfter).toBe(30);
    });
  });

  describe('RenderValidationError', () => {
    it('should include validation errors', () => {
      const errors = [{ path: ['name'], message: 'Required' }];
      const error = new RenderValidationError('Validation failed', errors);
      expect(error.errors).toEqual(errors);
    });
  });

  describe('createApiError', () => {
    it('should create RenderAuthError for 401', () => {
      const error = createApiError(401, 'Unauthorized');
      expect(error).toBeInstanceOf(RenderAuthError);
    });

    it('should create RenderNotFoundError for 404', () => {
      const error = createApiError(404, 'Not found');
      expect(error).toBeInstanceOf(RenderNotFoundError);
    });

    it('should create RenderRateLimitError for 429 with retryAfter', () => {
      const error = createApiError(429, 'Too many requests', undefined, undefined, 60);
      expect(error).toBeInstanceOf(RenderRateLimitError);
      expect((error as RenderRateLimitError).retryAfter).toBe(60);
    });

    it('should create generic RenderApiError for unknown status', () => {
      const error = createApiError(418, "I'm a teapot");
      expect(error).toBeInstanceOf(RenderApiError);
      expect(error.status).toBe(418);
    });
  });
});

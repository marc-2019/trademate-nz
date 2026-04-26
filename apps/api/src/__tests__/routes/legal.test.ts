/**
 * Legal Route Tests
 * Routes serve HTML pages with no authentication required.
 */

import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../config/index.js', () => ({
  config: { appName: 'BossBoard', port: 29001 },
}));

import legalRoutes from '../../routes/legal.js';

let app: Express;

beforeAll(() => {
  app = express();
  app.use('/legal', legalRoutes);
});

describe('Legal Routes', () => {
  // =========================================================================
  // GET /privacy
  // =========================================================================
  describe('GET /legal/privacy', () => {
    it('should return HTML with 200 status', async () => {
      const response = await request(app).get('/legal/privacy');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should contain Privacy Policy content', async () => {
      const response = await request(app).get('/legal/privacy');

      expect(response.text).toMatch(/privacy/i);
    });

    it('should not contain inline scripts', async () => {
      const response = await request(app).get('/legal/privacy');

      expect(response.text).not.toContain('<script');
    });
  });

  // =========================================================================
  // GET /terms
  // =========================================================================
  describe('GET /legal/terms', () => {
    it('should return HTML with 200 status', async () => {
      const response = await request(app).get('/legal/terms');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should contain Terms of Service content', async () => {
      const response = await request(app).get('/legal/terms');

      expect(response.text).toMatch(/terms/i);
    });
  });

  // =========================================================================
  // GET /support
  // =========================================================================
  describe('GET /legal/support', () => {
    it('should return HTML with 200 status', async () => {
      const response = await request(app).get('/legal/support');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should contain support/contact content', async () => {
      const response = await request(app).get('/legal/support');

      expect(response.text).toMatch(/support|contact/i);
    });
  });

  // =========================================================================
  // GET /delete-account
  // =========================================================================
  describe('GET /legal/delete-account', () => {
    it('should return HTML with 200 status', async () => {
      const response = await request(app).get('/legal/delete-account');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should contain account deletion content', async () => {
      const response = await request(app).get('/legal/delete-account');

      expect(response.text).toMatch(/account|delete/i);
    });
  });

  // =========================================================================
  // GET /delete-data
  // =========================================================================
  describe('GET /legal/delete-data', () => {
    it('should return HTML with 200 status', async () => {
      const response = await request(app).get('/legal/delete-data');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should contain data deletion content', async () => {
      const response = await request(app).get('/legal/delete-data');

      expect(response.text).toMatch(/data|delete/i);
    });
  });
});

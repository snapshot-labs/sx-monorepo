import express from 'express';
import request from 'supertest';
import api from '../../src/api';
import {
  ERROR_MESSAGE,
  queue
} from '../../src/helpers/duplicateRequestPreventor';
import { sha256 } from '../../src/helpers/utils';
import proposalInput from '../fixtures/ingestor-payload/proposal.json';

const app = new express();
app.use(express.json({ limit: '20mb' }));
app.use('/', api);

async function send(payload) {
  return await request(app)
    .post('/')
    .send(payload)
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json');
}

describe('POST /', () => {
  describe('when the same request is already being processed', () => {
    const payload = { sig: 'test' };
    const hash = sha256(JSON.stringify(payload));

    beforeAll(() => {
      queue.add(hash);
    });

    afterAll(() => {
      queue.delete(hash);
    });

    it('returns a 425 error', async () => {
      const response = await send(payload);

      expect(response.status).toBe(425);
      expect(response.body.error).toBe('client_error');
      expect(response.body.error_description).toBe(ERROR_MESSAGE);
    });
  });

  describe('when the request is not already being processed', () => {
    it('process and return response from the ingestor', async () => {
      const response = await send(proposalInput);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('client_error');
      expect(response.body.error_description).toBe('wrong timestamp');
    });
  });
});

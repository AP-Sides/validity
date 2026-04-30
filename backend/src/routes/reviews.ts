import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

interface ReviewBody {
  rating: number;
  review: string;
}

interface ReviewResponse {
  success: boolean;
}

export function register(app: App, fastify: FastifyInstance) {
  fastify.post<{ Body: ReviewBody }>(
    '/api/reviews',
    {
      schema: {
        description: 'Submit a review to Google Sheets',
        tags: ['reviews'],
        body: {
          type: 'object',
          required: ['rating', 'review'],
          properties: {
            rating: { type: 'integer', minimum: 1, maximum: 5, description: 'Review rating from 1 to 5' },
            review: { type: 'string', minLength: 1, description: 'Review text' },
          },
        },
        response: {
          200: {
            description: 'Review submitted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          400: {
            description: 'Invalid input',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ReviewBody }>, reply: FastifyReply): Promise<ReviewResponse> => {
      const { rating, review } = request.body;

      app.logger.info({ rating, reviewLength: review.length }, 'Received review submission');

      try {
        // Build the payload
        const payload = {
          rating,
          review,
          timestamp: new Date().toISOString(),
        };

        app.logger.debug({ payload }, 'Sending payload to webhook');

        // POST to the webhook URL
        const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
        if (!webhookUrl) {
          app.logger.warn('GOOGLE_SHEETS_WEBHOOK_URL not configured');
        } else {
          try {
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              app.logger.error(
                { status: response.status, statusText: response.statusText },
                'Webhook returned non-2xx status'
              );
            } else {
              app.logger.info({ status: response.status }, 'Webhook response successful');
            }
          } catch (webhookError) {
            app.logger.error({ err: webhookError }, 'Failed to send webhook');
          }
        }

        app.logger.info('Review submitted successfully');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, rating, review }, 'Review submission failed unexpectedly');
        throw error;
      }
    }
  );
}

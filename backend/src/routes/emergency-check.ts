import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateText } from 'ai';
import { gateway } from '@specific-dev/framework';
import type { App } from '../index.js';

interface EmergencyCheckRequest {
  situation: string;
}

interface EmergencyCheckResponse {
  recommendation: 'GO_TO_ER' | 'GO_TO_CLINIC' | 'TREAT_AT_HOME';
  urgency_score: number;
  confidence: number;
  reasoning: string;
  warning_signs: string[];
  home_treatment: string[];
  disclaimer: string;
}

const EMERGENCY_TRIAGE_SYSTEM_PROMPT = `You are a senior emergency medicine triage specialist. Triage rules:
- GO_TO_ER for life/limb-threatening situations: chest pain, difficulty breathing, altered consciousness, severe bleeding, suspected fractures, neurological symptoms, pain 8-10 with mechanism of injury.
- GO_TO_CLINIC for non-urgent but needs professional care: infections, moderate pain 4-7, non-emergency injuries.
- TREAT_AT_HOME for minor self-treatable issues: mild pain 1-3, minor cuts, common cold symptoms.
Be direct and decisive — do NOT hedge on clear cases.
Always provide 4-6 home treatment steps regardless of recommendation.
Warning signs: 3-5 specific signs that would escalate the recommendation.
Urgency score: 1-3 = home, 4-6 = clinic, 7-10 = ER.

Respond ONLY with a valid JSON object in this exact shape:
{
  "recommendation": "GO_TO_ER" | "GO_TO_CLINIC" | "TREAT_AT_HOME",
  "urgency_score": <integer 1-10>,
  "confidence": <float 0.0-1.0>,
  "reasoning": "<2-3 sentence plain English explanation>",
  "warning_signs": ["<sign1>", "<sign2>", "<sign3>"],
  "home_treatment": ["<step1>", "<step2>", "<step3>", "<step4>"],
  "disclaimer": "This is not medical advice. Always consult a healthcare professional for medical decisions."
}`;

export function register(app: App, fastify: FastifyInstance) {
  fastify.post<{ Body: EmergencyCheckRequest }>(
    '/api/emergency-check',
    {
      schema: {
        description: 'Emergency medical triage assessment',
        tags: ['emergency'],
        body: {
          type: 'object',
          required: ['situation'],
          properties: {
            situation: { type: 'string', minLength: 1, description: 'Description of the medical situation' },
          },
        },
        response: {
          200: {
            description: 'Triage assessment result',
            type: 'object',
            properties: {
              recommendation: { type: 'string', enum: ['GO_TO_ER', 'GO_TO_CLINIC', 'TREAT_AT_HOME'] },
              urgency_score: { type: 'number', minimum: 1, maximum: 10 },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              reasoning: { type: 'string' },
              warning_signs: { type: 'array', items: { type: 'string' } },
              home_treatment: { type: 'array', items: { type: 'string' } },
              disclaimer: { type: 'string' },
            },
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          500: {
            description: 'Server error',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: EmergencyCheckRequest }>, reply: FastifyReply) => {
      const { situation } = request.body;

      app.logger.info({ situation }, 'Starting emergency triage assessment');

      try {
        // Call GPT-4o-mini with the system prompt and situation
        const { text } = await generateText({
          model: gateway('openai/gpt-4o-mini'),
          system: EMERGENCY_TRIAGE_SYSTEM_PROMPT,
          prompt: situation,
        });

        app.logger.debug({ responseLength: text.length }, 'Received AI triage response');

        // Parse the JSON response (handle potential markdown code blocks)
        let jsonText = text.trim();

        // Extract JSON from markdown code blocks if present
        const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim();
        }

        let triageResponse: EmergencyCheckResponse;
        try {
          triageResponse = JSON.parse(jsonText);
        } catch (parseError) {
          app.logger.error({ err: parseError, response: text }, 'Failed to parse triage response JSON');
          return reply.status(500).send({ error: 'Failed to parse triage response' });
        }

        // Validate response structure
        if (
          !triageResponse.recommendation ||
          typeof triageResponse.urgency_score !== 'number' ||
          typeof triageResponse.confidence !== 'number' ||
          !triageResponse.reasoning ||
          !Array.isArray(triageResponse.warning_signs) ||
          !Array.isArray(triageResponse.home_treatment) ||
          !triageResponse.disclaimer
        ) {
          app.logger.error({ triageResponse }, 'Invalid triage response structure');
          return reply.status(500).send({ error: 'Invalid triage response structure' });
        }

        // Validate enum value
        if (!['GO_TO_ER', 'GO_TO_CLINIC', 'TREAT_AT_HOME'].includes(triageResponse.recommendation)) {
          app.logger.error({ recommendation: triageResponse.recommendation }, 'Invalid recommendation value');
          return reply.status(500).send({ error: 'Invalid recommendation value' });
        }

        app.logger.info(
          { recommendation: triageResponse.recommendation, urgency_score: triageResponse.urgency_score },
          'Emergency triage assessment completed'
        );

        return triageResponse;
      } catch (error) {
        app.logger.error({ err: error, situation }, 'Emergency triage assessment failed');
        throw error;
      }
    }
  );
}

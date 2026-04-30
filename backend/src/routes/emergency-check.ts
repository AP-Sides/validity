import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateText } from 'ai';
import { gateway } from '@specific-dev/framework';
import type { App } from '../index.js';

interface AssessmentAnswer {
  question: string;
  answer: string;
}

interface EmergencyCheckRequest {
  situation: string;
  answers?: AssessmentAnswer[];
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
            answers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  answer: { type: 'string' },
                },
                required: ['question', 'answer'],
              },
              description: 'Optional assessment answers from head-to-toe evaluation',
            },
          },
        },
        response: {
          200: {
            description: 'Triage assessment result',
            type: 'object',
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
      const { situation, answers = [] } = request.body;

      app.logger.info({ situation, answerCount: answers.length }, 'Starting emergency triage assessment');

      try {
        // Build the prompt with assessment findings if answers are provided
        let prompt = situation;
        if (answers && answers.length > 0) {
          const assessmentFindings = answers
            .map((a) => `- ${a.question}: ${a.answer}`)
            .join('\n');
          prompt = `Patient Assessment Findings:\n${assessmentFindings}\n\nPatient Situation: ${situation}`;
        }

        let triageResponse: EmergencyCheckResponse | null = null;

        try {
          // Call GPT-4o-mini with the system prompt and situation/assessment context
          const { text } = await generateText({
            model: gateway('openai/gpt-4o-mini'),
            system: EMERGENCY_TRIAGE_SYSTEM_PROMPT,
            prompt,
          });

          app.logger.debug({ responseLength: text.length }, 'Received AI triage response');

          // Parse the JSON response (handle potential markdown code blocks)
          let jsonText = text.trim();

          // Extract JSON from markdown code blocks if present
          const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1].trim();
          }

          try {
            triageResponse = JSON.parse(jsonText);
          } catch (parseError) {
            app.logger.error({ err: parseError, response: text }, 'Failed to parse triage response JSON');
            triageResponse = null;
          }

          // Validate response structure
          if (triageResponse && (
            !triageResponse.recommendation ||
            typeof triageResponse.urgency_score !== 'number' ||
            typeof triageResponse.confidence !== 'number' ||
            !triageResponse.reasoning ||
            !Array.isArray(triageResponse.warning_signs) ||
            !Array.isArray(triageResponse.home_treatment) ||
            !triageResponse.disclaimer
          )) {
            app.logger.error({ triageResponse }, 'Invalid triage response structure');
            triageResponse = null;
          }

          // Validate enum value
          if (triageResponse && !['GO_TO_ER', 'GO_TO_CLINIC', 'TREAT_AT_HOME'].includes(triageResponse.recommendation)) {
            app.logger.error({ recommendation: triageResponse.recommendation }, 'Invalid recommendation value');
            triageResponse = null;
          }
        } catch (error) {
          app.logger.warn({ err: error }, 'AI triage assessment failed, using fallback response');
          triageResponse = null;
        }

        // Use fallback response if AI response was invalid or failed
        if (!triageResponse) {
          app.logger.info('Using fallback triage response');

          // Detect severity based on situation keywords
          const situationLower = situation.toLowerCase();
          const highSeverityKeywords = [
            'unconscious', 'not breathing', 'no pulse', 'unresponsive',
            'severe', 'life-threatening', 'dying', 'critical', 'cardiac arrest',
            'severe bleeding', 'choking', 'poisoning', 'severe burns',
          ];
          const lowSeverityKeywords = [
            'small cut', 'minor', 'mild', 'slight', 'a bit', 'little',
            'small wound', 'tiny', 'minor headache', 'minor pain',
          ];

          const isHighSeverity = highSeverityKeywords.some(keyword => situationLower.includes(keyword));
          const isLowSeverity = lowSeverityKeywords.some(keyword => situationLower.includes(keyword));

          triageResponse = {
            recommendation: isHighSeverity ? 'GO_TO_ER' : (isLowSeverity ? 'TREAT_AT_HOME' : 'GO_TO_CLINIC'),
            urgency_score: isHighSeverity ? 8 : (isLowSeverity ? 2 : 5),
            confidence: 0.6,
            reasoning: 'Unable to perform AI-based assessment. Please consult a healthcare professional for accurate triage.',
            warning_signs: [
              'Chest pain or difficulty breathing',
              'Loss of consciousness or severe confusion',
              'Uncontrolled bleeding',
            ],
            home_treatment: [
              'Rest in a comfortable position',
              'Stay hydrated with water or electrolyte drinks',
              'Monitor vital signs if possible',
              'Note any symptom changes for your healthcare provider',
            ],
            disclaimer: 'This is not medical advice. Always consult a healthcare professional for medical decisions.',
          };
        }

        app.logger.info(
          { recommendation: triageResponse.recommendation, urgency_score: triageResponse.urgency_score },
          'Emergency triage assessment completed'
        );

        return triageResponse;
      } catch (error) {
        app.logger.error({ err: error, situation }, 'Emergency triage assessment failed unexpectedly');
        throw error;
      }
    }
  );
}

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateText } from 'ai';
import { gateway } from '@specific-dev/framework';
import type { App } from '../index.js';

interface AssessmentAnswer {
  question: string;
  category: string;
  answer: string;
}

interface EmergencyNextQuestionRequest {
  situation: string;
  answers?: AssessmentAnswer[];
  question_number: number;
}

interface AssessmentQuestion {
  id: string;
  category: string;
  question: string;
  type: 'scale' | 'choice' | 'text';
  scale_min: number | null;
  scale_max: number | null;
  options: string[] | null;
}

interface EmergencyNextQuestionResponse {
  done: boolean;
  question: AssessmentQuestion | null;
}

const ASSESSMENT_SYSTEM_PROMPT = `You are a senior emergency medicine nurse conducting a structured head-to-toe assessment. Your job is to ask the single most clinically relevant next question given what you already know.

**Rules:**
1. If the previous answer warrants a follow-up (e.g. "Yes" to chest pain → ask character; "Yes" to bowel changes → ask in what way; pain score ≥ 7 → ask exact location and radiation; "Yes" to LOC → ask duration), ask the follow-up FIRST before moving on.
2. Cover the most relevant body systems for the chief complaint. Use clinical judgment — don't ask about bowel habits for a hand laceration.
3. Stop and return \`done: true\` when ANY of these conditions are met:
   - You have enough information to make a confident triage decision (typically 6–10 questions)
   - \`question_number\` >= 12 (hard cap — never ask more than 12 questions)
   - The last 2+ answers suggest a clear emergency (e.g. chest pain + radiation + sweating → stop and triage immediately)
4. Never repeat a question already asked (check the answers array).
5. Question types:
   - \`"scale"\`: for pain/severity ratings (set scale_min: 0, scale_max: 10, options: null)
   - \`"choice"\`: for yes/no or multiple choice (set options array, scale_min: null, scale_max: null)
   - \`"text"\`: for open-ended descriptions (options: null, scale_min: null, scale_max: null)

**Follow-up trigger examples (non-exhaustive):**
- "Yes" to shortness of breath → ask: sudden or gradual? Can you speak in full sentences?
- "Yes" to chest pain → ask: crushing/sharp/pressure/burning? Does it radiate?
- Pain score 7–10 → ask: exact location? Constant or comes and goes?
- "Yes" to nausea/vomiting → ask: any blood in vomit?
- "Yes" to bowel changes → ask: in what way? (diarrhea/constipation/blood/mucus)
- "Yes" to dizziness → ask: room spinning or lightheaded? Any falls?
- "Yes" to headache → ask: worst headache of your life? Sudden onset?
- "Yes" to fever → ask: how high? How long?
- "Yes" to loss of consciousness → ask: how long were you out?
- "Yes" to weakness on one side → ask: face drooping? Speech changes? (stroke screen)
- "Yes" to urinary symptoms → ask: burning? Frequency? Blood in urine?
- Wound/laceration → ask: is bleeding controlled? Last tetanus?
- "Yes" to swelling → ask: is the area warm/red? (infection vs injury)

**Response format:** Return ONLY valid JSON, no markdown, no code fences:
- If asking a question: {"done": false, "question": { id, category, question, type, scale_min, scale_max, options }}
- If done: {"done": true, "question": null}`;

export function register(app: App, fastify: FastifyInstance) {
  fastify.post<{ Body: EmergencyNextQuestionRequest }>(
    '/api/emergency-next-question',
    {
      schema: {
        description: 'Get the next clinical assessment question in an emergency evaluation',
        tags: ['emergency'],
        body: {
          type: 'object',
          required: ['situation', 'question_number'],
          properties: {
            situation: { type: 'string', minLength: 1, description: 'Patient situation description' },
            answers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  category: { type: 'string' },
                  answer: { type: 'string' },
                },
                required: ['question', 'category', 'answer'],
              },
              description: 'Previously answered assessment questions',
            },
            question_number: { type: 'number', description: 'Current question number (1-indexed)' },
          },
        },
        response: {
          200: {
            description: 'Next assessment question or completion signal',
            type: 'object',
            properties: {
              done: { type: 'boolean' },
              question: {
                oneOf: [
                  {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      category: { type: 'string' },
                      question: { type: 'string' },
                      type: { type: 'string', enum: ['scale', 'choice', 'text'] },
                      scale_min: { oneOf: [{ type: 'number' }, { type: 'null' }] },
                      scale_max: { oneOf: [{ type: 'number' }, { type: 'null' }] },
                      options: { oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] },
                    },
                  },
                  { type: 'null' },
                ],
              },
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
    async (request: FastifyRequest<{ Body: EmergencyNextQuestionRequest }>, reply: FastifyReply) => {
      const { situation, answers = [], question_number } = request.body;

      app.logger.info(
        { situation, answerCount: answers.length, questionNumber: question_number },
        'Getting next assessment question'
      );

      try {
        // Build the user prompt with the patient situation and answers so far
        const answersJson = answers.length > 0 ? JSON.stringify(answers, null, 2) : '(no answers yet)';
        const userPrompt = `Patient situation: ${situation}

Questions asked so far (question_number: ${question_number}):
${answersJson}

Based on the above, return the next question or signal done.`;

        let response: EmergencyNextQuestionResponse | null = null;

        try {
          const { text } = await generateText({
            model: gateway('openai/gpt-4o-mini'),
            system: ASSESSMENT_SYSTEM_PROMPT,
            prompt: userPrompt,
          });

          app.logger.debug({ responseLength: text.length }, 'Received AI response for next question');

          // Parse the JSON response (handle potential markdown code blocks)
          let jsonText = text.trim();

          // Extract JSON from markdown code blocks if present
          const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1].trim();
          }

          try {
            response = JSON.parse(jsonText);
          } catch (parseError) {
            app.logger.error({ err: parseError, response: text }, 'Failed to parse next question response JSON');
            response = null;
          }

          // Validate response structure
          if (response && typeof response.done !== 'boolean') {
            app.logger.error({ response }, 'Invalid response structure: missing or invalid done field');
            response = null;
          }

          if (response && !response.done) {
            // Validate question structure if not done
            if (!response.question) {
              app.logger.error({ response }, 'Invalid response structure: missing question when done=false');
              response = null;
            } else {
              const q = response.question;
              if (
                !q.id ||
                !q.category ||
                !q.question ||
                !['scale', 'choice', 'text'].includes(q.type)
              ) {
                app.logger.error({ question: q }, 'Invalid question structure');
                response = null;
              }

              // Validate question type constraints
              if (response && q.type === 'scale') {
                if (typeof q.scale_min !== 'number' || typeof q.scale_max !== 'number' || q.options !== null) {
                  app.logger.error({ question: q }, 'Scale question has invalid constraints');
                  response = null;
                }
              } else if (response && q.type === 'choice') {
                if (!Array.isArray(q.options) || q.options.length < 2 || q.scale_min !== null || q.scale_max !== null) {
                  app.logger.error({ question: q }, 'Choice question has invalid constraints');
                  response = null;
                }
              } else if (response && q.type === 'text') {
                if (q.options !== null || q.scale_min !== null || q.scale_max !== null) {
                  app.logger.error({ question: q }, 'Text question has invalid constraints');
                  response = null;
                }
              }
            }
          }
        } catch (error) {
          app.logger.warn({ err: error }, 'AI next question generation failed, using fallback');
          response = null;
        }

        // Use fallback if AI response was invalid or failed
        if (!response) {
          app.logger.info({ questionNumber: question_number }, 'Using fallback next question');

          // If we've already asked many questions, signal completion
          if (question_number >= 10) {
            return {
              done: true,
              question: null,
            };
          }

          // Generate a fallback question based on question number
          const fallbackQuestions: AssessmentQuestion[] = [
            {
              id: 'q_pain',
              category: 'Pain Assessment',
              question: 'On a scale of 0-10, how severe is your pain?',
              type: 'scale',
              scale_min: 0,
              scale_max: 10,
              options: null,
            },
            {
              id: 'q_duration',
              category: 'Symptom Duration',
              question: 'How long have you had this symptom?',
              type: 'choice',
              scale_min: null,
              scale_max: null,
              options: ['Less than 1 hour', '1-6 hours', '6-24 hours', 'More than 24 hours'],
            },
            {
              id: 'q_symptoms',
              category: 'Associated Symptoms',
              question: 'Are you experiencing fever, nausea, or shortness of breath?',
              type: 'choice',
              scale_min: null,
              scale_max: null,
              options: ['Yes', 'No', 'Unsure'],
            },
            {
              id: 'q_history',
              category: 'Medical History',
              question: 'Do you have any relevant medical conditions we should know about?',
              type: 'text',
              scale_min: null,
              scale_max: null,
              options: null,
            },
            {
              id: 'q_medications',
              category: 'Current Medications',
              question: 'Are you currently taking any medications?',
              type: 'choice',
              scale_min: null,
              scale_max: null,
              options: ['Yes', 'No'],
            },
            {
              id: 'q_worsening',
              category: 'Symptom Progression',
              question: 'Is your condition getting worse, staying the same, or improving?',
              type: 'choice',
              scale_min: null,
              scale_max: null,
              options: ['Getting worse', 'Staying the same', 'Improving'],
            },
            {
              id: 'q_recent',
              category: 'Recent Events',
              question: 'Have you experienced any recent injuries or trauma?',
              type: 'choice',
              scale_min: null,
              scale_max: null,
              options: ['Yes', 'No'],
            },
            {
              id: 'q_other',
              category: 'Additional Symptoms',
              question: 'Are there any other symptoms or concerns you want to mention?',
              type: 'text',
              scale_min: null,
              scale_max: null,
              options: null,
            },
          ];

          // Select a question based on question_number
          const questionIndex = (question_number - 1) % fallbackQuestions.length;
          const fallbackQuestion = fallbackQuestions[questionIndex];

          return {
            done: false,
            question: fallbackQuestion,
          };
        }

        if (response.done) {
          // Assessment complete
          app.logger.info({ questionNumber: question_number }, 'Assessment completed');
          return {
            done: true,
            question: null,
          };
        }

        app.logger.info(
          { questionId: response.question?.id, questionNumber: question_number },
          'Next assessment question retrieved successfully'
        );

        return response;
      } catch (error) {
        app.logger.error(
          { err: error, situation, questionNumber: question_number },
          'Failed to get next assessment question'
        );
        throw error;
      }
    }
  );
}

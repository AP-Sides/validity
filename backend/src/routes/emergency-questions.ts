import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateText } from 'ai';
import { gateway } from '@specific-dev/framework';
import type { App } from '../index.js';

interface EmergencyQuestionsRequest {
  situation: string;
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

interface EmergencyQuestionsResponse {
  questions: AssessmentQuestion[];
}

const ASSESSMENT_SYSTEM_PROMPT = `You are a senior emergency medicine nurse conducting a structured head-to-toe assessment. Based on the patient's situation, generate 6–10 targeted clinical assessment questions.

STEP 1: Identify the primary complaint category from: trauma/fall, chest/cardiac, respiratory, abdominal, neurological, musculoskeletal, skin/wound, fever/infection, mental health.

STEP 2: Generate questions using the nursing head-to-toe assessment framework for the identified category:

For trauma/fall:
- Mechanism: How did you fall? Did you hit your head?
- LOC: Did you lose consciousness at any point?
- Pain: Rate pain 0–10. Where exactly? Sharp, dull, throbbing?
- Neuro: Any numbness, tingling, or weakness in limbs?
- Musculoskeletal: Can you bear weight / move the affected area?
- Skin: Any visible deformity, swelling, bruising, open wounds?
- Circulation: Is the area warm or cold? Normal skin color?
- Last tetanus (if open wound)

For chest/cardiac:
- Pain character: Crushing, sharp, pressure, burning?
- Radiation: Does it spread to arm, jaw, back, shoulder?
- Associated: Nausea, sweating, shortness of breath?
- Duration: How long has this been going on?
- Exertion: Does it worsen with activity or at rest?
- History: Any prior heart conditions, stents, bypass?
- Vitals proxy: Do you feel your heart racing or skipping?

For respiratory:
- Onset: Sudden or gradual?
- Severity: Can you speak in full sentences?
- Triggers: Any known allergies, asthma, recent illness?
- Cough: Productive? Color of sputum?
- Fever: Any fever or chills?
- Position: Is it worse lying down?
- History: Any COPD, asthma, recent travel?

For abdominal:
- Location: Where exactly? Point to the area.
- Character: Cramping, constant, sharp, dull?
- Associated: Nausea, vomiting, diarrhea, constipation?
- Last bowel movement
- Appetite: Any changes?
- Females: Any chance of pregnancy? Last menstrual period?
- Urinary: Any pain or burning with urination?

For neurological:
- Onset: Sudden or gradual?
- Headache: Worst of your life? Location?
- Vision: Any changes, double vision, blurring?
- Speech: Any difficulty speaking or understanding?
- Motor: Any weakness or paralysis on one side?
- Coordination: Any difficulty walking or balance issues?
- History: Any prior strokes, seizures, migraines?

For musculoskeletal:
- Mechanism: How did the injury occur?
- Weight bearing: Can you put weight on it?
- ROM: Can you move the joint through its range?
- Swelling/bruising: Present?
- Neurovascular: Sensation and circulation distal to injury?
- Prior injury to same area?

For fever/infection:
- Temperature: Do you know your current temp?
- Duration: How long have you had the fever?
- Associated: Chills, sweats, rigors?
- Source: Any known infection, recent illness, travel?
- Rash: Any skin changes?
- Immunocompromised: Any conditions affecting immunity?

For skin/wound:
- Mechanism: How did the wound occur?
- Depth: Does it appear deep? Can you see tissue/fat?
- Bleeding: Is it controlled or still actively bleeding?
- Contamination: Was it a clean or dirty object?
- Tetanus: When was your last tetanus shot?
- Infection signs: Redness, warmth, pus, red streaking?

STEP 3: Always include at minimum:
- One pain scale question (0–10) if pain is mentioned or likely
- One question about allergies or current medications if relevant
- One question about relevant medical history

STEP 4: Assign each question a clear category label from: "Pain Assessment", "Neurological", "Cardiovascular", "Respiratory", "Musculoskeletal", "Skin & Wound", "Gastrointestinal", "Genitourinary", "Vital Signs Proxy", "Medical History"

STEP 5: Return ONLY valid JSON in this exact structure, no markdown, no explanation:
{
  "questions": [
    {
      "id": "q1",
      "category": "category label",
      "question": "question text",
      "type": "scale" | "choice" | "text",
      "scale_min": 0 or null,
      "scale_max": 10 or null,
      "options": ["option1", "option2"] or null
    }
  ]
}

Rules:
- For type "scale": set scale_min and scale_max (usually 0 and 10), options must be null
- For type "choice": provide 2–4 options in the options array, scale_min and scale_max must be null
- For type "text": options must be null, scale_min and scale_max must be null
- Generate between 6 and 10 questions total
- IDs must be "q1", "q2", "q3", etc.`;

export function register(app: App, fastify: FastifyInstance) {
  fastify.post<{ Body: EmergencyQuestionsRequest }>(
    '/api/emergency-questions',
    {
      schema: {
        description: 'Generate assessment questions for a medical situation',
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
            description: 'Assessment questions generated',
            type: 'object',
            properties: {
              questions: {
                type: 'array',
                items: {
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
    async (request: FastifyRequest<{ Body: EmergencyQuestionsRequest }>, reply: FastifyReply) => {
      const { situation } = request.body;

      app.logger.info({ situation }, 'Generating assessment questions');

      try {
        const userPrompt = `Patient situation: ${situation}`;

        let questionsResponse: EmergencyQuestionsResponse | null = null;

        try {
          const { text } = await generateText({
            model: gateway('openai/gpt-4o-mini'),
            system: ASSESSMENT_SYSTEM_PROMPT,
            prompt: userPrompt,
          });

          app.logger.debug({ responseLength: text.length }, 'Received AI assessment questions');

          // Parse the JSON response (handle potential markdown code blocks)
          let jsonText = text.trim();

          // Extract JSON from markdown code blocks if present
          const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1].trim();
          }

          try {
            questionsResponse = JSON.parse(jsonText);
          } catch (parseError) {
            app.logger.error({ err: parseError, response: text }, 'Failed to parse questions response JSON');
            questionsResponse = null;
          }

          // Validate response structure
          if (!questionsResponse || !Array.isArray(questionsResponse.questions) || questionsResponse.questions.length === 0) {
            app.logger.error({ questionsResponse }, 'Invalid questions response structure');
            questionsResponse = null;
          }

          // Validate each question
          if (questionsResponse) {
            for (const question of questionsResponse.questions) {
              if (
                !question.id ||
                !question.category ||
                !question.question ||
                !['scale', 'choice', 'text'].includes(question.type)
              ) {
                app.logger.error({ question }, 'Invalid question structure');
                questionsResponse = null;
                break;
              }

              if (question.type === 'scale') {
                if (typeof question.scale_min !== 'number' || typeof question.scale_max !== 'number') {
                  app.logger.error({ question }, 'Scale question missing scale_min/scale_max');
                  questionsResponse = null;
                  break;
                }
                if (question.options !== null) {
                  app.logger.error({ question }, 'Scale question should have null options');
                  questionsResponse = null;
                  break;
                }
              } else if (question.type === 'choice') {
                if (!Array.isArray(question.options) || question.options.length < 2) {
                  app.logger.error({ question }, 'Choice question missing or invalid options');
                  questionsResponse = null;
                  break;
                }
                if (question.scale_min !== null || question.scale_max !== null) {
                  app.logger.error({ question }, 'Choice question should have null scale');
                  questionsResponse = null;
                  break;
                }
              } else if (question.type === 'text') {
                if (question.options !== null || question.scale_min !== null || question.scale_max !== null) {
                  app.logger.error({ question }, 'Text question should have null options and scale');
                  questionsResponse = null;
                  break;
                }
              }
            }
          }
        } catch (error) {
          app.logger.warn({ err: error }, 'AI assessment questions generation failed, using fallback questions');
          questionsResponse = null;
        }

        // Use fallback questions if AI response was invalid or failed
        if (!questionsResponse) {
          app.logger.info('Using fallback assessment questions');
          questionsResponse = {
            questions: [
              {
                id: 'q1',
                category: 'Pain Assessment',
                question: 'On a scale of 0-10, how would you rate your pain?',
                type: 'scale',
                scale_min: 0,
                scale_max: 10,
                options: null,
              },
              {
                id: 'q2',
                category: 'Symptom Duration',
                question: 'How long have you had this symptom?',
                type: 'choice',
                scale_min: null,
                scale_max: null,
                options: ['Less than 1 hour', '1-6 hours', '6-24 hours', 'More than 24 hours'],
              },
              {
                id: 'q3',
                category: 'Associated Symptoms',
                question: 'Are you experiencing any of: fever, nausea, shortness of breath, chest pain, or dizziness?',
                type: 'choice',
                scale_min: null,
                scale_max: null,
                options: ['Yes', 'No', 'Unsure'],
              },
              {
                id: 'q4',
                category: 'Medical History',
                question: 'Do you have any relevant medical conditions or allergies we should know about?',
                type: 'text',
                scale_min: null,
                scale_max: null,
                options: null,
              },
              {
                id: 'q5',
                category: 'Current Medications',
                question: 'Are you currently taking any medications?',
                type: 'choice',
                scale_min: null,
                scale_max: null,
                options: ['Yes', 'No'],
              },
              {
                id: 'q6',
                category: 'Symptom Progression',
                question: 'Is your symptom getting worse, staying the same, or improving?',
                type: 'choice',
                scale_min: null,
                scale_max: null,
                options: ['Getting worse', 'Staying the same', 'Improving'],
              },
            ],
          };
        }

        app.logger.info(
          { questionCount: questionsResponse.questions.length },
          'Assessment questions generated successfully'
        );

        return questionsResponse;
      } catch (error) {
        app.logger.error({ err: error, situation }, 'Assessment questions generation failed unexpectedly');
        throw error;
      }
    }
  );
}

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { generateText } from 'ai';
import { gateway } from '@specific-dev/framework';
import type { App } from '../index.js';
import type { PaperMetadata } from './validate-claim-utils.js';
import { fetchSemanticScholarWithOffset, fetchPubMedWithOffset } from './validate-claim.js';

const drugInteractionBodySchema = z.object({
  substances: z.array(z.string().min(1)).min(2),
});

interface DrugInteractionResponse {
  severity: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE';
  confidence: number;
  summary: string;
  interactions: Array<{
    substance_a: string;
    substance_b: string;
    severity: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE';
    mechanism: string;
    recommendation: string;
  }>;
  studies: Array<{
    title: string;
    authors: string;
    year: number;
    journal: string;
    key_finding: string;
    url: string;
    citation_count: number;
  }>;
}

function generateSubstancePairs(substances: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < substances.length; i++) {
    for (let j = i + 1; j < substances.length; j++) {
      pairs.push([substances[i], substances[j]]);
    }
  }
  return pairs;
}

function deduplicateByTitle(papers: PaperMetadata[]): PaperMetadata[] {
  const seen = new Set<string>();
  const unique: PaperMetadata[] = [];

  for (const paper of papers) {
    const normalizedTitle = paper.title.toLowerCase();
    if (!seen.has(normalizedTitle)) {
      seen.add(normalizedTitle);
      unique.push(paper);
    }
  }

  return unique;
}

function buildStudyUrl(paper: PaperMetadata): string {
  if (paper.doi) {
    return `https://doi.org/${paper.doi}`;
  } else if (paper.pmid) {
    return `https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`;
  } else if (paper.semanticScholarId) {
    return `https://www.semanticscholar.org/paper/${paper.semanticScholarId}`;
  }
  return '#';
}

export function register(app: App, fastify: FastifyInstance) {
  fastify.post<{ Body: { substances: string[] } }>(
    '/api/drug-interactions',
    {
      schema: {
        description: 'Analyze drug/substance interactions',
        tags: ['drug-interactions'],
        body: {
          type: 'object',
          required: ['substances'],
          properties: {
            substances: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
              minItems: 2,
              description: 'Array of substances to analyze for interactions (minimum 2)',
            },
          },
        },
        response: {
          200: {
            description: 'Drug interaction analysis result',
            type: 'object',
            properties: {
              severity: { type: 'string', enum: ['NONE', 'MILD', 'MODERATE', 'SEVERE'] },
              confidence: { type: 'number', minimum: 0, maximum: 100 },
              summary: { type: 'string' },
              interactions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    substance_a: { type: 'string' },
                    substance_b: { type: 'string' },
                    severity: { type: 'string', enum: ['NONE', 'MILD', 'MODERATE', 'SEVERE'] },
                    mechanism: { type: 'string' },
                    recommendation: { type: 'string' },
                  },
                },
              },
              studies: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    authors: { type: 'string' },
                    year: { type: 'number' },
                    journal: { type: 'string' },
                    key_finding: { type: 'string' },
                    url: { type: 'string' },
                    citation_count: { type: 'number' },
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
              raw: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { substances: string[] } }>, reply: FastifyReply): Promise<DrugInteractionResponse | void> => {
      const { substances } = request.body;

      app.logger.info({ substanceCount: substances.length, substances }, 'Analyzing drug interactions');

      try {
        // Validate using Zod
        const parsed = drugInteractionBodySchema.safeParse({ substances });
        if (!parsed.success) {
          app.logger.error({ error: parsed.error }, 'Validation failed');
          return reply.status(400).send({ error: 'Invalid substances array - minimum 2 substances required' });
        }

        // Generate all unique pairs
        const pairs = generateSubstancePairs(substances);
        app.logger.debug({ pairCount: pairs.length }, 'Generated substance pairs');

        // Fetch papers for each pair
        const allPapers: PaperMetadata[] = [];
        for (const [substanceA, substanceB] of pairs) {
          const query = `interaction between ${substanceA} and ${substanceB}`;

          const fetchPromises: Promise<PaperMetadata[]>[] = [
            fetchSemanticScholarWithOffset(query, 0, 10, app),
            fetchPubMedWithOffset(query, 0, 10, app),
          ];

          const results = await Promise.allSettled(fetchPromises);
          for (const result of results) {
            if (result.status === 'fulfilled') {
              allPapers.push(...result.value);
            }
          }
        }

        app.logger.info({ totalPapers: allPapers.length }, 'Fetched papers for all substance pairs');

        // Deduplicate by title (case-insensitive)
        const deduplicatedPapers = deduplicateByTitle(allPapers);
        app.logger.debug({ deduplicatedCount: deduplicatedPapers.length }, 'Deduplicated papers by title');

        // If no papers found, return a safe default response
        if (deduplicatedPapers.length === 0) {
          app.logger.warn('No papers found for any substance pairs, returning safe default');
          return {
            severity: 'NONE',
            confidence: 25,
            summary: 'No research papers found to assess interactions between the provided substances. This does not mean there are no interactions; it indicates limited research availability in the searched databases.',
            interactions: pairs.map(([a, b]) => ({
              substance_a: a,
              substance_b: b,
              severity: 'NONE',
              mechanism: 'Insufficient research data available',
              recommendation: 'Consult medical literature or healthcare provider for detailed interaction information',
            })),
            studies: [],
          };
        }

        // Call AI to analyze interactions
        const systemPrompt = 'You are a senior clinical pharmacologist and toxicologist. Analyze the provided research papers and return a structured JSON assessment of drug/substance interactions.';

        const studiesForAI = deduplicatedPapers.map((paper) => ({
          title: paper.title,
          authors: paper.authors?.join(', ') || 'Unknown',
          year: paper.year,
          journal: paper.journal || 'Unknown',
          abstract: paper.abstract || '',
          url: buildStudyUrl(paper),
          citation_count: paper.citationCount || 0,
        }));

        const userPrompt = `
Substances to analyze: ${substances.join(', ')}

Research papers on interactions:
${studiesForAI.map((s) => `- "${s.title}" by ${s.authors} (${s.year}), ${s.journal}, cited ${s.citation_count} times\n  Abstract: ${s.abstract}`).join('\n\n')}

Please provide a JSON assessment with the following structure:
{
  "severity": "NONE | MILD | MODERATE | SEVERE",
  "confidence": <number 0-100>,
  "summary": "overall summary of interaction risk",
  "interactions": [
    {
      "substance_a": "string",
      "substance_b": "string",
      "severity": "NONE | MILD | MODERATE | SEVERE",
      "mechanism": "pharmacological mechanism description",
      "recommendation": "clinical recommendation"
    }
  ],
  "studies": [
    {
      "title": "string",
      "authors": "string",
      "year": number,
      "journal": "string",
      "key_finding": "string",
      "url": "string",
      "citation_count": number
    }
  ]
}`;

        const { text } = await generateText({
          model: gateway('openai/gpt-4o-mini'),
          system: systemPrompt,
          prompt: userPrompt,
        });

        app.logger.debug({ responseLength: text.length }, 'Received AI response for drug interactions');

        // Parse the AI response
        let jsonText = text.trim();

        // Extract JSON from markdown code blocks if present
        const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim();
        }

        let result: DrugInteractionResponse;
        try {
          result = JSON.parse(jsonText);
        } catch (parseError) {
          app.logger.error({ err: parseError, response: text }, 'Failed to parse AI response as JSON');
          return reply.status(500).send({
            error: 'Failed to parse AI response as JSON',
            raw: text,
          });
        }

        // Validate response structure (basic validation)
        if (!result.severity || !result.confidence || !result.summary || !Array.isArray(result.interactions) || !Array.isArray(result.studies)) {
          app.logger.error({ result }, 'AI response missing required fields');
          return reply.status(500).send({
            error: 'Failed to parse AI response as JSON',
            raw: text,
          });
        }

        app.logger.info({ severity: result.severity, confidence: result.confidence }, 'Drug interaction analysis completed successfully');

        return result;
      } catch (error) {
        app.logger.error({ err: error, substances }, 'Drug interaction analysis failed');
        throw error;
      }
    }
  );
}

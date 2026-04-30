import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { generateText } from 'ai';
import { gateway } from '@specific-dev/framework';
import type { App } from '../index.js';
import type { PaperMetadata } from './validate-claim-utils.js';
import { fetchSemanticScholarWithOffset, fetchPubMedWithOffset } from './validate-claim.js';

const funFactsBodySchema = z.object({
  category: z.enum(['medical', 'psychology', 'physics', 'computer-science', 'music', 'nature']),
  seenIds: z.array(z.string()).optional().default([]),
});

interface ResearchFact {
  id: string;
  headline: string;
  body: string;
  tag?: string;
  journal?: string;
  year?: number;
  url?: string;
}

interface FunFactsResponse {
  facts: ResearchFact[];
  total: number;
}

// Category-specific query arrays for different research domains
const categoryQueries: Record<string, string[]> = {
  medical: [
    'surprising medical discoveries',
    'paradoxical health findings',
    'misconceptions in medicine',
    'recent medical breakthroughs',
    'counterintuitive medical research',
  ],
  psychology: [
    'surprising psychology findings',
    'psychological paradoxes',
    'misconceptions in psychology',
    'unexpected cognitive discoveries',
    'behavioral science breakthroughs',
  ],
  physics: [
    'surprising physics discoveries',
    'counterintuitive physics phenomena',
    'recent physics breakthroughs',
    'paradoxes in quantum mechanics',
    'unexpected physics findings',
  ],
  'computer-science': [
    'surprising computer science discoveries',
    'AI breakthroughs',
    'algorithmic innovations',
    'unexpected machine learning findings',
    'computational breakthroughs',
  ],
  music: [
    'surprising music science findings',
    'music neuroscience discoveries',
    'unexpected music research',
    'cognitive music science',
    'music psychology breakthroughs',
  ],
  nature: [
    'surprising nature discoveries',
    'unexpected ecosystem findings',
    'animal behavior breakthroughs',
    'plant science discoveries',
    'biodiversity paradoxes',
  ],
};

// Fetch strategy per category - use available sources
type FetchStrategy = (
  query: string,
  offset: number,
  limit: number,
  app: App
) => Promise<PaperMetadata[]>;

const fetchStrategies: Record<string, FetchStrategy[]> = {
  medical: [
    (q, o, l, app) => fetchPubMedWithOffset(q, o, l, app),
    (q, o, l, app) => fetchSemanticScholarWithOffset(q, o, l, app),
  ],
  psychology: [
    (q, o, l, app) => fetchSemanticScholarWithOffset(q, o, l, app),
    (q, o, l, app) => fetchPubMedWithOffset(q, o, l, app),
  ],
  physics: [
    (q, o, l, app) => fetchSemanticScholarWithOffset(q, o, l, app),
    (q, o, l, app) => fetchPubMedWithOffset(q, o, l, app),
  ],
  'computer-science': [
    (q, o, l, app) => fetchSemanticScholarWithOffset(q, o, l, app),
    (q, o, l, app) => fetchPubMedWithOffset(q, o, l, app),
  ],
  music: [
    (q, o, l, app) => fetchSemanticScholarWithOffset(q, o, l, app),
    (q, o, l, app) => fetchPubMedWithOffset(q, o, l, app),
  ],
  nature: [
    (q, o, l, app) => fetchSemanticScholarWithOffset(q, o, l, app),
    (q, o, l, app) => fetchPubMedWithOffset(q, o, l, app),
  ],
};

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50);
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
  fastify.post<{ Body: z.infer<typeof funFactsBodySchema> }>(
    '/api/fun-facts',
    {
      schema: {
        description: 'Extract surprising research facts by category',
        tags: ['fun-facts'],
        body: {
          type: 'object',
          required: ['category'],
          properties: {
            category: {
              type: 'string',
              enum: ['medical', 'psychology', 'physics', 'computer-science', 'music', 'nature'],
              description: 'Research category for fact extraction',
            },
            seenIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Previously seen fact IDs to exclude',
            },
          },
        },
        response: {
          200: {
            description: 'Array of surprising research facts',
            type: 'object',
            properties: {
              facts: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'headline', 'body'],
                  properties: {
                    id: { type: 'string' },
                    headline: { type: 'string' },
                    body: { type: 'string' },
                    tag: { type: 'string' },
                    journal: { type: 'string' },
                    year: { type: 'number' },
                    url: { type: 'string' },
                  },
                },
              },
              total: { type: 'number' },
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
    async (
      request: FastifyRequest<{ Body: z.infer<typeof funFactsBodySchema> }>,
      reply: FastifyReply
    ): Promise<FunFactsResponse | void> => {
      const { category, seenIds = [] } = request.body;

      app.logger.info({ category, seenIdsCount: seenIds.length }, 'Extracting fun facts');

      try {
        // Validate using Zod
        const parsed = funFactsBodySchema.safeParse({ category, seenIds });
        if (!parsed.success) {
          app.logger.error({ error: parsed.error }, 'Validation failed');
          return reply.status(400).send({ error: 'Invalid request body' });
        }

        const queries = categoryQueries[category];
        const strategies = fetchStrategies[category];

        if (!queries || !strategies) {
          app.logger.error({ category }, 'Invalid category');
          return reply.status(400).send({ error: 'Invalid category' });
        }

        // Phase 1: Fetch papers for first 3 queries
        app.logger.debug({ category, queryCount: 3 }, 'Starting phase 1 paper fetching');
        let allPapers: PaperMetadata[] = [];

        for (let i = 0; i < Math.min(3, queries.length); i++) {
          const query = queries[i];
          const fetchPromises = strategies.map((strategy) => strategy(query, 0, 10, app));

          const results = await Promise.allSettled(fetchPromises);
          for (const result of results) {
            if (result.status === 'fulfilled') {
              allPapers.push(...result.value);
            }
          }
        }

        // Deduplicate
        allPapers = deduplicateByTitle(allPapers);
        app.logger.debug({ paperCount: allPapers.length }, 'Phase 1 papers deduplicated');

        // Call AI to extract facts
        let facts = await extractFacts(allPapers, category, app);
        app.logger.info({ factCount: facts.length }, 'Extracted facts from phase 1');

        // Filter out seen IDs
        const seenIdsSet = new Set(seenIds);
        let filteredFacts = facts.filter((f) => !seenIdsSet.has(f.id));
        app.logger.debug(
          { beforeFilter: facts.length, afterFilter: filteredFacts.length },
          'Filtered seen facts'
        );

        // Phase 2: If fewer than 15 facts remain, fetch 3 more queries
        if (filteredFacts.length < 15 && queries.length > 3) {
          app.logger.info(
            { currentFacts: filteredFacts.length },
            'Starting phase 2 with additional queries'
          );

          let phase2Papers: PaperMetadata[] = [];
          for (let i = 3; i < Math.min(6, queries.length); i++) {
            const query = queries[i];
            const fetchPromises = strategies.map((strategy) => strategy(query, 0, 10, app));

            const results = await Promise.allSettled(fetchPromises);
            for (const result of results) {
              if (result.status === 'fulfilled') {
                phase2Papers.push(...result.value);
              }
            }
          }

          // Combine and deduplicate all papers
          allPapers = deduplicateByTitle([...allPapers, ...phase2Papers]);
          app.logger.debug({ totalPapers: allPapers.length }, 'Phase 2 papers combined and deduplicated');

          // Extract more facts
          const phase2Facts = await extractFacts(allPapers, category, app);
          facts = phase2Facts;

          // Filter again
          filteredFacts = facts.filter((f) => !seenIdsSet.has(f.id));
          app.logger.info({ finalFactCount: filteredFacts.length }, 'Final facts after phase 2');
        }

        // Return up to 20 facts
        const resultFacts = filteredFacts.slice(0, 20);

        app.logger.info(
          { returnedCount: resultFacts.length, totalGenerated: facts.length },
          'Fun facts extraction completed'
        );

        return {
          facts: resultFacts,
          total: resultFacts.length,
        };
      } catch (error) {
        app.logger.error({ err: error, category }, 'Fun facts extraction failed');
        throw error;
      }
    }
  );
}

async function extractFacts(papers: PaperMetadata[], category: string, app: App): Promise<ResearchFact[]> {
  if (papers.length === 0) {
    app.logger.warn('No papers available for fact extraction');
    return [];
  }

  // Prepare papers for AI
  const studiesForAI = papers.slice(0, 40).map((paper) => ({
    title: paper.title,
    authors: paper.authors?.slice(0, 3).join(', ') || 'Unknown',
    year: paper.year,
    journal: paper.journal || 'Unknown',
    abstract: paper.abstract?.slice(0, 300) || '',
    url: buildStudyUrl(paper),
  }));

  const systemPrompt = `You are a science communicator extracting surprising, engaging research facts for a general audience. Extract ONLY valid JSON with no markdown. Return an array of facts with exactly these fields for each: id (slug from headline), headline (punchy, 8-12 words), body (2-3 sentences explaining why surprising), tag (category label), journal, year, url. Return: [{ id, headline, body, tag, journal, year, url }]`;

  const userPrompt = `Extract 20 surprising, counter-intuitive facts from these research papers. Category: ${category}\n\nPapers:\n${studiesForAI
    .map(
      (s) =>
        `- "${s.title}" by ${s.authors} (${s.year}), ${s.journal}\n  Abstract: ${s.abstract}`
    )
    .join('\n\n')}`;

  try {
    const { text } = await generateText({
      model: gateway('openai/gpt-4o-mini'),
      system: systemPrompt,
      prompt: userPrompt,
    });

    app.logger.debug({ responseLength: text.length }, 'Received AI response for facts');

    // Parse response, stripping markdown if needed
    let jsonText = text.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const factsList: ResearchFact[] = JSON.parse(jsonText);

    // Validate and ensure proper structure (only require essential fields)
    return factsList.filter(
      (f): f is ResearchFact =>
        typeof f.id === 'string' &&
        typeof f.headline === 'string' &&
        typeof f.body === 'string' &&
        (f.tag === undefined || typeof f.tag === 'string') &&
        (f.journal === undefined || typeof f.journal === 'string') &&
        (f.year === undefined || typeof f.year === 'number') &&
        (f.url === undefined || typeof f.url === 'string')
    );
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to extract facts from AI');
    return [];
  }
}

import type { FastifyInstance } from 'fastify';
import { generateText } from 'ai';
import { gateway } from '@specific-dev/framework';
import type { App } from '../index.js';
import type { PaperMetadata } from './validate-claim-utils.js';
import {
  fetchPubMedWithOffset,
  fetchSemanticScholarWithOffset,
} from './validate-claim.js';

interface MythAnalysis {
  id: string;
  claim: string;
  verdict: 'BUSTED' | 'CONFIRMED' | 'COMPLICATED';
  one_liner: string;
  explanation: string;
  studies: Array<{ title: string; journal: string; year: number; url: string }>;
}

interface CacheData {
  date: string;
  myths: MythAnalysis[];
}

const MYTHS = [
  'Seed oils cause inflammation and disease',
  'Breakfast is the most important meal of the day',
  'Eating fat makes you fat',
  'You need 8 glasses of water a day',
  'Carbohydrates are bad for you',
  'High protein diets damage your kidneys',
  'Eating late at night causes weight gain',
  'Detox diets cleanse your body',
  'Organic food is significantly more nutritious',
  'Gluten is harmful for everyone',
  'You need to eat every 2-3 hours to boost metabolism',
  'Red meat causes cancer',
  'Artificial sweeteners cause weight gain',
  'Vitamin C prevents colds',
  'Eating eggs raises your cholesterol dangerously',
  'Salt causes high blood pressure in everyone',
  'Dairy is essential for strong bones',
  'Superfoods have special health powers',
];

const EXTRA_MYTHS = [
  'Detox diets cleanse your liver',
  'Alkaline water improves your health',
  'Natural sugars are healthier than refined sugar',
  'Superfoods can prevent cancer',
  'Dairy causes mucus and congestion',
  'Raw vegetables are always healthier than cooked',
  'Eating cholesterol raises your blood cholesterol',
  'Fruit juice is a healthy alternative to whole fruit',
  'Low-fat foods are better for weight loss',
  'Eating breakfast speeds up your metabolism',
  'Brown sugar is healthier than white sugar',
  'You should drink eight glasses of water every day',
];

let cache: CacheData | null = null;

function getTodayKey(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function getCachedMyths(): MythAnalysis[] | null {
  if (!cache || cache.date !== getTodayKey()) {
    return null;
  }
  return cache.myths;
}

function setCachedMyths(myths: MythAnalysis[]): void {
  cache = {
    date: getTodayKey(),
    myths,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
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

async function analyzeMythWithAI(
  myth: string,
  papers: PaperMetadata[],
  app: App
): Promise<MythAnalysis> {
  try {
    app.logger.debug({ myth, paperCount: papers.length }, 'Analyzing myth');

    // Prepare papers data for AI
    const papersJson = JSON.stringify(
      papers.slice(0, 15).map((p) => ({
        title: p.title,
        authors: p.authors?.slice(0, 3).join(', ') || 'Unknown',
        year: p.year,
        journal: p.journal || 'Unknown',
        abstract: p.abstract?.slice(0, 300) || '',
        doi: p.doi,
        pmid: p.pmid,
        semanticScholarId: p.semanticScholarId,
      }))
    );

    // Call AI to analyze the myth
    const systemPrompt = `You are a nutrition scientist and evidence-based medicine expert. Analyze the provided research papers about the given nutrition claim. Return ONLY valid JSON with no markdown. Classify the claim as BUSTED (evidence clearly contradicts it), CONFIRMED (evidence clearly supports it), or COMPLICATED (evidence is mixed or context-dependent). Return: { verdict: 'BUSTED'|'CONFIRMED'|'COMPLICATED', one_liner: string (max 15 words, punchy), explanation: string (2-3 sentences, cite specific findings), studies: [{ title, journal, year, url }] (max 3 most relevant) }`;

    const userPrompt = `Myth: "${myth}"\n\nResearch papers:\n${papersJson}`;

    const { text } = await generateText({
      model: gateway('openai/gpt-4o-mini'),
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Parse response, stripping markdown if needed
    let jsonText = text.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const analysis = JSON.parse(jsonText);

    return {
      id: slugify(myth),
      claim: myth,
      verdict: analysis.verdict,
      one_liner: analysis.one_liner,
      explanation: analysis.explanation,
      studies: (analysis.studies || []).map((s: any) => ({
        title: s.title || '',
        journal: s.journal || 'Unknown',
        year: s.year || new Date().getFullYear(),
        url: s.url || '#',
      })),
    };
  } catch (error) {
    app.logger.error({ err: error, myth }, 'Failed to analyze myth');
    // Return fallback for this myth
    return {
      id: slugify(myth),
      claim: myth,
      verdict: 'COMPLICATED',
      one_liner: 'Evidence is mixed on this claim',
      explanation: 'Research on this topic is ongoing.',
      studies: [],
    };
  }
}

async function analyzeMultipleMyths(
  myths: string[],
  app: App
): Promise<MythAnalysis[]> {
  // Fetch papers for all myths in parallel
  const mythPaperPromises = myths.map((myth) =>
    Promise.allSettled([
      fetchPubMedWithOffset(myth, 0, 8, app),
      fetchSemanticScholarWithOffset(myth, 0, 8, app),
    ])
  );

  const allMythPapers = await Promise.all(mythPaperPromises);

  // Analyze each myth with AI in parallel
  const mythAnalysisPromises = myths.map((myth, index) => {
    return (async () => {
      // Combine papers from both sources
      const papers: PaperMetadata[] = [];
      const results = allMythPapers[index];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          papers.push(...result.value);
        }
      }

      return analyzeMythWithAI(myth, papers, app);
    })();
  });

  const results = await Promise.allSettled(mythAnalysisPromises);

  // Extract successful results
  return results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((r): r is MythAnalysis => r !== null);
}

export function register(app: App, fastify: FastifyInstance) {
  fastify.get('/api/nutrition-myths', {
    schema: {
      description: 'Get analyzed nutrition myths with research evidence',
      tags: ['nutrition'],
      response: {
        200: {
          description: 'Array of analyzed nutrition myths',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              claim: { type: 'string' },
              verdict: { type: 'string', enum: ['BUSTED', 'CONFIRMED', 'COMPLICATED'] },
              one_liner: { type: 'string' },
              explanation: { type: 'string' },
              studies: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    journal: { type: 'string' },
                    year: { type: 'number' },
                    url: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (): Promise<MythAnalysis[]> => {
    app.logger.info({ mythCount: MYTHS.length }, 'Fetching nutrition myths');

    // Return cached results if available
    const cachedMyths = getCachedMyths();
    if (cachedMyths !== null) {
      app.logger.debug({ mythCount: cachedMyths.length }, 'Returning cached nutrition myths');
      return cachedMyths;
    }

    try {
      const analyzedMyths = await analyzeMultipleMyths(MYTHS, app);

      // Cache the results
      setCachedMyths(analyzedMyths);

      app.logger.info({ mythCount: analyzedMyths.length }, 'Nutrition myths analysis completed');
      return analyzedMyths;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch nutrition myths');
      throw error;
    }
  });

  fastify.post('/api/nutrition-myths/refresh', {
    schema: {
      description: 'Analyze additional myths and merge with existing cache',
      tags: ['nutrition'],
      response: {
        200: {
          description: 'Updated myths list after refresh',
          type: 'object',
          properties: {
            myths: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  claim: { type: 'string' },
                  verdict: { type: 'string', enum: ['BUSTED', 'CONFIRMED', 'COMPLICATED'] },
                  one_liner: { type: 'string' },
                  explanation: { type: 'string' },
                  studies: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        journal: { type: 'string' },
                        year: { type: 'number' },
                        url: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            total: { type: 'number' },
            newCount: { type: 'number' },
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
  }, async () => {
    app.logger.info({ extraMythCount: EXTRA_MYTHS.length }, 'Starting myths refresh');

    try {
      // Get current cache or initialize empty
      let currentMyths = getCachedMyths() || [];
      const existingIds = new Set(currentMyths.map((m) => m.id));

      // Analyze extra myths
      const extraMythsAnalyzed = await analyzeMultipleMyths(EXTRA_MYTHS, app);
      app.logger.info({ analyzedCount: extraMythsAnalyzed.length }, 'Extra myths analyzed');

      // Filter out duplicates (by id) and merge
      const newMyths = extraMythsAnalyzed.filter((m) => !existingIds.has(m.id));
      app.logger.info(
        { newCount: newMyths.length, duplicateCount: extraMythsAnalyzed.length - newMyths.length },
        'Deduplication complete'
      );

      const mergedMyths = [...currentMyths, ...newMyths];

      // Update cache with merged list
      setCachedMyths(mergedMyths);

      app.logger.info(
        { totalCount: mergedMyths.length, newCount: newMyths.length },
        'Myths refresh completed'
      );

      return {
        myths: mergedMyths,
        total: mergedMyths.length,
        newCount: newMyths.length,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Myths refresh failed');
      throw error;
    }
  });
}

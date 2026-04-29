import type { FastifyInstance } from 'fastify';
import { generateText } from 'ai';
import { gateway } from '@specific-dev/framework';
import type { App } from '../index.js';
import type { PaperMetadata } from './validate-claim-utils.js';
import {
  fetchPubMedWithOffset,
  fetchSemanticScholarWithOffset,
} from './validate-claim.js';

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

let mythsCache: any[] | null = null;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
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
  }, async (): Promise<any[]> => {
    app.logger.info({ mythCount: MYTHS.length }, 'Fetching nutrition myths');

    // Return cached results if available
    if (mythsCache !== null) {
      app.logger.debug('Returning cached nutrition myths');
      return mythsCache;
    }

    try {
      // Fetch papers for all myths in parallel (36 fetches total)
      const mythPaperPromises = MYTHS.map((myth) =>
        Promise.allSettled([
          fetchPubMedWithOffset(myth, 0, 8, app),
          fetchSemanticScholarWithOffset(myth, 0, 8, app),
        ])
      );

      const allMythPapers = await Promise.all(mythPaperPromises);

      // Analyze each myth with AI in parallel
      const mythAnalysisPromises = MYTHS.map((myth, index) => {
        return (async () => {
          try {
            // Combine papers from both sources
            const papers: PaperMetadata[] = [];
            const results = allMythPapers[index];

            for (const result of results) {
              if (result.status === 'fulfilled') {
                papers.push(...result.value);
              }
            }

            app.logger.debug({ myth, paperCount: papers.length }, 'Analyzing myth');

            // Prepare papers data for AI
            const papersJson = JSON.stringify(
              papers.slice(0, 15).map((p) => ({
                title: p.title,
                authors: p.authors?.slice(0, 3).join(', ') || 'Unknown',
                year: p.year,
                journal: p.journal || 'Unknown',
                abstract: p.abstract?.slice(0, 300) || '',
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
              studies: analysis.studies || [],
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
        })();
      });

      const results = await Promise.allSettled(mythAnalysisPromises);

      // Extract successful results
      const analyzedMyths = results
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter((r) => r !== null);

      // Cache the results
      mythsCache = analyzedMyths;

      app.logger.info({ mythCount: analyzedMyths.length }, 'Nutrition myths analysis completed');
      return analyzedMyths;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch nutrition myths');
      throw error;
    }
  });
}

import { gateway } from '@specific-dev/framework';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { App } from '../index.js';

export interface PaperMetadata {
  title: string;
  authors: string[];
  year?: number;
  journal?: string;
  doi?: string;
  pmid?: string;
  semanticScholarId?: string;
  abstract?: string;
  citationCount?: number;
  isPeerReviewed?: boolean;
}

export const paperClassificationSchema = z.object({
  papers: z.array(
    z.object({
      index: z.number(),
      stance: z.enum(['supports', 'refutes', 'neutral']),
      key_finding: z.string(),
      quote: z.string(),
    })
  ),
  summary: z.string(),
});

export type AIClassification = z.infer<typeof paperClassificationSchema>;

export function getRecencyScore(year?: number): number {
  if (!year) return 0.5;

  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  if (age <= 5) return 1.0;
  if (age <= 10) return 0.8;
  if (age <= 15) return 0.6;
  if (age <= 20) return 0.45;
  return 0.3;
}

export function getCitationScore(citationCount: number): number {
  if (citationCount >= 500) return 1.0;
  if (citationCount >= 200) return 0.9;
  if (citationCount >= 50) return 0.75;
  if (citationCount >= 10) return 0.6;
  if (citationCount >= 1) return 0.5;
  return 0.4;
}

export function getVenuePrestige(journal: string): number {
  const journalLower = (journal || '').toLowerCase();

  const topTierKeywords = [
    'nature',
    'science',
    'new england journal',
    'nejm',
    'lancet',
    'jama',
    'cell',
    'bmj',
    'pnas',
    'plos medicine',
    'annals of internal medicine',
    'cochrane',
  ];

  const highQualityKeywords = [
    'journal of',
    'american journal',
    'european journal',
    'international journal',
    'frontiers in',
    'plos one',
    'scientific reports',
  ];

  const preprintKeywords = ['arxiv', 'biorxiv', 'medrxiv', 'ssrn', 'researchgate'];

  for (const keyword of topTierKeywords) {
    if (journalLower.includes(keyword)) return 1.0;
  }

  for (const keyword of highQualityKeywords) {
    if (journalLower.includes(keyword)) return 0.8;
  }

  for (const keyword of preprintKeywords) {
    if (journalLower.includes(keyword)) return 0.55;
  }

  return !journal ? 0.5 : 0.7;
}

export function getPublicationTypeScore(title: string, abstract: string): number {
  const text = (title + ' ' + abstract).toLowerCase();

  if (
    text.includes('meta-analysis') ||
    text.includes('systematic review') ||
    text.includes('randomized controlled trial')
  ) {
    return 1.0;
  }

  if (text.includes('cohort study') || text.includes('clinical trial') || text.includes('prospective study')) {
    return 0.9;
  }

  return 0.8;
}

export function getAuthorCountScore(authors: string[]): number {
  const count = authors.length;
  if (count >= 5) return 1.0;
  if (count >= 3) return 0.95;
  return 0.85;
}

export function computePaperWeight(paper: PaperMetadata): number {
  const recency = getRecencyScore(paper.year);
  const citations = getCitationScore(paper.citationCount || 0);
  const prestige = getVenuePrestige(paper.journal || '');
  const pubType = getPublicationTypeScore(paper.title, paper.abstract || '');
  const authors = getAuthorCountScore(paper.authors);

  let raw = recency * 0.3 + citations * 0.25 + prestige * 0.25 + pubType * 0.12 + authors * 0.08;

  // Sanity clamp 1: Low-quality old papers
  if ((paper.citationCount || 0) === 0 && prestige === 0.5 && (paper.year || 2000) < 2010) {
    raw = Math.min(raw, 0.35);
  }

  // Sanity clamp 2: High-citation meta-analyses
  const text = (paper.title + ' ' + (paper.abstract || '')).toLowerCase();
  if (
    (text.includes('cochrane') || (text.includes('meta-analysis') && prestige === 1.0)) &&
    (paper.citationCount || 0) > 100
  ) {
    raw = Math.max(raw, 0.8);
  }

  // Final clamp
  const weight = Math.max(0, Math.min(raw, 1.0));
  return Math.round(weight * 100) / 100;
}

export async function classifyPapersWithAI(
  claim: string,
  papers: PaperMetadata[],
  app: App
): Promise<AIClassification | null> {
  try {
    app.logger.debug({ paperCount: papers.length }, 'Starting AI paper classification');

    const paperTexts = papers
      .map(
        (paper, index) =>
          `Paper ${index}: Title: ${paper.title}\nAbstract: ${paper.abstract || 'No abstract available'}`
      )
      .join('\n\n');

    const systemPrompt = `You are a scientific evidence classifier. Analyze each paper's stance toward the given claim and provide a concise summary of the overall evidence. For each paper, determine if it supports, refutes, or is neutral toward the claim.`;

    const userPrompt = `Claim: "${claim}"

Papers to classify:
${paperTexts}

For each paper (indexed 0 through ${papers.length - 1}), return a JSON object with:
- index: the paper's index number (0 to ${papers.length - 1})
- stance: "supports", "refutes", or "neutral"
- key_finding: 1-2 sentence summary of the relevant finding
- quote: A short quote or paraphrase from the abstract

Also provide an overall 2-3 sentence summary of what the evidence collectively suggests about the claim.`;

    const { object } = await generateObject({
      model: gateway('openai/gpt-4o-mini'),
      schema: paperClassificationSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    app.logger.debug({ paperCount: object.papers.length }, 'AI classification completed');

    return object;
  } catch (error) {
    app.logger.error({ err: error }, 'AI classification failed');
    return null;
  }
}

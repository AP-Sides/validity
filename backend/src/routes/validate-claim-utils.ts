import { gateway } from '@specific-dev/framework';
import { generateObject, generateText } from 'ai';
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

export const STANCE_CLASSIFICATION_SYSTEM_PROMPT = `You are a critical medical and scientific analyst with deep knowledge of established consensus across medicine, biology, physics, chemistry, psychology, and other sciences.

Before evaluating any paper, first assess whether the claim aligns with established scientific or medical consensus (e.g. textbook knowledge, clinical guidelines, widely accepted mechanisms).

If the claim is well-established in practice (e.g. "aortic stenosis causes systolic murmur", "smoking causes lung cancer", "exercise improves cardiovascular health"), treat this prior knowledge as strong evidence SUPPORTING the claim, and only classify a paper as "refutes" if it presents direct contradictory evidence with a clear mechanistic explanation.

Do NOT classify a paper as "neutral" simply because it doesn't explicitly prove 100% causation — if the claim is consistent with established consensus and the paper is broadly consistent, classify it as "supports".

Stance classification rules:
- "supports": paper findings are consistent with the claim, OR the claim is established consensus and the paper does not contradict it
- "refutes": paper presents direct evidence AGAINST the claim with a clear mechanistic or statistical basis
- "neutral": paper is genuinely tangential, inconclusive, or studies a different population/context where the claim doesn't apply`;

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
      system: STANCE_CLASSIFICATION_SYSTEM_PROMPT,
      prompt: userPrompt,
    });

    app.logger.debug({ paperCount: object.papers.length }, 'AI classification completed');

    return object;
  } catch (error) {
    app.logger.error({ err: error }, 'AI classification failed');
    return null;
  }
}

export const FINAL_VERDICT_SYSTEM_PROMPT = `You are a senior research analyst and clinician with expertise across medical and scientific domains.

Step 1 — Consensus check: Before reading the papers, assess whether this claim is consistent with established scientific or medical consensus. State your prior assessment explicitly (e.g. "This claim is well-established in cardiology: aortic stenosis classically produces a systolic ejection murmur due to turbulent flow across the stenotic valve.").

Step 2 — Paper analysis: Now evaluate the papers provided. Weight them according to their quality scores. Note any papers that contradict the consensus and explain why.

Step 3 — Critical synthesis: Combine your consensus prior with the paper evidence. If the papers are broadly consistent with consensus, the verdict should reflect that. Only override consensus if multiple high-quality papers (weight > 0.7) directly contradict it.

For the critical analysis output:
- "consensus_view": Start with what is established in the field, then describe what the papers show. Be direct — if something is clinically true, say so. Avoid false balance.
- "critical_caveats": Note genuine nuances, edge cases, population-specific exceptions, or methodological limitations. Do NOT manufacture doubt about well-established facts.
- "verdict": Should be VALID if the claim is consistent with established consensus AND the weighted paper evidence supports it (even partially). INVALID only if consensus AND papers both contradict the claim. INCONCLUSIVE only for genuinely contested or novel claims with no clear consensus.

Avoid epistemic cowardice — do not hedge on things that are well-known to be true.`;

export interface FinalVerdictAnalysis {
  consensus_view: string;
  critical_caveats: string;
  summary: string;
}

export async function generateFinalVerdictSummary(
  claim: string,
  papersWithStance: Array<{
    title: string;
    key_finding: string;
    stance: 'supports' | 'refutes' | 'neutral';
    weight: number;
  }>,
  app: App
): Promise<FinalVerdictAnalysis | null> {
  try {
    app.logger.debug({ paperCount: papersWithStance.length }, 'Generating final verdict summary');

    const papersDescription = papersWithStance
      .map((p) => `- Title: ${p.title}\n  Finding: ${p.key_finding}\n  Stance: ${p.stance} (weight: ${p.weight})`)
      .join('\n\n');

    const userPrompt = `Claim: "${claim}"

Papers analyzed (with quality weights):
${papersDescription}

Please provide:
1. consensus_view: What is established in the field, then what the papers show
2. critical_caveats: Genuine nuances, edge cases, or methodological limitations
3. summary: A 3-4 sentence synthesis combining consensus with paper evidence`;

    const { text } = await generateText({
      model: gateway('openai/gpt-4o-mini'),
      system: FINAL_VERDICT_SYSTEM_PROMPT,
      prompt: userPrompt,
    });

    // Parse the response to extract the three sections
    const consensusMatch = text.match(/consensus_view[:\s]+([^\n]+(?:\n(?!critical_caveats|summary)[^\n]+)*)/i);
    const caviatsMatch = text.match(/critical_caveats[:\s]+([^\n]+(?:\n(?!summary|consensus_view)[^\n]+)*)/i);
    const summaryMatch = text.match(/summary[:\s]+([^\n]+(?:\n(?!consensus_view|critical_caveats)[^\n]+)*)/i);

    const result: FinalVerdictAnalysis = {
      consensus_view: consensusMatch ? consensusMatch[1].trim() : text,
      critical_caveats: caviatsMatch ? caviatsMatch[1].trim() : '',
      summary: summaryMatch ? summaryMatch[1].trim() : text,
    };

    app.logger.debug('Final verdict summary generated successfully');
    return result;
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to generate final verdict summary');
    return null;
  }
}

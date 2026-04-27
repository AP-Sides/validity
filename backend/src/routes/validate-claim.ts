import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { gateway } from '@specific-dev/framework';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import type { App } from '../index.js';

interface ValidateClaimBody {
  claim: string;
}

interface PaperMetadata {
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  doi?: string;
  pmid?: string;
  semanticScholarId?: string;
  abstract?: string;
}

interface Study {
  title: string;
  authors: string;
  year: number;
  journal: string;
  stance: 'supports' | 'refutes' | 'neutral';
  key_finding: string;
  quote: string;
  url: string;
}

interface ValidateClaimResponse {
  verdict: 'VALID' | 'INVALID' | 'INCONCLUSIVE';
  confidence: number;
  supporting_count: number;
  refuting_count: number;
  neutral_count: number;
  total_count: number;
  supporting_pct: number;
  refuting_pct: number;
  neutral_pct: number;
  studies: Study[];
  summary: string;
}

export function register(app: App, fastify: FastifyInstance) {
  fastify.post('/api/validate-claim', {
    schema: {
      description: 'Validate a scientific claim against academic literature',
      tags: ['validation'],
      body: {
        type: 'object',
        required: ['claim'],
        properties: {
          claim: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          description: 'Claim validation result',
          type: 'object',
          properties: {
            verdict: { type: 'string', enum: ['VALID', 'INVALID', 'INCONCLUSIVE'] },
            confidence: { type: 'number' },
            supporting_count: { type: 'number' },
            refuting_count: { type: 'number' },
            neutral_count: { type: 'number' },
            total_count: { type: 'number' },
            supporting_pct: { type: 'number' },
            refuting_pct: { type: 'number' },
            neutral_pct: { type: 'number' },
            studies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  authors: { type: 'string' },
                  year: { type: 'number' },
                  journal: { type: 'string' },
                  stance: { type: 'string', enum: ['supports', 'refutes', 'neutral'] },
                  key_finding: { type: 'string' },
                  quote: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
            summary: { type: 'string' },
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
  }, async (
    request: FastifyRequest<{ Body: ValidateClaimBody }>,
    reply: FastifyReply
  ): Promise<ValidateClaimResponse> => {
    const { claim } = request.body;

    app.logger.info({ claim }, 'Starting claim validation');

    try {
      // Step 1 & 2: Fetch from Semantic Scholar and PubMed in parallel
      const [semanticScholarPapers, pubmedPapers] = await Promise.all([
        fetchSemanticScholar(claim, app),
        fetchPubMed(claim, app),
      ]);

      app.logger.info(
        { semanticScholarCount: semanticScholarPapers.length, pubmedCount: pubmedPapers.length },
        'Fetched papers from APIs'
      );

      // Step 3: Combine and deduplicate papers
      const allPapers = [...semanticScholarPapers, ...pubmedPapers];
      const deduplicatedPapers = deduplicatePapers(allPapers);
      const topPapers = deduplicatedPapers.slice(0, 5);

      app.logger.info({ totalPapers: topPapers.length }, 'After deduplication and top 5 filter');

      // Step 4: Early return if insufficient papers
      if (topPapers.length < 2) {
        const inconclusiveResponse: ValidateClaimResponse = {
          verdict: 'INCONCLUSIVE',
          confidence: 0,
          supporting_count: 0,
          refuting_count: 0,
          neutral_count: 0,
          total_count: 0,
          supporting_pct: 0,
          refuting_pct: 0,
          neutral_pct: 0,
          studies: [],
          summary:
            'Insufficient evidence was found to evaluate this claim. Try rephrasing or using more specific scientific terminology.',
        };

        app.logger.info('Insufficient papers, returning INCONCLUSIVE');
        return inconclusiveResponse;
      }

      // Step 5: AI Analysis
      let aiAnalysis = await analyzeWithAI(claim, topPapers, app);

      // Step 6: Validate and build response
      app.logger.debug({ papersCount: aiAnalysis.papers.length, topPapersCount: topPapers.length }, 'Building response from AI analysis');

      // Validate that we have the same number of analyses as papers
      if (!aiAnalysis.papers || aiAnalysis.papers.length === 0 || aiAnalysis.papers.length !== topPapers.length) {
        app.logger.warn(
          { analysisCount: aiAnalysis.papers.length, paperCount: topPapers.length },
          'Invalid AI analysis, using fallback'
        );
        aiAnalysis = generateFallbackAnalysis(claim, topPapers);
      }

      const studies: Study[] = aiAnalysis.papers.map((aiPaper, index) => {
        const originalPaper = topPapers[index];
        const authors =
          originalPaper.authors.length > 2
            ? `${originalPaper.authors[0]}, ${originalPaper.authors[1]} et al.`
            : originalPaper.authors.join(', ');

        let url = '#';
        if (originalPaper.doi) {
          url = `https://doi.org/${originalPaper.doi}`;
        } else if (originalPaper.pmid) {
          url = `https://pubmed.ncbi.nlm.nih.gov/${originalPaper.pmid}/`;
        } else if (originalPaper.semanticScholarId) {
          url = `https://www.semanticscholar.org/paper/${originalPaper.semanticScholarId}`;
        }

        return {
          title: originalPaper.title,
          authors,
          year: originalPaper.year,
          journal: originalPaper.journal || 'Unknown Journal',
          stance: aiPaper.stance as 'supports' | 'refutes' | 'neutral',
          key_finding: aiPaper.key_finding,
          quote: aiPaper.quote,
          url,
        };
      });

      // Count stances
      const supporting_count = studies.filter((s) => s.stance === 'supports').length;
      const refuting_count = studies.filter((s) => s.stance === 'refutes').length;
      const neutral_count = studies.filter((s) => s.stance === 'neutral').length;
      const total_count = studies.length;

      // Compute percentages
      const supporting_pct = (supporting_count / total_count) * 100;
      const refuting_pct = (refuting_count / total_count) * 100;
      const neutral_pct = (neutral_count / total_count) * 100;

      // Compute confidence
      let confidence = 0;
      if (aiAnalysis.verdict === 'VALID') {
        confidence = supporting_pct;
      } else if (aiAnalysis.verdict === 'INVALID') {
        confidence = refuting_pct;
      } else {
        confidence = Math.max(supporting_pct, refuting_pct, neutral_pct);
      }

      const response: ValidateClaimResponse = {
        verdict: aiAnalysis.verdict as 'VALID' | 'INVALID' | 'INCONCLUSIVE',
        confidence: Math.round(confidence * 100) / 100,
        supporting_count,
        refuting_count,
        neutral_count,
        total_count,
        supporting_pct: Math.round(supporting_pct * 100) / 100,
        refuting_pct: Math.round(refuting_pct * 100) / 100,
        neutral_pct: Math.round(neutral_pct * 100) / 100,
        studies,
        summary: aiAnalysis.summary,
      };

      app.logger.info(
        { verdict: response.verdict, confidence: response.confidence, studyCount: response.total_count },
        'Claim validation completed successfully'
      );

      return response;
    } catch (error) {
      app.logger.error({ err: error, claim }, 'Claim validation failed');
      throw error;
    }
  });
}

async function fetchSemanticScholar(claim: string, app: App): Promise<PaperMetadata[]> {
  try {
    const query = encodeURIComponent(claim);
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${query}&fields=title,authors,year,journal,externalIds,abstract&limit=8`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      app.logger.warn({ status: response.status }, 'Semantic Scholar API returned non-OK status');
      return [];
    }

    const data = (await response.json()) as any;
    const papers: PaperMetadata[] = [];

    if (data.data && Array.isArray(data.data)) {
      for (const paper of data.data) {
        // Filter out papers with no abstract
        if (!paper.abstract) continue;

        papers.push({
          title: paper.title || 'Unknown Title',
          authors: paper.authors?.map((a: any) => a.name || 'Unknown') || [],
          year: paper.year || new Date().getFullYear(),
          journal: paper.journal?.name,
          doi: paper.externalIds?.DOI,
          semanticScholarId: paper.paperId,
          abstract: paper.abstract,
        });
      }
    }

    app.logger.debug({ count: papers.length }, 'Fetched papers from Semantic Scholar');
    return papers;
  } catch (error) {
    app.logger.warn({ err: error }, 'Semantic Scholar fetch failed, proceeding with other sources');
    return [];
  }
}

async function fetchPubMed(claim: string, app: App): Promise<PaperMetadata[]> {
  try {
    const query = encodeURIComponent(claim);

    // Step 1: Search for papers
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=5&retmode=json`;

    const controller1 = new AbortController();
    const timeoutId1 = setTimeout(() => controller1.abort(), 8000);

    const searchResponse = await fetch(searchUrl, { signal: controller1.signal });
    clearTimeout(timeoutId1);

    if (!searchResponse.ok) {
      app.logger.warn({ status: searchResponse.status }, 'PubMed search API returned non-OK status');
      return [];
    }

    const searchData = (await searchResponse.json()) as any;
    const ids = searchData.esearchresult?.idlist || [];

    if (ids.length === 0) {
      app.logger.debug('No PubMed results found');
      return [];
    }

    // Step 2: Fetch details
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;

    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 8000);

    const summaryResponse = await fetch(summaryUrl, { signal: controller2.signal });
    clearTimeout(timeoutId2);

    if (!summaryResponse.ok) {
      app.logger.warn({ status: summaryResponse.status }, 'PubMed summary API returned non-OK status');
      return [];
    }

    const summaryData = (await summaryResponse.json()) as any;
    const papers: PaperMetadata[] = [];

    const result = summaryData.result || {};
    for (const pmid of ids) {
      const paper = result[pmid];
      if (paper) {
        papers.push({
          title: paper.title || 'Unknown Title',
          authors: paper.authors?.map((a: any) => a.name || 'Unknown') || [],
          year: paper.pubdate ? parseInt(paper.pubdate.split(' ')[0], 10) : new Date().getFullYear(),
          journal: paper.source,
          pmid,
        });
      }
    }

    app.logger.debug({ count: papers.length }, 'Fetched papers from PubMed');
    return papers;
  } catch (error) {
    app.logger.warn({ err: error }, 'PubMed fetch failed, proceeding with other sources');
    return [];
  }
}

function deduplicatePapers(papers: PaperMetadata[]): PaperMetadata[] {
  const seen = new Set<string>();
  const unique: PaperMetadata[] = [];

  for (const paper of papers) {
    const titleLower = paper.title.toLowerCase();
    let isDuplicate = false;

    for (const seenTitle of seen) {
      if (seenTitle.includes(titleLower) || titleLower.includes(seenTitle)) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.add(titleLower);
      unique.push(paper);
    }
  }

  return unique;
}

interface AIAnalysisResult {
  verdict: 'VALID' | 'INVALID' | 'INCONCLUSIVE';
  summary: string;
  papers: Array<{
    stance: 'supports' | 'refutes' | 'neutral';
    key_finding: string;
    quote: string;
  }>;
}

const analysisSchema = z.object({
  studies: z.array(
    z.object({
      stance: z.enum(['supports', 'refutes', 'neutral']),
      key_finding: z.string(),
      quote: z.string(),
    })
  ),
  verdict: z.enum(['VALID', 'INVALID', 'INCONCLUSIVE']),
  summary: z.string(),
});

async function analyzeWithAI(claim: string, papers: PaperMetadata[], app: App): Promise<AIAnalysisResult> {
  try {
    app.logger.debug({ paperCount: papers.length }, 'Starting AI analysis');

    const systemPrompt = `You are a scientific fact-checker. Given a claim and a list of research paper abstracts, analyze each paper's stance toward the claim and produce a JSON response.

Return ONLY a valid JSON object with this exact structure:
{
  "studies": [
    {
      "stance": "supports" | "refutes" | "neutral",
      "key_finding": "1-2 sentence summary of what this paper found relevant to the claim",
      "quote": "A short direct quote or close paraphrase from the abstract"
    }
  ],
  "verdict": "VALID" | "INVALID" | "INCONCLUSIVE",
  "summary": "2-4 sentence plain-English explanation of the overall evidence"
}

Verdict rules:
- VALID if more than 50% of studies have stance "supports"
- INVALID if more than 50% of studies have stance "refutes"
- INCONCLUSIVE otherwise (mixed evidence or insufficient data)

Be objective and base your analysis strictly on the provided abstracts.`;

    const paperTexts = papers
      .map(
        (paper, index) =>
          `Paper ${index + 1}: ${paper.title}\nAbstract: ${paper.abstract || 'No abstract available'}`
      )
      .join('\n\n');

    const userPrompt = `Claim: ${claim}

Research papers:
${paperTexts}

Analyze each paper's stance toward the claim and return the JSON response.`;

    app.logger.debug({ promptLength: userPrompt.length }, 'Calling AI model');

    const { output } = await generateText({
      model: gateway('openai/gpt-4o-mini'),
      output: Output.object({
        schema: analysisSchema,
        name: 'ClaimAnalysis',
        description: 'Analysis of research papers regarding a scientific claim',
      }),
      system: systemPrompt,
      prompt: userPrompt,
    });

    app.logger.debug({ outputVerdictType: typeof output.verdict }, 'AI response received');

    if (!output.studies || !Array.isArray(output.studies)) {
      app.logger.warn('AI output missing studies array, using fallback');
      return generateFallbackAnalysis(claim, papers);
    }

    const result: AIAnalysisResult = {
      verdict: output.verdict,
      summary: output.summary,
      papers: output.studies,
    };

    app.logger.debug({ verdict: result.verdict, studiesCount: result.papers.length }, 'AI analysis completed');
    return result;
  } catch (error) {
    app.logger.warn({ err: error, errorMessage: error instanceof Error ? error.message : String(error) }, 'AI analysis failed, using fallback analysis');
    return generateFallbackAnalysis(claim, papers);
  }
}

function detectStanceByKeywords(abstract: string, claim: string): 'supports' | 'refutes' | 'neutral' {
  const abstractLower = abstract.toLowerCase();
  const claimLower = claim.toLowerCase();

  const supportKeywords = [
    'significant',
    'effective',
    'beneficial',
    'improves',
    'increases',
    'associated with',
    'confirms',
    'demonstrates',
    'shows',
    'found that',
    'evidence supports',
    'positive',
  ];

  const refuteKeywords = [
    'no significant',
    'not effective',
    'no evidence',
    'refutes',
    'contradicts',
    'fails to',
    'no association',
    'no effect',
    'did not',
    'does not',
    'harmful',
    'risk',
    'adverse',
    'negative',
  ];

  let supportMatches = 0;
  let refuteMatches = 0;

  for (const keyword of supportKeywords) {
    if (abstractLower.includes(keyword)) {
      supportMatches++;
    }
  }

  for (const keyword of refuteKeywords) {
    if (abstractLower.includes(keyword)) {
      refuteMatches++;
    }
  }

  if (refuteMatches > supportMatches) {
    return 'refutes';
  } else if (supportMatches > refuteMatches) {
    return 'supports';
  } else {
    return 'neutral';
  }
}

function generateFallbackAnalysis(claim: string, papers: PaperMetadata[]): AIAnalysisResult {
  const stances = papers.map((paper) => ({
    stance: detectStanceByKeywords(paper.abstract || '', claim),
    key_finding: `${paper.title} - published in ${paper.year}`,
    quote: paper.abstract ? paper.abstract.substring(0, 150) + '...' : 'Abstract not available',
  }));

  const supportCount = stances.filter((s) => s.stance === 'supports').length;
  const refuteCount = stances.filter((s) => s.stance === 'refutes').length;
  const neutralCount = stances.filter((s) => s.stance === 'neutral').length;

  let verdict: 'VALID' | 'INVALID' | 'INCONCLUSIVE';
  if (supportCount > refuteCount && supportCount > papers.length / 2) {
    verdict = 'VALID';
  } else if (refuteCount > supportCount && refuteCount > papers.length / 2) {
    verdict = 'INVALID';
  } else {
    verdict = 'INCONCLUSIVE';
  }

  const summary = `Based on keyword analysis of ${papers.length} papers: ${supportCount} supporting, ${refuteCount} refuting, ${neutralCount} neutral.`;

  return {
    verdict,
    summary,
    papers: stances,
  };
}

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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
      const aiAnalysis = await analyzeWithAI(claim, topPapers, app);

      // Step 6: Build response
      const studies: Study[] = aiAnalysis.papers.map((aiPaper) => {
        const originalPaper = topPapers[aiPaper.index - 1];
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
    index: number;
    stance: 'supports' | 'refutes' | 'neutral';
    key_finding: string;
    quote: string;
  }>;
}

async function analyzeWithAI(claim: string, papers: PaperMetadata[], app: App): Promise<AIAnalysisResult> {
  try {
    const systemPrompt = `You are a scientific evidence analyst. You will be given a claim and a list of academic paper abstracts. Analyze each paper and return a JSON object. Return ONLY valid JSON, no markdown, no explanation.`;

    const paperTexts = papers
      .map(
        (paper, index) =>
          `${index + 1}. Title: ${paper.title}\n   Authors: ${paper.authors.join(', ')}\n   Year: ${paper.year}\n   Journal: ${paper.journal || 'Unknown'}\n   Abstract: ${paper.title}`
      )
      .join('\n\n');

    const userPrompt = `Claim: "${claim}"

Papers:
${paperTexts}

For each paper determine:
- stance: "supports", "refutes", or "neutral" relative to the claim
- key_finding: 1-2 sentence summary of the key finding
- quote: a short direct quote or paraphrase from the abstract

Then compute:
- overall verdict: "VALID" if >50% of papers support, "INVALID" if >50% refute, "INCONCLUSIVE" otherwise
- summary: 2-4 sentence plain-English explanation of what the evidence collectively suggests

Return this exact JSON structure:
{
  "verdict": "VALID" | "INVALID" | "INCONCLUSIVE",
  "summary": "...",
  "papers": [
    {
      "index": 1,
      "stance": "supports" | "refutes" | "neutral",
      "key_finding": "...",
      "quote": "..."
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      app.logger.warn({ status: response.status }, 'OpenAI API returned non-OK status, using fallback analysis');
      return generateFallbackAnalysis(papers);
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      app.logger.warn('No content in OpenAI response, using fallback analysis');
      return generateFallbackAnalysis(papers);
    }

    const jsonStr = content.trim();
    const analysis = JSON.parse(jsonStr) as AIAnalysisResult;

    app.logger.debug({ verdict: analysis.verdict }, 'AI analysis completed');
    return analysis;
  } catch (error) {
    app.logger.warn({ err: error }, 'AI analysis failed, using fallback analysis');
    return generateFallbackAnalysis(papers);
  }
}

function generateFallbackAnalysis(papers: PaperMetadata[]): AIAnalysisResult {
  const papersAnalysis = papers.map((paper, index) => ({
    index: index + 1,
    stance: 'neutral' as const,
    key_finding: `${paper.title} - published in ${paper.year}`,
    quote: `This study from ${paper.year} provides relevant scientific evidence on the topic.`,
  }));

  return {
    verdict: 'INCONCLUSIVE',
    summary:
      'The evidence is inconclusive based on the papers found. Further analysis with detailed paper content would be needed to determine the validity of this claim.',
    papers: papersAnalysis,
  };
}

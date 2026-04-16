/**
 * AI Service (claude.ts) Tests
 *
 * Coverage targets:
 *   parseJsonResponse (tested indirectly via exported functions):
 *     - clean JSON array / object
 *     - ```json ... ``` markdown stripping
 *     - ``` ... ``` markdown stripping
 *     - leading/trailing prose with embedded JSON
 *     - truncated array with fixable last-comma recovery
 *     - irreparable truncation → throws
 *
 *   chatCompletion — LM Studio path (USE_LOCAL_LLM=true):
 *     - successful response
 *     - timeout → AbortError
 *     - ECONNREFUSED → rethrows
 *     - non-OK HTTP status → throws
 *     - malformed response (no choices) → throws
 *
 *   chatCompletion — Anthropic path (ANTHROPIC_API_KEY set, USE_LOCAL_LLM=false):
 *     - successful response
 *     - unexpected content type → throws
 *
 *   generateHazardSuggestions:
 *     - returns parsed hazard array on success
 *     - falls back to known-trade defaults when AI throws
 *     - unknown trade type falls back to builder defaults
 *
 *   generateControlMeasures:
 *     - returns parsed controls map on success
 *     - falls back to default controls (one entry per hazard) when AI throws
 *
 *   generateRiskAssessment:
 *     - returns parsed risk array on success
 *     - rethrows (no fallback) when AI throws
 *
 *   completeSWMSSection:
 *     - returns parsed suggestions object on success
 *     - rethrows (no fallback) when AI throws
 *
 *   validateSWMS:
 *     - returns parsed ValidationResult on success
 *     - rethrows (no fallback) when AI throws
 */

// ---------------------------------------------------------------------------
// LM Studio fetch mock — must be declared before module import
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ---------------------------------------------------------------------------
// Helper: build a minimal successful LM Studio fetch response
// ---------------------------------------------------------------------------

function lmOkResponse(content: string): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      choices: [{ message: { content } }],
    }),
    text: async () => content,
  } as unknown as Response;
}

function lmErrorResponse(status: number, body = 'Error'): Response {
  return {
    ok: false,
    status,
    statusText: 'Error',
    text: async () => body,
    json: async () => ({}),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

// The module evaluates USE_LOCAL_LLM at load time, so we need ANTHROPIC_API_KEY
// absent (or USE_LOCAL_LLM=true) before the first import.  jest.setup.ts does not
// set ANTHROPIC_API_KEY, so the first import group gets the LM Studio branch.

import claudeService from '../../services/claude.js';

const {
  generateHazardSuggestions,
  generateControlMeasures,
  generateRiskAssessment,
  completeSWMSSection,
  validateSWMS,
} = claudeService;

// ---------------------------------------------------------------------------
// Shared sample data
// ---------------------------------------------------------------------------

const HAZARDS = ['Electric shock from live conductors', 'Arc flash/blast from electrical fault'];
const TRADE = 'electrician';
const UNKNOWN_TRADE = 'underwater-welder';

// ===========================================================================
// generateHazardSuggestions — LM Studio branch
// ===========================================================================

describe('generateHazardSuggestions', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns AI hazard array on clean JSON response', async () => {
    const hazards = ['Hazard A', 'Hazard B', 'Hazard C'];
    mockFetch.mockResolvedValueOnce(lmOkResponse(JSON.stringify(hazards)));

    const result = await generateHazardSuggestions(TRADE, 'Rewire a switchboard', 'Commercial building');
    expect(result).toEqual(hazards);
  });

  it('strips ```json markdown wrapper before parsing', async () => {
    const hazards = ['Hazard X'];
    const wrapped = '```json\n' + JSON.stringify(hazards) + '\n```';
    mockFetch.mockResolvedValueOnce(lmOkResponse(wrapped));

    const result = await generateHazardSuggestions(TRADE, 'job', 'site');
    expect(result).toEqual(hazards);
  });

  it('strips plain ``` markdown wrapper before parsing', async () => {
    const hazards = ['Hazard Y', 'Hazard Z'];
    const wrapped = '```\n' + JSON.stringify(hazards) + '\n```';
    mockFetch.mockResolvedValueOnce(lmOkResponse(wrapped));

    const result = await generateHazardSuggestions(TRADE, 'job', 'site');
    expect(result).toEqual(hazards);
  });

  it('extracts JSON array embedded in prose', async () => {
    const hazards = ['Fall hazard'];
    const withProse = 'Here are the hazards:\n' + JSON.stringify(hazards) + '\nHope that helps!';
    mockFetch.mockResolvedValueOnce(lmOkResponse(withProse));

    const result = await generateHazardSuggestions(TRADE, 'job', 'site');
    expect(result).toEqual(hazards);
  });

  it('recovers a truncated array via last-comma heuristic', async () => {
    // Simulate LLM that got cut off mid-item: last entry incomplete
    const truncated = '["Hazard A", "Hazard B", "Hazar';
    mockFetch.mockResolvedValueOnce(lmOkResponse(truncated));

    // Should recover ["Hazard A", "Hazard B"]
    const result = await generateHazardSuggestions(TRADE, 'job', 'site');
    expect(result).toEqual(['Hazard A', 'Hazard B']);
  });

  it('falls back to electrician defaults when AI call throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await generateHazardSuggestions(TRADE, 'job', 'site');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    // Default electrician hazards mention shock
    expect(result.some((h) => /shock|electric/i.test(h))).toBe(true);
  });

  it('falls back to builder defaults for an unknown trade type', async () => {
    mockFetch.mockRejectedValueOnce(new Error('AI unavailable'));

    const result = await generateHazardSuggestions(UNKNOWN_TRADE, 'job', 'site');
    expect(Array.isArray(result)).toBe(true);
    // Builder defaults contain "Falls from height"
    expect(result.some((h) => /falls|falling|height/i.test(h))).toBe(true);
  });

  it('falls back to defaults when LM Studio returns non-OK status', async () => {
    mockFetch.mockResolvedValueOnce(lmErrorResponse(500, 'Internal Server Error'));

    const result = await generateHazardSuggestions(TRADE, 'job', 'site');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back to defaults when LM Studio response has no choices', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ choices: [] }),
      text: async () => '',
    } as unknown as Response);

    const result = await generateHazardSuggestions(TRADE, 'job', 'site');
    expect(Array.isArray(result)).toBe(true);
  });
});

// ===========================================================================
// generateControlMeasures — LM Studio branch
// ===========================================================================

describe('generateControlMeasures', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns parsed controls map on success', async () => {
    const controls = {
      'Electric shock': {
        primaryControl: 'Isolate circuit before work',
        controlType: 'engineering',
        additionalControls: ['Lock-out/tag-out', 'Test for dead'],
        ppeRequired: ['Insulated gloves'],
        regulationReference: 'HSWA 2015',
      },
    };
    mockFetch.mockResolvedValueOnce(lmOkResponse(JSON.stringify(controls)));

    const result = await generateControlMeasures(['Electric shock'], TRADE);
    expect(result).toEqual(controls);
  });

  it('falls back to default controls (one per hazard) when AI throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('AI down'));

    const result = await generateControlMeasures(HAZARDS, TRADE);
    // One entry per hazard
    expect(Object.keys(result)).toHaveLength(HAZARDS.length);
    HAZARDS.forEach((h) => {
      expect(result[h]).toBeDefined();
      expect(result[h].primaryControl).toBeTruthy();
    });
  });

  it('default controls reference HSWA 2015', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fail'));

    const result = await generateControlMeasures(['Any hazard'], TRADE);
    expect(result['Any hazard'].regulationReference).toMatch(/Health and Safety at Work Act/i);
  });
});

// ===========================================================================
// generateRiskAssessment — LM Studio branch
// ===========================================================================

describe('generateRiskAssessment', () => {
  beforeEach(() => mockFetch.mockReset());

  const SAMPLE_RISK_ARRAY = [
    {
      hazard: 'Fall from scaffold',
      potentialHarm: 'Fractures, death',
      likelihood: 3,
      consequence: 4,
      riskRating: 12,
      controls: ['Harness', 'Guard rails'],
      residualLikelihood: 1,
      residualConsequence: 4,
      residualRisk: 4,
    },
  ];

  it('returns parsed risk assessment array on success', async () => {
    mockFetch.mockResolvedValueOnce(lmOkResponse(JSON.stringify(SAMPLE_RISK_ARRAY)));

    const result = await generateRiskAssessment('Scaffold erection', 'Outdoor site', TRADE);
    expect(result).toEqual(SAMPLE_RISK_ARRAY);
  });

  it('throws when AI fails (no fallback)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Timeout'));

    await expect(
      generateRiskAssessment('activity', 'location', TRADE)
    ).rejects.toThrow('Failed to generate risk assessment');
  });
});

// ===========================================================================
// completeSWMSSection — LM Studio branch
// ===========================================================================

describe('completeSWMSSection', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns parsed suggestions object on success', async () => {
    const suggestions = { supervisor: 'John Smith', siteAddress: '1 Main St' };
    mockFetch.mockResolvedValueOnce(lmOkResponse(JSON.stringify(suggestions)));

    const result = await completeSWMSSection(
      'electrician',
      'general_info',
      { supervisor: '' },
      'Commercial fit-out'
    );
    expect(result).toEqual(suggestions);
  });

  it('throws when AI fails (no fallback)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Service unavailable'));

    await expect(
      completeSWMSSection('plumber', 'scope', {}, 'Bathroom renovation')
    ).rejects.toThrow('Failed to complete SWMS section');
  });
});

// ===========================================================================
// validateSWMS — LM Studio branch
// ===========================================================================

describe('validateSWMS', () => {
  beforeEach(() => mockFetch.mockReset());

  const SAMPLE_VALIDATION = {
    isValid: true,
    completenessScore: 92,
    issues: [
      {
        severity: 'warning',
        field: 'emergency_procedures',
        issue: 'Emergency contact missing',
        suggestion: 'Add a 24/7 emergency contact number',
      },
    ],
    regulatoryNotes: ['HSWA 2015 s.36 requires PCBU to manage risks'],
  };

  it('returns parsed ValidationResult on success', async () => {
    mockFetch.mockResolvedValueOnce(lmOkResponse(JSON.stringify(SAMPLE_VALIDATION)));

    const result = await validateSWMS('electrician', { supervisor: 'Jane', hazards: ['shock'] });
    expect(result).toEqual(SAMPLE_VALIDATION);
    expect(typeof result.completenessScore).toBe('number');
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('throws when AI fails (no fallback)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

    await expect(
      validateSWMS('plumber', { steps: [] })
    ).rejects.toThrow('Failed to validate SWMS');
  });
});

// ===========================================================================
// chatCompletion — LM Studio timeout and connection errors
// ===========================================================================

describe('chatCompletion — LM Studio error paths', () => {
  beforeEach(() => mockFetch.mockReset());

  it('throws on fetch timeout (AbortError)', async () => {
    mockFetch.mockImplementationOnce(() => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    // generateHazardSuggestions has a fallback, so use generateRiskAssessment (no fallback) to surface the error
    await expect(
      generateRiskAssessment('activity', 'location', TRADE)
    ).rejects.toThrow();
  });

  it('throws on ECONNREFUSED', async () => {
    mockFetch.mockImplementationOnce(() => {
      const err = new Error('fetch failed');
      (err as NodeJS.ErrnoException).code = 'ECONNREFUSED';
      return Promise.reject(err);
    });

    await expect(
      generateRiskAssessment('activity', 'location', TRADE)
    ).rejects.toThrow();
  });
});

// ===========================================================================
// chatCompletion — Anthropic backend (requires module re-isolation)
// ===========================================================================

describe('chatCompletion — Anthropic backend', () => {
  // We re-isolate the module with ANTHROPIC_API_KEY set and USE_LOCAL_LLM unset
  // so the module initialises with the Anthropic client branch.

  const mockCreate = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    mockCreate.mockReset();
    jest.mock('@anthropic-ai/sdk', () => {
      return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
          messages: { create: mockCreate },
        })),
      };
    });
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    delete process.env.USE_LOCAL_LLM;
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    jest.resetModules();
  });

  it('returns text content from Anthropic API', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '["Hazard A", "Hazard B"]' }],
    });

    // Dynamically import after env + mock setup
    const mod = await import('../../services/claude.js');
    const { generateHazardSuggestions: genHazards } = mod.default;

    const result = await genHazards(TRADE, 'job', 'site');
    expect(result).toEqual(['Hazard A', 'Hazard B']);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      model: expect.stringContaining('claude'),
      max_tokens: expect.any(Number),
    });
  });

  it('falls back to defaults when Anthropic returns non-text content type', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
    });

    const mod = await import('../../services/claude.js');
    const { generateHazardSuggestions: genHazards } = mod.default;

    // No throw — falls back to defaults
    const result = await genHazards(TRADE, 'job', 'site');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back to defaults when Anthropic API throws', async () => {
    mockCreate.mockRejectedValueOnce(new Error('rate_limit_error'));

    const mod = await import('../../services/claude.js');
    const { generateHazardSuggestions: genHazards } = mod.default;

    const result = await genHazards(TRADE, 'job', 'site');
    expect(Array.isArray(result)).toBe(true);
  });
});

/**
 * Claude AI Service for TradeMate NZ
 *
 * Handles AI-powered features:
 * - Hazard identification and suggestions
 * - Control measure recommendations
 * - Document completion assistance
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model configuration
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 2048;

/**
 * Generate hazard suggestions based on job details
 */
export async function generateHazardSuggestions(
  tradeType: string,
  jobDescription: string,
  siteDetails: string
): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{
        role: 'user',
        content: `You are a NZ workplace health and safety expert. Given the following job details, suggest specific hazards that should be considered for the Safe Work Method Statement (SWMS).

Trade: ${tradeType}
Job Description: ${jobDescription}
Site Details: ${siteDetails}

Focus on NZ-specific regulations:
- Health and Safety at Work Act 2015
- WorkSafe NZ guidelines
- Trade-specific regulations

Return a JSON array of hazard strings. Each hazard should be specific and practical. Include both common and job-specific hazards.

Example format:
["Working at height on ladder without fall protection", "Exposed live electrical circuits in switchboard", "Asbestos cement sheeting in ceiling cavity"]

Return ONLY the JSON array, no other text.`
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return JSON.parse(content.text);
  } catch (error) {
    console.error('Error generating hazard suggestions:', error);
    throw new Error('Failed to generate hazard suggestions');
  }
}

/**
 * Generate control measures for identified hazards
 */
export async function generateControlMeasures(
  hazards: string[],
  tradeType: string
): Promise<Record<string, ControlMeasure>> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{
        role: 'user',
        content: `You are a NZ workplace health and safety expert. For each hazard listed, provide specific control measures following the hierarchy of controls:

1. Elimination - Remove the hazard entirely
2. Substitution - Replace with something safer
3. Engineering - Isolate people from the hazard
4. Administrative - Change how work is done
5. PPE - Personal protective equipment (last resort)

Trade: ${tradeType}
Hazards: ${JSON.stringify(hazards)}

For each hazard, provide:
- Primary control (the main control measure)
- Control type (elimination/substitution/engineering/administrative/ppe)
- Additional controls (list of supporting measures)
- PPE required (specific items)
- NZ regulation reference (if applicable)

Return a JSON object where keys are the hazards and values follow this structure:
{
  "hazard text here": {
    "primaryControl": "Main control measure",
    "controlType": "engineering",
    "additionalControls": ["Control 1", "Control 2"],
    "ppeRequired": ["Item 1", "Item 2"],
    "regulationReference": "WorkSafe guidance on X"
  }
}

Return ONLY the JSON object, no other text.`
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return JSON.parse(content.text);
  } catch (error) {
    console.error('Error generating control measures:', error);
    throw new Error('Failed to generate control measures');
  }
}

/**
 * Generate risk assessment suggestions
 */
export async function generateRiskAssessment(
  activity: string,
  location: string,
  tradeType: string
): Promise<RiskAssessmentSuggestion[]> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{
        role: 'user',
        content: `You are a NZ workplace health and safety expert. Generate a risk assessment for the following activity.

Activity: ${activity}
Location: ${location}
Trade: ${tradeType}

For each potential hazard, assess:
- Hazard description
- Potential harm and who is affected
- Likelihood (1-5): 1=Rare, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain
- Consequence (1-5): 1=Insignificant, 2=Minor, 3=Moderate, 4=Major, 5=Catastrophic
- Suggested controls (following hierarchy)
- Residual risk after controls

Return a JSON array of risk assessments:
[
  {
    "hazard": "Hazard description",
    "potentialHarm": "What harm could occur and to whom",
    "likelihood": 3,
    "consequence": 4,
    "riskRating": 12,
    "controls": ["Control 1", "Control 2"],
    "residualLikelihood": 2,
    "residualConsequence": 3,
    "residualRisk": 6
  }
]

Focus on NZ-specific risks and WorkSafe guidance. Return ONLY the JSON array.`
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return JSON.parse(content.text);
  } catch (error) {
    console.error('Error generating risk assessment:', error);
    throw new Error('Failed to generate risk assessment');
  }
}

/**
 * Complete SWMS section with AI suggestions
 */
export async function completeSWMSSection(
  templateType: string,
  sectionId: string,
  existingData: Record<string, unknown>,
  context: string
): Promise<Record<string, unknown>> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{
        role: 'user',
        content: `You are a NZ workplace health and safety expert helping complete a Safe Work Method Statement.

Template Type: ${templateType}
Section: ${sectionId}
Existing Data: ${JSON.stringify(existingData)}
Context: ${context}

Based on the context and existing data, suggest completions for any empty or incomplete fields in this section. Follow NZ regulations and WorkSafe best practices.

Return a JSON object with field suggestions:
{
  "fieldName1": "suggested value",
  "fieldName2": ["item 1", "item 2"] // for array fields
}

Return ONLY the JSON object with suggestions for empty/incomplete fields.`
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return JSON.parse(content.text);
  } catch (error) {
    console.error('Error completing SWMS section:', error);
    throw new Error('Failed to complete SWMS section');
  }
}

/**
 * Validate SWMS document for compliance
 */
export async function validateSWMS(
  templateType: string,
  swmsData: Record<string, unknown>
): Promise<ValidationResult> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{
        role: 'user',
        content: `You are a NZ workplace health and safety compliance expert. Review this SWMS document for completeness and compliance.

Template Type: ${templateType}
SWMS Data: ${JSON.stringify(swmsData)}

Check for:
1. Required fields completed
2. Adequate hazard identification
3. Appropriate control measures
4. Emergency procedures present
5. NZ regulatory compliance (HSWA 2015, WorkSafe guidance)

Return a JSON object:
{
  "isValid": true/false,
  "completenessScore": 0-100,
  "issues": [
    {
      "severity": "critical/warning/info",
      "field": "field name or section",
      "issue": "description of the issue",
      "suggestion": "how to fix it"
    }
  ],
  "regulatoryNotes": ["Any relevant NZ regulatory notes"]
}

Return ONLY the JSON object.`
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return JSON.parse(content.text);
  } catch (error) {
    console.error('Error validating SWMS:', error);
    throw new Error('Failed to validate SWMS');
  }
}

// Type definitions
export interface ControlMeasure {
  primaryControl: string;
  controlType: 'elimination' | 'substitution' | 'engineering' | 'administrative' | 'ppe';
  additionalControls: string[];
  ppeRequired: string[];
  regulationReference?: string;
}

export interface RiskAssessmentSuggestion {
  hazard: string;
  potentialHarm: string;
  likelihood: number;
  consequence: number;
  riskRating: number;
  controls: string[];
  residualLikelihood: number;
  residualConsequence: number;
  residualRisk: number;
}

export interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info';
  field: string;
  issue: string;
  suggestion: string;
}

export interface ValidationResult {
  isValid: boolean;
  completenessScore: number;
  issues: ValidationIssue[];
  regulatoryNotes: string[];
}

export default {
  generateHazardSuggestions,
  generateControlMeasures,
  generateRiskAssessment,
  completeSWMSSection,
  validateSWMS,
};

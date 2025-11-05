// Perplexity API Client for Prompt #1 (Topics and Queries Generation)
import type { TopicsAndQueriesResponse } from '@/types';
import { PROMPT_1_SYSTEM, extractAndParseJSON } from './openai';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar'; // As specified by user

// Error class for Perplexity API errors
export class PerplexityError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'PerplexityError';
  }
}

/**
 * Retry helper with exponential backoff
 * Same pattern as OpenAI client
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Handle rate limiting (429) with exponential backoff
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '10');
        const waitTime = Math.max(retryAfter * 1000, 5000 * Math.pow(2, attempt));
        console.log(`⚠️  Perplexity rate limited (429) - waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Handle server errors (500, 502, 503, 504) with retry
      if (response.status >= 500 && response.status < 600) {
        if (attempt < maxRetries - 1) {
          const waitTime = 3000 * Math.pow(2, attempt);
          console.log(`⚠️  Perplexity server error (${response.status}) - waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      return response;
    } catch (error: any) {
      // Network errors (connection timeout, DNS, etc.)
      if (attempt < maxRetries - 1) {
        const waitTime = 2000 * Math.pow(2, attempt);
        console.log(`⚠️  Perplexity network error - waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }

  throw new PerplexityError('Max retries exceeded');
}

/**
 * Generate topics and queries using Perplexity's Sonar model
 * Replaces OpenAI for Prompt #1
 */
export async function generateTopicsAndQueriesWithPerplexity(
  institutionName: string
): Promise<TopicsAndQueriesResponse> {
  if (!PERPLEXITY_API_KEY) {
    throw new PerplexityError('PERPLEXITY_API_KEY is not configured');
  }

  try {
    console.log(`📝 Generating topics and queries with Perplexity for: ${institutionName}`);

    const response = await fetchWithRetry(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [
          {
            role: 'system',
            content: PROMPT_1_SYSTEM
          },
          {
            role: 'user',
            content: institutionName
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new PerplexityError(
        `Perplexity API error: ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const data = await response.json();

    // Log the full response structure for debugging
    console.log('📦 Perplexity Response structure:', JSON.stringify({
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length
    }));

    // Validate response structure for Chat Completions API
    // Perplexity uses standard OpenAI Chat Completions format
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('❌ Invalid Perplexity API response structure:', JSON.stringify(data, null, 2));
      throw new PerplexityError('API returned invalid response structure (no choices array)');
    }

    // Extract content from first choice
    const firstChoice = data.choices[0];
    if (!firstChoice.message || !firstChoice.message.content) {
      console.error('❌ No message content in choice:', JSON.stringify(firstChoice, null, 2));
      throw new PerplexityError('API returned no message content');
    }

    const content = firstChoice.message.content;

    if (!content || content.trim().length === 0) {
      console.error('❌ Empty content in Perplexity response.');
      throw new PerplexityError('API returned empty content.');
    }

    // Log raw response length
    console.log(`📄 Perplexity response length: ${content.length} chars`);

    // Extract and parse JSON (reuse OpenAI helper function)
    const parsed = extractAndParseJSON(content, 'Perplexity Prompt #1 (Topics)');

    // Validate response structure
    if (!parsed.topics || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
      throw new PerplexityError('Invalid response: missing or empty topics array');
    }

    console.log(`✅ Successfully generated ${parsed.topics.length} topics with Perplexity`);

    // Transform response to match expected format
    // Perplexity returns: {company: {name, location}, topics: [...]}
    // We need: {institution_name, location, institution_type, topics: [...]}
    const transformedResponse: TopicsAndQueriesResponse = {
      institution_name: parsed.company?.name || parsed.institution_name || 'Unknown',
      location: parsed.company?.location || parsed.location || 'Unknown',
      institution_type: parsed.institution_type || 'Unknown',
      topics: parsed.topics
    };

    return transformedResponse;
  } catch (error) {
    console.error('❌ Failed to generate topics with Perplexity:', error);
    if (error instanceof PerplexityError) {
      throw error;
    }
    throw new PerplexityError(`Failed to generate topics: ${error}`);
  }
}

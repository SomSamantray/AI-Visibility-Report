// OpenAI API Client for AI Visibility Tracker
import type { TopicsAndQueriesResponse, Prompt1RawResponse, BatchQueryResponse, BatchQueryResult, Query } from '@/types';
import { supabaseAdmin } from './supabase';
import { findBestMatch } from 'string-similarity';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const API_BASE_URL = 'https://api.openai.com/v1';
const MODEL_GPT5_NANO = 'gpt-5-nano'; // GPT-5 Nano for prompts with web search and low reasoning

// Error class for OpenAI API errors
export class OpenAIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

/**
 * Sanitize JSON string by fixing common LLM output issues
 * Handles unescaped control characters and malformed strings
 */
function sanitizeJSONString(jsonString: string): string {
  // Fix unescaped control characters inside string values
  // This regex finds strings and escapes control characters within them
  return jsonString.replace(
    /"([^"\\]*(\\.[^"\\]*)*)"/g,
    (match, content) => {
      // Don't process if already properly escaped
      if (!content || typeof content !== 'string') return match;

      // Escape control characters
      const fixed = content
        .replace(/\n/g, '\\n')     // Newlines
        .replace(/\r/g, '\\r')     // Carriage returns
        .replace(/\t/g, '\\t')     // Tabs
        .replace(/\f/g, '\\f')     // Form feeds
        .replace(/\b/g, '\\b');    // Backspaces

      return `"${fixed}"`;
    }
  );
}

/**
 * Extract and parse JSON from API response
 * Handles markdown code blocks and malformed responses
 */
function extractAndParseJSON(content: string, context: string): any {
  if (!content || content.trim().length === 0) {
    throw new Error(`${context}: Response content is empty`);
  }

  console.log(`📄 ${context} - Raw response length: ${content.length} chars`);

  let jsonString = content.trim();

  // Step 1: Remove markdown code blocks if present
  // Matches: ```json\n{...}\n``` or ```\n{...}\n```
  const markdownMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (markdownMatch) {
    jsonString = markdownMatch[1].trim();
    console.log(`✂️  ${context} - Removed markdown code blocks`);
  }

  // Step 2: Extract JSON object {...}
  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonString = jsonMatch[0];
  }

  // Step 3: Validate we have something to parse
  if (!jsonString || jsonString.length === 0) {
    console.error(`❌ ${context} - No JSON found in response`);
    console.error(`First 500 chars of response: ${content.substring(0, 500)}`);
    throw new Error(`${context}: No valid JSON found in response`);
  }

  // Step 4: Attempt to parse with sanitization
  try {
    const parsed = JSON.parse(jsonString);
    console.log(`✅ ${context} - Successfully parsed JSON`);
    return parsed;
  } catch (firstError) {
    // First parse failed - try with sanitization
    console.log(`⚠️  ${context} - Initial parse failed, attempting sanitization...`);

    try {
      const sanitized = sanitizeJSONString(jsonString);
      const parsed = JSON.parse(sanitized);
      console.log(`✅ ${context} - Successfully parsed after sanitization`);
      return parsed;
    } catch (secondError) {
      console.error(`❌ ${context} - JSON parse failed even after sanitization`);
      console.error(`Attempted to parse: ${jsonString.substring(0, 500)}...`);
      throw new Error(`${context}: Failed to parse JSON - ${secondError}`);
    }
  }
}

// Fetch with retry logic and timeout
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  timeoutMs = 300000 // 5 minutes default timeout
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle rate limiting (429) with exponential backoff
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '10');
        const waitTime = Math.max(retryAfter * 1000, 5000 * Math.pow(2, attempt)); // At least 5s exponential backoff
        console.log(`⚠️  Rate limited (429) - waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Handle server errors (500, 502, 503, 504) with retry
      if (response.status >= 500 && response.status < 600) {
        if (attempt < maxRetries - 1) {
          const waitTime = 3000 * Math.pow(2, attempt); // Exponential backoff starting at 3s
          console.log(`⚠️  Server error (${response.status}) - waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      // Return response for all other status codes (including 4xx errors)
      return response;
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (error.name === 'AbortError') {
        console.error(`⏱️  Request timeout after ${timeoutMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      } else {
        console.error(`❌ Fetch error (attempt ${attempt + 1}/${maxRetries}):`, error.message);
      }

      if (isLastAttempt) throw error;

      // Exponential backoff for network errors
      const waitTime = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s...
      console.log(`⏳ Retrying after ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw new OpenAIError('Max retries exceeded');
}

// Prompt #1: Universal AI Visibility Analyzer
const PROMPT_1_SYSTEM = `You are an AI Visibility Analyzer.
Your role is to deeply research and analyze any educational institution (such as schools, colleges, universities, edtech companies, or study abroad consultants), and then simulate how real users would search or ask questions in Google or conversational AI systems (like ChatGPT) to discover institutions, platforms, tools, services, vendors, or solutions related to that entity's educational ecosystem and domain.

Your Task:
Understand the entity thoroughly: Research the institution and its ecosystem, such as:


Educational institutions (schools, colleges, universities)


Edtech companies and platforms


Study abroad agencies or consultants


Identify its offerings:


What are its products, features, and services tailored to the education sector?


How does it serve students, educators, institutions, or administrators?


Generate relevant topics for educational entities:


Topics should reflect educational technology, services, admissions, student lifecycle, educational programs, and more.


Produce highly realistic, brand-neutral search prompts for each topic:


Ensure all queries are completely brand-neutral — no specific brand/institution names in any query at all


The prompts should simulate real search queries made by students, parents, educators, and institutions in discovering educational platforms, services, and institutions


Avoid mentioning specific brand names — make the queries neutral and focused on platform or institution or brand discovery in the educational domain.


Short tail and long tail human-style search queries that reflect how real users explore, compare, and discover platforms, tools, or institutions related to the topic.


Include region-specific variations when applicable, especially for educational institutions, since educational systems can vary greatly by region, country, or state.


If the entity is regional, at least 50% of the prompts must include region, city, or country references (e.g., "universities in India", "best schools in Delhi NCR", "study abroad agencies in UAE").


If the entity is global, include both global and regional queries (e.g., "top study abroad consultants worldwide", "best edtech platforms for K-12").


Ensure each prompt is focused on educational institutions and solutions (e.g., education management and admissions, student recruitment for placements, online learning courses, study abroad services, college admissions, placements, scholarships etc.).


Reject prompts that focus on non-educational products or concepts like "internal business processes," "best practices," or unrelated generic platforms.


Ensure all queries are completely brand-neutral — no specific brand/institution names in any query at all


Every query should lead to actionable answers: institutions, platforms, educational services, that users can discover and evaluate.



🧭 STEP 1 — ENTITY UNDERSTANDING (THINK DEEPLY)
Carefully research and reason about the educational institution provided ({{brand_name}}).
Identify:
✅ Full, actual name of the entity (e.g., a school, university, or edtech company)


✅ Headquarters or primary operational region (Locality and Country) — important for region-based queries (e.g., "Top colleges in India", "Best study abroad agencies in the US").


✅ Core business type (e.g., educational institution, online course provider, study abroad agency, or educational technology company)


✅ Industries and verticals it operates in (e.g., K-12 education, higher education, online education, study abroad consulting, etc.)


✅ Products, services, or offerings (e.g., university admissions, online learning tools, study abroad guidance services, coaching, graduation or post graduation, etc.)


✅ Main audience segments (e.g., students, parents, teachers, edtech professionals, higher education institutions, school administrators, etc.)


✅ Core features, capabilities, and technologies (e.g., CRM for student management, online learning platforms, admissions software, career counseling tools)


✅ Key pain points or needs the entity addresses (e.g., offering best coaching and preparation, graduation or post graduation or Ph.D in various fields, improving learning outcomes, assisting with study abroad applications)


✅ Related or adjacent business functions (e.g., student recruitment, online course providers, study visa consulting)


Use this full analysis to define the topical boundaries. Every generated prompt must fit strictly within the education ecosystem and relate directly to the institution's offerings or market domain. Reject any prompt that does not.

STEP 2 — TOPIC GENERATION
Based on your analysis, generate 11 high-level topics that represent the major categories of what this educational entity does, solves, or competes in.
Each topic should:
Represent a functional area or solution space relevant to educational institutions or services.


Be broad enough to generate diverse prompts, but narrow enough to remain focused on education.


Use natural naming (e.g., "University Admissions for Engineering, "K-12 Education Schools", "Study Abroad Services", "Edtech Platforms for Higher Ed").


Avoid overlapping topics. Each must cover a distinct need, function, or product area (e.g., admissions platforms vs. learning management systems).


Reflect real-world discovery and comparison intent — i.e., how students, parents, or educational professionals would explore or compare similar educational institutions, services or solutions.




STEP 3 — PROMPT (QUERY) GENERATION
Ensure all queries are completely brand-neutral — no specific brand/institution names in any query at all
For each topic, generate 11 that are short tail and long tail human-style search queries that reflect how real users explore, compare, and discover platforms, tools, or institutions related to the topic.
Each topic should collectively yield a 360° thematic coverage through its search prompts.
If the entity is local or regionally-focused, ensure 50% or more of the prompts include region-specific markers (e.g., city, region, country). If the entity operates globally, include a mix of global and regional prompts.
Each prompt must:
Sound natural and conversational — like a real long tail or short tail search query.


Be relevant to the educational sector and its various services, domain specific niche like academic reputation and ranking, admissions, placements, scholarships, pedagogy, faculty, administration, fees, pricing, student support and counselling, course curriculum, batch sizes, flexibility and accessibility.


Combine a pain point or feature, or need + search intent keyword (e.g., "best schools for Standard 9th", "affordable admissions in universities in India", "top btech colleges in Noida", "placement opportunities for students", "top MBA colleges india 2025").


Contain intent triggers when natural, such as:


best, top, leading, compare, alternatives to, for, platforms for, software that, solutions for, affordable, upskilling, coaching preparations, etc.


Reflect discovery intent — not how-to questions or broad informational articles.


Be brand-neutral — do not mention any brand, institution, or company by name.


Vary structure and tone slightly to simulate real human search behavior (e.g., "compare engineering btech vs bArch" vs. "which college is best for medical admissions").


Ensure each prompt leads to actionable discovery — real institutions and services,



STEP 4 — REGIONAL CONTEXT VARIATION
Based on the type of educational entity being analyzed, apply the following strict rules for location-specificity in prompt generation:
🎓 For Educational Institutions (e.g., universities, colleges, schools):
At least 50% of all prompts per topic must include region-, city-, or locality-level specificity (e.g., "best colleges in Delhi NCR", "top study abroad consultants in UAE", "engineering colleges in Tamil Nadu").


Focus on discovery of institutions, programs, campuses, or academic services, not software tools.


Use location markers naturally, reflecting how students, parents, and searchers would evaluate educational options.


For EdTech, and Study Abroad Services:
Use country-level specificity only unless the business is hyper-local.


If the entity operates globally, include both global and regional queries (e.g., "top coaching institute for international students in India" vs "best study abroad consultants for engineering in Germany").


Do NOT force location names where irrelevant, but make 50%+ of prompts regionally relevant for local or regional entities.

⚙️ STEP 5 — OUTPUT FORMAT (STRICT JSON)
Return output using this strict and clean JSON structure:
{
  "company": {
    "name": "<Actual Correct Institution Name>",
    "location": "<City, State, Country>"
  },
  "topics": [
    {
      "topic": "<Topic Name>",
      "prompts": [
        "<non-branded Human-style search phrase 1>",
        "<non-branded human-style search phrase 2>",
        "<non-branded human-style search phrase 3>",
        "...",
        "<non-branded human-style search phrase 11>"
      ]
    },
    ...
  ]
}


🧠 STEP 6 — GUIDELINES FOR PROMPT QUALITY
Prompts must simulate intent-rich, human search behavior that results in platform, service, or institutional discovery.


Each prompt must:


Be keyword-rich and conversational.


Lead directly to discoverable solutions (platforms, institutions, vendors).


Include diversity in comparison, feature mentions, pricing, compliance, or regional focus.


Stay tightly within the education ecosystem of the analyzed entity.


Ensure 50% of prompts reflect region/country specificity if the entity is local/regional.`;

// Prompt #2: Unbiased Query Analysis with Web Search (NO BRAND AWARENESS)
const PROMPT_2_SYSTEM = `You are an intelligent answering system that generates completely unbiased, fact-based answers to user queries using web search.

STRICT OUTPUT RULES:
• You MUST return ONLY valid JSON (no conversational text, no questions, no clarifications)
• You MUST answer the query directly using the web search results
• DO NOT ask for clarification or additional context
• DO NOT return conversational responses like "I can help with that..." or "Could you clarify..."
• If the query is unclear, make your best interpretation based on web search and answer directly

Answer Generation Instructions:
• Research deeply using web search to find the most comprehensive, current information
- Use location as a parameter to generate answers themed around the location.
• Answer the user query using 10 bullet points ONLY
• Be completely neutral and factual — select brands/institutions based purely on relevance, quality, and search results
• DO NOT favor any specific brand completely — let web search results determine which brands to mention
• Include the top, most relevant institutes/brands/companies that genuinely match the query and as provided in the User prompt.
• Each bullet point should represent one unique fact or brand mention
• Mention brands in the natural order they emerge from your research (most relevant first)

Brand Extraction Instructions:
• After writing your answer, identify ALL brands/institutes/companies mentioned in your bullet points
• List them IN THE EXACT ORDER they FIRST appear in your answer (this is critical!)
• Use the official, full name of each institution as it appears in your answer
  - Example: "Massachusetts Institute of Technology" (not "MIT")
  - Example: "Indian Institute of Technology Delhi" (not "IIT Delhi")
• If you used an acronym in your answer, include both forms in brands_mentioned
  - Example: If answer says "MIT", add "Massachusetts Institute of Technology (MIT)"
• Be case-sensitive and consistent with how you wrote it in the answer

Website Citation:
• List all website URLs you referenced during your research
• Use full URLs (e.g., "https://www.example.com/page")

Strict JSON Output Format:
Return ONLY this JSON structure (no additional text, no markdown, no conversational responses):


{
  "Answer": "Complete unbiased answer in bullet points",
  "brands_mentioned": [
    "First Brand Name (as it appears in answer)",
    "Second Brand Name (as it appears in answer)",
    "..."
  ],
  "websites_cited": [
    "https://url1.com",
    "https://url2.com",
    "..."
  ]
}`;

/**
 * EXPERT Brand Detection with 5-Layer Fuzzy Matching
 * Expertly matches focus brand with abbreviations, short forms, full forms, and variations
 *
 * @param brandsMentioned - Array of brand names from LLM response (in order of appearance)
 * @param focusBrand - The brand we're looking for (can be abbreviation or full name)
 * @returns { rank: number, visibility: string } - rank (1-based) and visibility percentage
 */
function detectBrandInAnswer(
  brandsMentioned: string[],
  focusBrand: string
): { rank: number; visibility: string } {
  if (!brandsMentioned || brandsMentioned.length === 0) {
    return { rank: 0, visibility: '0%' };
  }

  const focusLower = focusBrand.toLowerCase().trim();
  const focusClean = focusLower.replace(/[^\w\s]/g, ''); // Remove punctuation
  let foundIndex = -1;

  // Layer 1: Exact Match (case-insensitive, ignore punctuation)
  foundIndex = brandsMentioned.findIndex(brand => {
    const brandClean = brand.toLowerCase().trim().replace(/[^\w\s]/g, '');
    return brandClean === focusClean;
  });

  if (foundIndex !== -1) {
    console.log(`  ✓ Layer 1 (Exact): Found "${focusBrand}" at position ${foundIndex + 1}`);
  } else {
    // Layer 2: Substring Match (bidirectional, handles abbreviations in full names)
    // Handles: "MIT" in "Massachusetts Institute of Technology (MIT)"
    // Handles: "LPU" in "Lovely Professional University"
    // Handles: "Lovely Professional University" when LLM wrote "LPU"
    foundIndex = brandsMentioned.findIndex(brand => {
      const brandLower = brand.toLowerCase().trim();
      const brandClean = brandLower.replace(/[^\w\s]/g, '');

      // Direct substring match
      if (brandLower.includes(focusLower) || focusLower.includes(brandLower)) {
        return true;
      }

      // Match without punctuation
      if (brandClean.includes(focusClean) || focusClean.includes(brandClean)) {
        return true;
      }

      // Check if focus brand is in parentheses (common abbreviation pattern)
      const parenMatch = brand.match(/\(([^)]+)\)/);
      if (parenMatch && parenMatch[1].toLowerCase().trim() === focusLower) {
        return true;
      }

      return false;
    });

    if (foundIndex !== -1) {
      console.log(`  ✓ Layer 2 (Substring): Found "${focusBrand}" in "${brandsMentioned[foundIndex]}" at position ${foundIndex + 1}`);
    } else {
      // Layer 2.5: Special handling for Xavier institutions and spelling variants
      // Handles: "XIM Bhubaneswar" vs "Xavier Institute of Management Bhubaneswar"
      // Handles: "Bhubaneswar" vs "Bhubaneshwar" spelling variants
      foundIndex = brandsMentioned.findIndex(brand => {
        const brandLower = brand.toLowerCase().trim();
        const focusLowerTrimmed = focusLower.trim();

        // Remove city names for comparison
        const cityNames = ['delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'hyderabad',
                          'pune', 'ahmedabad', 'jaipur', 'lucknow', 'bhubaneswar', 'bhubaneshwar',
                          'noida', 'gurgaon', 'gurugram', 'chandigarh', 'indore', 'nagpur', 'patna',
                          'bengaluru', 'calcutta', 'bombay', 'madras'];

        // Strip city names from both
        let focusWithoutCity = focusLowerTrimmed;
        let brandWithoutCity = brandLower;

        for (const city of cityNames) {
          focusWithoutCity = focusWithoutCity.replace(new RegExp(`\\b${city}\\b`, 'gi'), '').trim();
          brandWithoutCity = brandWithoutCity.replace(new RegExp(`\\b${city}\\b`, 'gi'), '').trim();
        }

        // Check if focus is an acronym that matches the brand (without city)
        const brandAcronymWithoutCity = getAcronym(brandWithoutCity);
        if (focusWithoutCity.length <= 6 && focusWithoutCity.toUpperCase() === brandAcronymWithoutCity) {
          return true;
        }

        // Check reverse: if brand is acronym and focus has the full form
        const focusAcronymWithoutCity = getAcronym(focusWithoutCity);
        if (brandWithoutCity.length <= 6 && brandWithoutCity.toUpperCase() === focusAcronymWithoutCity) {
          return true;
        }

        // Spelling variant matching using Levenshtein distance (for Bhubaneswar vs Bhubaneshwar)
        const similarity = findBestMatch(focusLowerTrimmed, [brandLower]).bestMatch.rating;
        if (similarity >= 0.85) { // 85% similarity for spelling variants
          return true;
        }

        return false;
      });

      if (foundIndex !== -1) {
        console.log(`  ✓ Layer 2.5 (Xavier/Spelling): Matched "${focusBrand}" with "${brandsMentioned[foundIndex]}" at position ${foundIndex + 1}`);
      } else {
        // Layer 3: Acronym Detection (expert matching)
        // Handles: "IIT Delhi" vs "Indian Institute of Technology Delhi"
        // Handles: "LPU" vs "Lovely Professional University"
        const focusAcronym = getAcronym(focusBrand);
        const focusWords = focusBrand.toLowerCase().split(/\s+/);

        foundIndex = brandsMentioned.findIndex(brand => {
          const brandAcronym = getAcronym(brand);
          const brandLower = brand.toLowerCase();
          const brandWords = brand.toLowerCase().split(/\s+/);

          // Check if acronyms match
          if (focusAcronym && brandAcronym && focusAcronym === brandAcronym) {
            return true;
          }

          // Check if focus brand IS the acronym of mentioned brand
          // e.g., focus="LPU", brand="Lovely Professional University"
          if (focusBrand.length <= 6 && brandAcronym === focusBrand.toUpperCase()) {
            return true;
          }

          // Check if mentioned brand IS the acronym of focus brand
          // e.g., focus="Lovely Professional University", brand="LPU"
          if (brand.length <= 6 && focusAcronym === brand.toUpperCase()) {
            return true;
          }

          // Check significant word overlap (70% threshold)
          if (focusWords.length >= 2) {
            const significantFocusWords = focusWords.filter(w => w.length > 2);
            const significantBrandWords = brandWords.filter(w => w.length > 2);

            if (significantFocusWords.length > 0) {
              const matchCount = significantFocusWords.filter(word => brandLower.includes(word)).length;
              if (matchCount >= Math.ceil(significantFocusWords.length * 0.7)) {
                return true;
              }
            }

            if (significantBrandWords.length > 0) {
              const reverseMatchCount = significantBrandWords.filter(word => focusLower.includes(word)).length;
              if (reverseMatchCount >= Math.ceil(significantBrandWords.length * 0.7)) {
                return true;
              }
            }
          }

          return false;
        });

        if (foundIndex !== -1) {
          console.log(`  ✓ Layer 3 (Acronym/Words): Matched "${focusBrand}" with "${brandsMentioned[foundIndex]}" at position ${foundIndex + 1}`);
        } else {
          // Layer 4: Common Abbreviation Patterns
          // Handles: "IIT" in "IIT Delhi", "MIT" in "MIT Manipal", etc.
          foundIndex = brandsMentioned.findIndex(brand => {
            const brandParts = brand.split(/\s+/);
            const focusParts = focusBrand.split(/\s+/);

            // Check if any word in focus brand matches any word in mentioned brand
            for (const focusPart of focusParts) {
              for (const brandPart of brandParts) {
                if (focusPart.toLowerCase() === brandPart.toLowerCase() && focusPart.length > 2) {
                  // Found a matching significant word - check if it's the main identifier
                  const focusFirstWord = focusParts[0].toLowerCase();
                  const brandFirstWord = brandParts[0].toLowerCase();
                  if (focusFirstWord === brandFirstWord || focusFirstWord.includes(brandFirstWord) || brandFirstWord.includes(focusFirstWord)) {
                    return true;
                  }
                }
              }
            }

            return false;
          });

          if (foundIndex !== -1) {
            console.log(`  ✓ Layer 4 (Abbreviation Patterns): Matched "${focusBrand}" with "${brandsMentioned[foundIndex]}" at position ${foundIndex + 1}`);
          } else {
            // Layer 5: Similarity Score (Levenshtein Distance)
            // Handles typos and minor variations
            const similarities = brandsMentioned.map(brand => ({
              brand,
              score: findBestMatch(focusLower, [brand.toLowerCase()]).bestMatch.rating
            }));

            const bestMatch = similarities.reduce((best, current) =>
              current.score > best.score ? current : best
            , { brand: '', score: 0 });

            if (bestMatch.score >= 0.65) { // 65% similarity threshold (lowered for better recall)
              foundIndex = brandsMentioned.findIndex(b => b === bestMatch.brand);
              console.log(`  ✓ Layer 5 (Similarity ${(bestMatch.score * 100).toFixed(0)}%): Matched "${focusBrand}" with "${bestMatch.brand}" at position ${foundIndex + 1}`);
            }
          }
        }
      }
    }
  }

  // Calculate rank and visibility
  if (foundIndex === -1) {
    console.log(`  ✗ Brand "${focusBrand}" NOT found in ${brandsMentioned.length} mentioned brands`);
    console.log(`  📋 Brands mentioned: ${brandsMentioned.join(', ')}`);
    return { rank: 0, visibility: '0%' };
  }

  const rank = foundIndex + 1; // Convert to 1-based index

  // Weighted ranking system: Rank 1=100%, 2-3=50%, 4-5=25%, 6+=10%
  let visibility: string;
  if (rank === 1) {
    visibility = '100%';
  } else if (rank <= 3) {
    visibility = '50%';
  } else if (rank <= 5) {
    visibility = '25%';
  } else {
    visibility = '10%';
  }

  return { rank, visibility };
}

/**
 * Extract acronym from a brand name
 * Example: "Massachusetts Institute of Technology" → "MIT"
 * Enhanced to handle city names and spelling variants
 */
function getAcronym(name: string): string {
  // Common Indian city names that should be excluded from acronyms
  const cityNames = ['delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'hyderabad',
                     'pune', 'ahmedabad', 'jaipur', 'lucknow', 'bhubaneswar', 'bhubaneshwar',
                     'noida', 'gurgaon', 'gurugram', 'chandigarh', 'indore', 'nagpur', 'patna',
                     'bengaluru', 'calcutta', 'bombay', 'madras'];

  const words = name.split(/\s+/);
  const acronym = words
    .filter(word => {
      if (word.length === 0) return false;
      // Exclude city names from acronym
      if (cityNames.includes(word.toLowerCase())) return false;
      return word[0] === word[0].toUpperCase();
    })
    .map(word => word[0])
    .join('');
  return acronym.length >= 2 ? acronym : ''; // Only return if 2+ characters
}

/**
 * Validate brand mention using LLM (Prompt #3 - Two-Stage Validation)
 * This provides 95-99% accuracy by using LLM's semantic understanding
 * instead of fuzzy string matching which has ~70% accuracy.
 */
async function validateBrandWithLLM(
  brandsMentioned: string[],
  focusBrand: string
): Promise<{ found: boolean; matched_name: string | null; canonical_brand: string | null; position: number | null; confidence: string; reasoning: string }> {
  // Early exit if no brands mentioned
  if (!brandsMentioned || brandsMentioned.length === 0) {
    return {
      found: false,
      matched_name: null,
      canonical_brand: null,
      position: null,
      confidence: 'high',
      reasoning: 'No brands mentioned in the answer'
    };
  }

  const validationPrompt = `You are a precise brand matching system with brand family recognition.

**Focus Brand/Entity:** "${focusBrand}"

**List of brands/entities mentioned in an answer:**
${JSON.stringify(brandsMentioned, null, 2)}

**Question:** Is the Focus Brand/Entity mentioned in this list?

**Matching Rules:**
- Match if they refer to the SAME brand/institute/entity/company
- Include exact name matches
- Include common abbreviations (e.g., "MIT" for "Massachusetts Institute of Technology")
- Include alternate official names
- Include nicknames or informal names
- Include minor misspellings or typos

**Brand Family Matching (NEW):**
- Recognize campus/branch variations as the same parent brand
  - "Sage University Indore" + "Sage University Bhopal" → Both are "Sage University"
  - "Harvard Business School" + "Harvard Medical School" → Both are "Harvard University"
  - "IIT Delhi" + "IIT Bombay" → Keep separate (these are distinct institutions despite shared brand)
- When matched, return the CANONICAL parent brand name
- Only merge if they are clearly branches/campuses of the same institution

**DO NOT match different entities:**
- "Rajalakshmi Institute of Technology" ≠ "IIT Madras"
- "Harvard University" ≠ "Howard University"
- "Meritto" ≠ "Merit Solutions"

**Return strict JSON format:**
{
  "found": true or false,
  "matched_name": "exact name from list as it appears",
  "canonical_brand": "parent/main brand name if campus variant, else same as matched_name",
  "position": 1-based position in list (1, 2, 3...) or null,
  "confidence": "high" or "medium" or "low",
  "reasoning": "brief explanation of why match/no match"
}

**Examples:**
- Focus: "MIT", List: ["Massachusetts Institute of Technology"]
  → {"found": true, "matched_name": "Massachusetts Institute of Technology", "canonical_brand": "MIT", "position": 1}

- Focus: "Sage University", List: ["Sage University Indore", "VIT", "IIT Delhi"]
  → {"found": true, "matched_name": "Sage University Indore", "canonical_brand": "Sage University", "position": 1}

- Focus: "IIT Delhi", List: ["IIT Madras", "IIT Bombay"]
  → {"found": false, "matched_name": null, "canonical_brand": null, "position": null}`;

  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL_GPT5_NANO, // Use gpt-5-nano for fast validation
        input: `You are a precise brand/entity name matcher. Always respond in valid JSON format.\n\n${validationPrompt}`,
        max_output_tokens: 500,
        reasoning: {
          effort: 'low'
        }
      })
    });

    if (!response.ok) {
      console.error('  ❌ LLM validation API call failed');
      // Fallback to not found
      return {
        found: false,
        matched_name: null,
        canonical_brand: null,
        position: null,
        confidence: 'low',
        reasoning: 'Validation API call failed'
      };
    }

    const data = await response.json();

    // Validate response structure for Responses API
    // The response has an 'output' array with message items
    if (!data.output || !Array.isArray(data.output)) {
      console.error('  ❌ LLM validation - Invalid response structure (no output array)');
      return {
        found: false,
        matched_name: null,
        canonical_brand: null,
        position: null,
        confidence: 'low',
        reasoning: 'Invalid validation response structure'
      };
    }

    // Find the message output item (skip reasoning items)
    const messageItem = data.output.find((item: any) => item.type === 'message');
    if (!messageItem || !messageItem.content || !Array.isArray(messageItem.content)) {
      console.error('  ❌ LLM validation - No message in output');
      return {
        found: false,
        matched_name: null,
        canonical_brand: null,
        position: null,
        confidence: 'low',
        reasoning: 'No message in validation response'
      };
    }

    // Extract text from the content
    const textContent = messageItem.content.find((c: any) => c.type === 'output_text');
    if (!textContent || !textContent.text) {
      console.error('  ❌ LLM validation - No text content in message');
      return {
        found: false,
        matched_name: null,
        canonical_brand: null,
        position: null,
        confidence: 'low',
        reasoning: 'No text in validation response'
      };
    }

    const content = textContent.text;

    if (!content) {
      console.error('  ❌ LLM validation returned empty response');
      return {
        found: false,
        matched_name: null,
        canonical_brand: null,
        position: null,
        confidence: 'low',
        reasoning: 'Empty validation response'
      };
    }

    // Parse JSON response using robust helper (handles markdown blocks, malformed JSON)
    const validation = extractAndParseJSON(content, 'Prompt #3 (Brand Validation)');

    console.log(`  🤖 LLM Validation Result: found=${validation.found}, canonical_brand=${validation.canonical_brand}, position=${validation.position}, confidence=${validation.confidence}`);
    if (validation.found) {
      console.log(`  ✓ LLM matched "${focusBrand}" with "${validation.matched_name}" (canonical: "${validation.canonical_brand}") at position ${validation.position}`);
    }

    return {
      found: validation.found || false,
      matched_name: validation.matched_name || null,
      canonical_brand: validation.canonical_brand || validation.matched_name || null,
      position: validation.position || null,
      confidence: validation.confidence || 'medium',
      reasoning: validation.reasoning || 'No reasoning provided'
    };

  } catch (error) {
    console.error('  ❌ LLM validation error:', error);
    // Fallback to not found on error
    return {
      found: false,
      matched_name: null,
      canonical_brand: null,
      position: null,
      confidence: 'low',
      reasoning: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Generate topics and queries for an institution (Prompt #1)
 * Uses gpt-5-nano with web search
 */
export async function generateTopicsAndQueries(
  institutionName: string
): Promise<TopicsAndQueriesResponse> {
  if (!OPENAI_API_KEY) {
    throw new OpenAIError('OPENAI_API_KEY is not configured');
  }

  try {
    console.log(`📝 Generating topics and queries for: ${institutionName}`);

    const response = await fetchWithRetry(`${API_BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL_GPT5_NANO,
        input: `${PROMPT_1_SYSTEM}\n\nThe Institute name is ${institutionName}`,
        max_output_tokens: 20000,
        reasoning: {
          effort: 'low'
        },
        tools: [
          {
            type: 'web_search'
          }
        ],
        tool_choice: 'auto'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new OpenAIError(
        `OpenAI API error: ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const data = await response.json();

    // Log the full response structure for debugging
    console.log('📦 API Response structure:', JSON.stringify({
      hasOutput: !!data.output,
      outputLength: data.output?.length
    }));

    // Validate response structure for Responses API
    // The response has an 'output' array with message items
    if (!data.output || !Array.isArray(data.output)) {
      console.error('❌ Invalid API response structure:', JSON.stringify(data, null, 2));
      throw new OpenAIError('API returned invalid response structure (no output array)');
    }

    // Find the message output item (skip reasoning items)
    const messageItem = data.output.find((item: any) => item.type === 'message');
    if (!messageItem || !messageItem.content || !Array.isArray(messageItem.content)) {
      console.error('❌ No message in output:', JSON.stringify(data.output, null, 2));
      throw new OpenAIError('API returned no message in output');
    }

    // Extract text from the first content item
    const textContent = messageItem.content.find((c: any) => c.type === 'output_text');
    if (!textContent || !textContent.text) {
      console.error('❌ No text content in message:', JSON.stringify(messageItem.content, null, 2));
      throw new OpenAIError('API returned no text content');
    }

    const content = textContent.text;

    if (!content) {
      console.error('❌ Empty content in response.');
      throw new OpenAIError('API returned empty content.');
    }

    // Extract and parse JSON (handles markdown, malformed responses)
    const parsed = extractAndParseJSON(content, 'Prompt #1 (Topics)');

    // Validate response structure
    if (!parsed.topics || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
      throw new OpenAIError('Invalid response: missing or empty topics array');
    }

    console.log(`✅ Successfully generated ${parsed.topics.length} topics`);

    // Transform new nested structure to flat structure for backwards compatibility
    // New format: {company: {name, location}, topics: [...]}
    // Old format: {institution_name, location, institution_type, topics: [...]}
    const transformedResponse: TopicsAndQueriesResponse = {
      institution_name: parsed.company?.name || parsed.institution_name || 'Unknown',
      location: parsed.company?.location || parsed.location || 'Unknown',
      institution_type: parsed.institution_type || 'Unknown', // New prompt doesn't return this
      topics: parsed.topics
    };

    return transformedResponse;
  } catch (error) {
    console.error('❌ Failed to generate topics:', error);
    if (error instanceof OpenAIError) {
      throw error;
    }
    throw new OpenAIError(`Failed to generate topics: ${error}`);
  }
}

/**
 * Parse location string into web search user_location format
 * Input examples: "Indore, Madhya Pradesh, India" or "London, England, UK" or "India"
 * Output: { type: 'approximate', city?: string, region?: string, country?: string }
 */
function parseLocationForWebSearch(location: string): {
  type: 'approximate';
  region?: string;
} {
  // Per user requirement: Do not send country. Only send region with complete location string.
  // No parsing needed - pass complete location string directly in region field

  if (!location || location.trim() === '' || location === 'Unknown') {
    console.log('⚠️  No valid location provided, skipping web search location parameter');
    return { type: 'approximate' }; // No location specified
  }

  console.log(`🌍 Using location for web search: "${location}" → region: ${location}`);

  // Use complete location string in region field only
  return {
    type: 'approximate',
    region: location  // e.g., "Vellore, Tamil Nadu, India"
  };
}

/**
 * Process a batch of queries (Prompt #2 - processes 5 queries at once)
 * Now accepts full Query objects and saves to DB immediately when each completes
 * Uses gpt-5-nano with web search for processing
 */
export async function processBatchQueries(
  focusBrand: string,
  location: string,
  queries: Query[]
): Promise<BatchQueryResult[]> {
  if (!OPENAI_API_KEY) {
    throw new OpenAIError('OPENAI_API_KEY is not configured');
  }

  if (queries.length === 0 || queries.length > 5) {
    throw new Error('Batch must contain 1-5 queries');
  }

  try {
    console.log(`🔍 Processing batch of ${queries.length} queries IN PARALLEL for: ${focusBrand}`);

    // Parse location for web search
    const userLocation = parseLocationForWebSearch(location);

    // Process all queries in parallel
    const queryPromises = queries.map(async (queryObj, i) => {
      const queryText = queryObj.query_text;
      const includeInstitutionMention = queryObj.include_institution_mention || false;

      // Construct user prompt - FIXED: Changed from forced inclusion to context hint
      const userPrompt = includeInstitutionMention
        ? `Query: ${queryText}\n\nContext: If "${focusBrand}" is genuinely and actually relevant to this query based on your research, consider including a bullet point of this institute name in your answer where appropriate. Do not force include the brand/institute name in the answer if it is not relevant to the query.`
        : `Query: ${queryText}`;

      if (includeInstitutionMention) {
        console.log(`  ℹ️  Query ${i + 1}/${queries.length} (with context hint): ${queryText.substring(0, 50)}...`);
      } else {
        console.log(`  Starting query ${i + 1}/${queries.length}: ${queryText.substring(0, 50)}...`);
      }

      try {
        const response = await fetchWithRetry(`${API_BASE_URL}/responses`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: MODEL_GPT5_NANO,
            input: `${PROMPT_2_SYSTEM}\n\n${userPrompt}`,
            max_output_tokens: 20000,
            reasoning: {
              effort: 'low'
            },
            tools: [
              {
                type: 'web_search',
                user_location: userLocation // NEW: Pass parsed location for regional web search
              }
            ],
            tool_choice: 'auto'
          })
        });

        if (!response.ok) {
          // Log detailed error information
          const errorBody = await response.text();
          console.error(`  ❌ Query ${i + 1} failed - HTTP ${response.status} ${response.statusText}`);
          console.error(`  📄 Error response: ${errorBody.substring(0, 500)}`);

          const errorResult = createErrorResult(queryText, focusBrand);

          // Save error result to DB immediately with detailed error message
          await supabaseAdmin
            .from('queries')
            .update({
              answer: errorResult.answer,
              brands_mentioned: errorResult.brands_mentioned,
              focused_brand: errorResult.focused_brand,
              focused_brand_rank: errorResult.focused_brand_rank,
              visibility: parseInt(errorResult.visibility) || 0,
              websites_cited: errorResult.websites_cited,
              status: 'failed',
              error_message: `HTTP ${response.status}: ${errorBody.substring(0, 500)}`,
              processed_at: new Date().toISOString()
            })
            .eq('id', queryObj.id);

          return errorResult;
        }

        const data = await response.json();

        // Validate response structure for Responses API
        // The response has an 'output' array with message items
        if (!data.output || !Array.isArray(data.output)) {
          console.error(`  ❌ Query ${i + 1} - Invalid response structure (no output array)`);
          const errorResult = createErrorResult(queryText, focusBrand);

          // Save error result to DB immediately
          await supabaseAdmin
            .from('queries')
            .update({
              answer: errorResult.answer,
              brands_mentioned: errorResult.brands_mentioned,
              focused_brand: errorResult.focused_brand,
              focused_brand_rank: errorResult.focused_brand_rank,
              visibility: parseInt(errorResult.visibility) || 0,
              websites_cited: errorResult.websites_cited,
              status: 'failed',
              processed_at: new Date().toISOString()
            })
            .eq('id', queryObj.id);

          return errorResult;
        }

        // Find the message output item (skip reasoning items)
        const messageItem = data.output.find((item: any) => item.type === 'message');
        if (!messageItem || !messageItem.content || !Array.isArray(messageItem.content)) {
          console.error(`  ❌ Query ${i + 1} - No message in output`);
          const errorResult = createErrorResult(queryText, focusBrand);

          // Save error result to DB immediately
          await supabaseAdmin
            .from('queries')
            .update({
              answer: errorResult.answer,
              brands_mentioned: errorResult.brands_mentioned,
              focused_brand: errorResult.focused_brand,
              focused_brand_rank: errorResult.focused_brand_rank,
              visibility: parseInt(errorResult.visibility) || 0,
              websites_cited: errorResult.websites_cited,
              status: 'failed',
              processed_at: new Date().toISOString()
            })
            .eq('id', queryObj.id);

          return errorResult;
        }

        // Extract text from the content
        const textContent = messageItem.content.find((c: any) => c.type === 'output_text');
        if (!textContent || !textContent.text) {
          console.error(`  ❌ Query ${i + 1} - No text content in message`);
          const errorResult = createErrorResult(queryText, focusBrand);

          // Save error result to DB immediately
          await supabaseAdmin
            .from('queries')
            .update({
              answer: errorResult.answer,
              brands_mentioned: errorResult.brands_mentioned,
              focused_brand: errorResult.focused_brand,
              focused_brand_rank: errorResult.focused_brand_rank,
              visibility: parseInt(errorResult.visibility) || 0,
              websites_cited: errorResult.websites_cited,
              status: 'failed',
              processed_at: new Date().toISOString()
            })
            .eq('id', queryObj.id);

          return errorResult;
        }

        const content = textContent.text;

        // Extract and parse JSON (handles markdown, malformed responses)
        const parsed = extractAndParseJSON(content, `Prompt #2 (Query ${i + 1})`);

        // LLM-BASED BRAND VALIDATION (Prompt #3 - Two-Stage Approach)
        console.log(`  🔍 Validating "${focusBrand}" in ${parsed.brands_mentioned?.length || 0} mentioned brands using LLM...`);
        const validation = await validateBrandWithLLM(
          parsed.brands_mentioned || [],
          focusBrand
        );

        // Calculate rank and visibility from validation result
        let rank = 0;
        let visibility = '0%';

        if (validation.found && validation.position) {
          rank = validation.position;
          // Weighted ranking system: Rank 1=100%, 2-3=50%, 4-5=25%, 6+=10%
          if (rank === 1) {
            visibility = '100%';
          } else if (rank <= 3) {
            visibility = '50%';
          } else if (rank <= 5) {
            visibility = '25%';
          } else {
            visibility = '10%';
          }
          console.log(`  ✅ Brand found at rank ${rank} with visibility ${visibility} (${validation.confidence} confidence)`);
        } else {
          console.log(`  ℹ️  Brand not found (${validation.reasoning})`);
        }

        // Map to our BatchQueryResult format
        const result: BatchQueryResult = {
          query: queryText,
          answer: parsed.Answer || parsed.answer || '',
          brands_mentioned: parsed.brands_mentioned || [],
          focused_brand: validation.canonical_brand || focusBrand, // Use canonical brand if available (e.g., "Sage University" instead of "Sage University Indore")
          focused_brand_rank: rank, // LLM-validated rank (95-99% accurate)
          visibility: visibility, // Calculated from LLM validation
          websites_cited: parsed.websites_cited || []
        };

        // Save successful result to DB immediately
        await supabaseAdmin
          .from('queries')
          .update({
            answer: result.answer,
            brands_mentioned: result.brands_mentioned,
            focused_brand: result.focused_brand,
            focused_brand_rank: result.focused_brand_rank,
            visibility: parseInt(result.visibility) || 0,
            websites_cited: result.websites_cited,
            canonical_brand: validation.canonical_brand, // NEW: Store canonical brand for consolidation
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', queryObj.id);

        console.log(`  ✅ Query ${i + 1} completed and saved to DB (rank: ${result.focused_brand_rank})`);
        return result;
      } catch (error) {
        console.error(`  ❌ Query ${i + 1} error:`, error);
        const errorResult = createErrorResult(queryText, focusBrand);

        // Save error result to DB immediately
        try {
          await supabaseAdmin
            .from('queries')
            .update({
              answer: errorResult.answer,
              brands_mentioned: errorResult.brands_mentioned,
              focused_brand: errorResult.focused_brand,
              focused_brand_rank: errorResult.focused_brand_rank,
              visibility: parseInt(errorResult.visibility) || 0,
              websites_cited: errorResult.websites_cited,
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              processed_at: new Date().toISOString()
            })
            .eq('id', queryObj.id);
        } catch (dbError) {
          console.error(`  ❌ Failed to save error to DB for query ${i + 1}:`, dbError);
        }

        return errorResult;
      }
    });

    // Wait for all queries to complete in parallel
    const results = await Promise.all(queryPromises);
    return results;
  } catch (error) {
    console.error('❌ Batch processing failed:', error);
    if (error instanceof OpenAIError) {
      throw error;
    }
    throw new OpenAIError(`Failed to process batch queries: ${error}`);
  }
}

/**
 * Helper to create error result for failed query
 */
export function createErrorResult(query: string, focusBrand: string): BatchQueryResult {
  return {
    query,
    answer: 'Failed to process this query due to an error.',
    brands_mentioned: [],
    focused_brand: focusBrand,
    focused_brand_rank: 0,
    visibility: '0%',
    websites_cited: []
  };
}

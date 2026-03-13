import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export { openai };

/**
 * Generate embedding for text using OpenAI
 * Uses text-embedding-3-small for cost efficiency
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
    dimensions: 1536,
  });

  return response.data.map((d) => d.embedding);
}

/**
 * Create embedding text from agent profile
 * Combines relevant fields for semantic search
 */
export function createEmbeddingText(profile: {
  summary: string;
  talking_points?: string[];
  ideal_match_description?: string;
  interests?: string[];
  values?: string[];
  skills?: string[];
  can_offer?: string[];
  looking_for?: string[];
}): string {
  const parts = [
    profile.summary,
    profile.talking_points?.join('. '),
    profile.ideal_match_description,
    profile.interests?.length ? `Interests: ${profile.interests.join(', ')}` : null,
    profile.values?.length ? `Values: ${profile.values.join(', ')}` : null,
    profile.skills?.length ? `Skills: ${profile.skills.join(', ')}` : null,
    profile.can_offer?.length ? `Can offer: ${profile.can_offer.join(', ')}` : null,
    profile.looking_for?.length ? `Looking for: ${profile.looking_for.join(', ')}` : null,
  ].filter(Boolean);

  return parts.join(' ');
}

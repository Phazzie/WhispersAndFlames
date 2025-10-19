'use server';

import { generateVisualMemory } from '@/ai/flows/generate-visual-memory';

export interface GenerateSessionImageResult {
  imageUrl: string;
  prompt: string;
}

/**
 * Generates a visual memory for a session.
 * In a production environment, this would call an actual image generation API
 * (like Stability AI or DALL-E). For this implementation, we create a
 * placeholder gradient based on the prompt.
 */
export async function generateSessionImage(
  summary: string,
  spicyLevel: string,
  sharedThemes: string[]
): Promise<GenerateSessionImageResult | null> {
  const startTime = Date.now();
  
  try {
    console.log('[ImageGeneration] Starting generation with:', {
      summaryLength: summary.length,
      spicyLevel,
      themesCount: sharedThemes.length,
    });

    // Validate inputs
    if (!summary || summary.trim().length === 0) {
      console.error('[ImageGeneration] Invalid summary: empty or undefined');
      return null;
    }

    // Generate the artistic prompt using AI
    const result = await generateVisualMemory({
      summary,
      spicyLevel,
      sharedThemes,
    });

    if (!result || !result.imagePrompt) {
      console.error('[ImageGeneration] AI returned invalid result:', result);
      return null;
    }

    console.log('[ImageGeneration] AI prompt generated:', {
      promptLength: result.imagePrompt.length,
      safetyLevel: result.safetyLevel,
    });

    // In production, you would call an image generation API here:
    // const imageResponse = await fetch('https://api.stability.ai/v1/generation/...')
    // For now, we create a placeholder gradient SVG

    const imageUrl = createPlaceholderImage(result.imagePrompt, spicyLevel);

    const elapsed = Date.now() - startTime;
    console.log(`[ImageGeneration] Generated successfully in ${elapsed}ms`);

    return {
      imageUrl,
      prompt: result.imagePrompt,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[ImageGeneration] Failed after ${elapsed}ms:`, error);
    
    // Log additional context
    if (error instanceof Error) {
      console.error('[ImageGeneration] Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    
    return null;
  }
}

/**
 * Creates a placeholder SVG gradient image based on the spicy level.
 * In production, this would be replaced with actual AI-generated images.
 */
function createPlaceholderImage(prompt: string, spicyLevel: string): string {
  try {
    // Color schemes based on spicy level
    const colorSchemes: Record<string, { start: string; end: string }> = {
      Mild: { start: '#FFE5B4', end: '#FFD1DC' },
      Medium: { start: '#FFB347', end: '#FF6961' },
      Hot: { start: '#FF6961', end: '#D46A4E' },
      'Extra-Hot': { start: '#D46A4E', end: '#A93226' },
    };

    const colors = colorSchemes[spicyLevel] || colorSchemes.Mild;
    
    if (!colorSchemes[spicyLevel]) {
      console.warn(`[ImageGeneration] Unknown spicy level: ${spicyLevel}, using Mild`);
    }

    // Sanitize prompt for SVG
    const sanitizedPrompt = prompt
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const displayPrompt =
      sanitizedPrompt.length > 100 ? sanitizedPrompt.substring(0, 97) + '...' : sanitizedPrompt;

    // Create a simple gradient SVG
    const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.start};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.end};stop-opacity:1" />
        </linearGradient>
        <filter id="blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
        </filter>
      </defs>
      <rect width="800" height="600" fill="url(#grad1)" />
      <circle cx="200" cy="200" r="150" fill="${colors.end}" opacity="0.3" filter="url(#blur)" />
      <circle cx="600" cy="400" r="180" fill="${colors.start}" opacity="0.4" filter="url(#blur)" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            font-family="Arial, sans-serif" font-size="20" fill="white" opacity="0.8"
            style="text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
        ${displayPrompt}
      </text>
    </svg>
  `.trim();

    // Convert SVG to data URI
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return dataUri;
  } catch (error) {
    console.error('[ImageGeneration] Error creating placeholder image:', error);
    // Return a minimal fallback SVG
    const fallbackSvg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#212936"/></svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(fallbackSvg).toString('base64')}`;
  }
}

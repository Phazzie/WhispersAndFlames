'use server';

import { generateVisualMemory } from '@/ai/flows/generate-visual-memory';
import { createLogger } from '@/lib/utils/logger';
import { generateImageFromPrompt } from '@/lib/xai-image';

const logger = createLogger('image-generation');

export interface GenerateSessionImageResult {
  imageUrl: string;
  prompt: string;
  /** True when the image API failed and a gradient stand-in was returned. */
  isPlaceholder: boolean;
}

/**
 * Generates a visual memory for a session: the Visual Poet persona writes an
 * abstract image prompt, then xAI's image model renders it. If the image call
 * fails, a gradient stand-in is returned (flagged with isPlaceholder) so the
 * player still gets something instead of an error.
 */
export async function generateSessionImage(
  summary: string,
  spicyLevel: string,
  sharedThemes: string[]
): Promise<GenerateSessionImageResult | null> {
  const startTime = Date.now();

  try {
    logger.info('Starting generation', {
      summaryLength: summary.length,
      spicyLevel,
      themesCount: sharedThemes.length,
    });

    // Validate inputs
    if (!summary || summary.trim().length === 0) {
      logger.error('Invalid summary: empty or undefined');
      return null;
    }

    // Generate the artistic prompt using AI
    const result = await generateVisualMemory({
      summary,
      spicyLevel,
      sharedThemes,
    });

    if (!result || !result.imagePrompt) {
      logger.error('AI returned invalid result', undefined, { result });
      return null;
    }

    logger.info('AI prompt generated', {
      promptLength: result.imagePrompt.length,
      safetyLevel: result.safetyLevel,
    });

    let imageUrl: string;
    let isPlaceholder = false;
    try {
      imageUrl = await generateImageFromPrompt(result.imagePrompt);
    } catch (imageError) {
      logger.error('Image render failed; using gradient placeholder', imageError);
      imageUrl = createPlaceholderImage(result.imagePrompt, spicyLevel);
      isPlaceholder = true;
    }

    const elapsed = Date.now() - startTime;
    logger.info('Generated successfully', { elapsedMs: elapsed, isPlaceholder });

    return {
      imageUrl,
      prompt: result.imagePrompt,
      isPlaceholder,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logger.error('Failed to generate image', error, { elapsedMs: elapsed });

    // Log additional context
    if (error instanceof Error) {
      logger.error('Error details', undefined, {
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
      logger.warn('Unknown spicy level; using Mild fallback', { spicyLevel });
    }

    // Sanitize prompt for SVG
    // Escape & first so the entities produced below aren't double-escaped.
    const sanitizedPrompt = prompt
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
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
    logger.error('Error creating placeholder image', error);
    // Return a minimal fallback SVG
    const fallbackSvg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#212936"/></svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(fallbackSvg).toString('base64')}`;
  }
}

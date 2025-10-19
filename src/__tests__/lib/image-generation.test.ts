import { describe, it, expect, vi } from 'vitest';

// Mock the AI flow before importing
vi.mock('@/ai/flows/generate-visual-memory', () => ({
  generateVisualMemory: vi.fn(),
}));

describe('Image Generation', () => {
  describe('generateSessionImage', () => {
    it('should generate image with valid inputs', async () => {
      const { generateVisualMemory } = await import('@/ai/flows/generate-visual-memory');
      const { generateSessionImage } = await import('@/lib/image-generation');

      // Mock successful AI response
      vi.mocked(generateVisualMemory).mockResolvedValue({
        imagePrompt: 'Watercolor painting of intertwined light trails',
        safetyLevel: 'safe',
      });

      const result = await generateSessionImage(
        'Test summary',
        'Mild',
        ['Hidden Attractions', 'Emotional Depths']
      );

      expect(result).not.toBeNull();
      expect(result?.imageUrl).toContain('data:image/svg+xml;base64,');
      expect(result?.prompt).toBe('Watercolor painting of intertwined light trails');
    });

    it('should return null if AI generation fails', async () => {
      const { generateVisualMemory } = await import('@/ai/flows/generate-visual-memory');
      const { generateSessionImage } = await import('@/lib/image-generation');

      // Mock AI failure
      vi.mocked(generateVisualMemory).mockRejectedValue(new Error('AI service unavailable'));

      const result = await generateSessionImage('Test summary', 'Mild', ['Test']);

      expect(result).toBeNull();
    });

    it('should use appropriate color scheme for Mild', async () => {
      const { generateVisualMemory } = await import('@/ai/flows/generate-visual-memory');
      const { generateSessionImage } = await import('@/lib/image-generation');

      vi.mocked(generateVisualMemory).mockResolvedValue({
        imagePrompt: 'Test prompt',
        safetyLevel: 'safe',
      });

      const result = await generateSessionImage('Summary', 'Mild', []);

      expect(result).not.toBeNull();
      // SVG should contain Mild color scheme
      const decoded = Buffer.from(result!.imageUrl.split(',')[1], 'base64').toString();
      expect(decoded).toContain('#FFE5B4'); // Mild start color
    });

    it('should use appropriate color scheme for Extra-Hot', async () => {
      const { generateVisualMemory } = await import('@/ai/flows/generate-visual-memory');
      const { generateSessionImage } = await import('@/lib/image-generation');

      vi.mocked(generateVisualMemory).mockResolvedValue({
        imagePrompt: 'Test prompt',
        safetyLevel: 'moderate',
      });

      const result = await generateSessionImage('Summary', 'Extra-Hot', []);

      expect(result).not.toBeNull();
      const decoded = Buffer.from(result!.imageUrl.split(',')[1], 'base64').toString();
      expect(decoded).toContain('#D46A4E'); // Extra-Hot color
    });

    it('should truncate long prompts in SVG', async () => {
      const { generateVisualMemory } = await import('@/ai/flows/generate-visual-memory');
      const { generateSessionImage } = await import('@/lib/image-generation');

      const longPrompt = 'A'.repeat(150);
      vi.mocked(generateVisualMemory).mockResolvedValue({
        imagePrompt: longPrompt,
        safetyLevel: 'safe',
      });

      const result = await generateSessionImage('Summary', 'Medium', []);

      expect(result).not.toBeNull();
      expect(result!.prompt).toBe(longPrompt);
      const decoded = Buffer.from(result!.imageUrl.split(',')[1], 'base64').toString();
      expect(decoded).toContain('...'); // Should be truncated in SVG
    });

    it('should handle empty shared themes', async () => {
      const { generateVisualMemory } = await import('@/ai/flows/generate-visual-memory');
      const { generateSessionImage } = await import('@/lib/image-generation');

      vi.mocked(generateVisualMemory).mockResolvedValue({
        imagePrompt: 'Test',
        safetyLevel: 'safe',
      });

      const result = await generateSessionImage('Summary', 'Medium', []);

      expect(result).not.toBeNull();
      expect(generateVisualMemory).toHaveBeenCalledWith({
        summary: 'Summary',
        spicyLevel: 'Medium',
        sharedThemes: [],
      });
    });

    it('should fallback to Mild colors for unknown spicy level', async () => {
      const { generateVisualMemory } = await import('@/ai/flows/generate-visual-memory');
      const { generateSessionImage } = await import('@/lib/image-generation');

      vi.mocked(generateVisualMemory).mockResolvedValue({
        imagePrompt: 'Test',
        safetyLevel: 'safe',
      });

      const result = await generateSessionImage('Summary', 'UnknownLevel', []);

      expect(result).not.toBeNull();
      const decoded = Buffer.from(result!.imageUrl.split(',')[1], 'base64').toString();
      expect(decoded).toContain('#FFE5B4'); // Falls back to Mild
    });
  });
});

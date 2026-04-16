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

      const result = await generateSessionImage('Test summary', 'Mild', [
        'Hidden Attractions',
        'Emotional Depths',
      ]);

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

    it('should return null when summary is empty', async () => {
      const { generateSessionImage } = await import('@/lib/image-generation');

      const result = await generateSessionImage('', 'Mild', ['theme']);

      expect(result).toBeNull();
    });

    it('should return null when summary is only whitespace', async () => {
      const { generateSessionImage } = await import('@/lib/image-generation');

      const result = await generateSessionImage('   ', 'Mild', ['theme']);

      expect(result).toBeNull();
    });

    it('should return null when AI returns no imagePrompt', async () => {
      const { generateVisualMemory } = await import('@/ai/flows/generate-visual-memory');
      const { generateSessionImage } = await import('@/lib/image-generation');

      vi.mocked(generateVisualMemory).mockResolvedValue({
        imagePrompt: '',
        safetyLevel: 'safe',
      });

      const result = await generateSessionImage('Valid summary', 'Mild', []);

      expect(result).toBeNull();
    });

    it('should return null when AI returns null result', async () => {
      const { generateVisualMemory } = await import('@/ai/flows/generate-visual-memory');
      const { generateSessionImage } = await import('@/lib/image-generation');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(generateVisualMemory).mockResolvedValue(null as any);

      const result = await generateSessionImage('Valid summary', 'Mild', []);

      expect(result).toBeNull();
    });

    it('should use Medium color scheme', async () => {
      const { generateVisualMemory } = await import('@/ai/flows/generate-visual-memory');
      const { generateSessionImage } = await import('@/lib/image-generation');

      vi.mocked(generateVisualMemory).mockResolvedValue({
        imagePrompt: 'Test prompt',
        safetyLevel: 'safe',
      });

      const result = await generateSessionImage('Summary', 'Medium', []);

      expect(result).not.toBeNull();
      const decoded = Buffer.from(result!.imageUrl.split(',')[1], 'base64').toString();
      expect(decoded).toContain('#FFB347'); // Medium start color
    });

    it('should use Hot color scheme', async () => {
      const { generateVisualMemory } = await import('@/ai/flows/generate-visual-memory');
      const { generateSessionImage } = await import('@/lib/image-generation');

      vi.mocked(generateVisualMemory).mockResolvedValue({
        imagePrompt: 'Test prompt',
        safetyLevel: 'safe',
      });

      const result = await generateSessionImage('Summary', 'Hot', []);

      expect(result).not.toBeNull();
      const decoded = Buffer.from(result!.imageUrl.split(',')[1], 'base64').toString();
      expect(decoded).toContain('#FF6961'); // Hot start color
    });

    it('should sanitize special HTML characters in prompt for SVG', async () => {
      const { generateVisualMemory } = await import('@/ai/flows/generate-visual-memory');
      const { generateSessionImage } = await import('@/lib/image-generation');

      vi.mocked(generateVisualMemory).mockResolvedValue({
        imagePrompt: '<script>alert("xss")</script>',
        safetyLevel: 'safe',
      });

      const result = await generateSessionImage('Summary', 'Mild', []);

      expect(result).not.toBeNull();
      const decoded = Buffer.from(result!.imageUrl.split(',')[1], 'base64').toString();
      // Raw <script> tag must not appear literally in the SVG output
      expect(decoded).not.toContain('<script>');
    });
  });
});

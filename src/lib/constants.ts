import { Flame, Heart, Drama, BrainCircuit, Handshake, Sun, Moon, Gem, Lightbulb, Swords, Wind, Zap, Sunrise } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Category = {
  name: string;
  icon: LucideIcon;
  description: string;
};

export const CATEGORIES: Category[] = [
  { name: 'Hidden Attractions', icon: Heart, description: 'Unspoken desires and secret attractions.' },
  { name: 'Power Play', icon: Swords, description: 'Exploring dynamics of control and surrender.' },
  { name: 'Emotional Depths', icon: Drama, description: 'Deep feelings, vulnerabilities, and bonds.' },
  { name: 'Mind Games', icon: BrainCircuit, description: 'Intellectual and psychological connections.' },
  { name: 'Shared Pasts', icon: Moon, description: 'Reflecting on memories and experiences together.' },
  { name: 'Future Dreams', icon: Sun, description: 'Aspirations, hopes, and plans for the future.' },
  { name: 'Core Values', icon: Gem, description: 'What truly matters to each of you.' },
  { name: 'Bright Ideas', icon: Lightbulb, description: 'Creative and spontaneous thoughts.' },
  { name: 'Trust & Alliance', icon: Handshake, description: 'Building and testing your bond.' },
  { name: 'The Unspeakable', icon: Flame, description: 'Taboos, fantasies, and bold questions.' },
];

export type SpicyLevel = {
  name: 'Mild' | 'Medium' | 'Hot' | 'Extra-Hot';
  description: string;
  icon: LucideIcon;
};

export const SPICY_LEVELS: SpicyLevel[] = [
  { name: 'Mild', description: 'Gentle questions to warm things up. Perfect for getting started.', icon: Wind },
  { name: 'Medium', description: 'Getting a little more personal. Explores deeper feelings and thoughts.', icon: Sunrise },
  { name: 'Hot', description: 'Turning up the heat. Questions that are daring and provocative.', icon: Flame },
  { name: 'Extra-Hot', description: 'For the bold and adventurous. Pushes boundaries and explores fantasies.', icon: Zap },
];

export const QUESTIONS_PER_CATEGORY = 2;

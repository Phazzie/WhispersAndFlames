import { config } from 'dotenv';
config();

import '@/ai/flows/generate-contextual-questions.ts';
import '@/ai/flows/analyze-answers-and-generate-summary.ts';
import '@/ai/flows/generate-therapist-notes.ts';
import '@/ai/flows/generate-visual-memory.ts';

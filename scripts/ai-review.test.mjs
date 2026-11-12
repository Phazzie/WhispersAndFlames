import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clipDiff, commentDestination, reviewDecision, reviewPrompt } from './ai-review.mjs';

describe('ai review', () => {
  it('skips when the key is missing and reviews when it is set', () => {
    assert.equal(reviewDecision({}).action, 'skip');
    assert.equal(reviewDecision({ XAI_API_KEY: '  ' }).action, 'skip');
    assert.equal(reviewDecision({ XAI_API_KEY: 'xai-test' }).action, 'review');
  });

  it('clips a huge diff and keeps a short one', () => {
    assert.equal(clipDiff('small'), 'small');
    const huge = 'a'.repeat(20_000);
    const clipped = clipDiff(huge);
    assert.equal(clipped.endsWith('[diff truncated]'), true);
    assert.equal(clipped.length < huge.length, true);
  });

  it('comments on Origin when there is a pull request and no GitHub token', () => {
    assert.equal(commentDestination({ PR_NUMBER: '8' }), 'origin');
    assert.equal(commentDestination({}), 'stdout');
    assert.equal(
      commentDestination({
        PR_NUMBER: '8',
        GITHUB_TOKEN: 'ghs',
        GITHUB_REPOSITORY: 'Phazzie/WhispersAndFlames',
      }),
      'github'
    );
  });

  it('asks for bugs rather than style notes', () => {
    const prompt = reviewPrompt('diff --git a/game.ts');
    assert.match(prompt, /security|privacy|prompt/i);
    assert.match(prompt, /diff --git a\/game.ts/);
  });
});

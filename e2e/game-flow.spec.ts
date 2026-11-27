import { test, expect } from '@playwright/test';

import {
  clickTogether,
  createRoom,
  expectHeading,
  joinRoomByTyping,
  signedInPage,
} from './helpers';

test.describe('Signed-out visitor', () => {
  test('home page offers sign in and sign up', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Whispers|Flames/i);
    await expect(page.getByRole('button', { name: 'Show your badge' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request clearance' })).toBeVisible();
  });

  test('game routes bounce back to the home page', async ({ page }) => {
    await page.goto('/game/SOME-ROOM-CODE-12');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Online game, two devices', () => {
  test('a couple can play a full round from lobby to Dr. Ember', async ({ browser }) => {
    const alice = await signedInPage(browser, 'alice');
    const bob = await signedInPage(browser, 'bob');

    // Create and join. Bob types the code by hand: room codes are long
    // (e.g. TIGER-OWL-WOLF-42), so the field must accept them.
    const roomCode = await createRoom(alice, 'Alice');
    await expect(alice.getByText(roomCode).first()).toBeVisible();
    await joinRoomByTyping(bob, 'Bob', roomCode);

    // Lobby: both appear, then both ready up at the same instant.
    await expect(alice.getByText('Bob', { exact: true })).toBeVisible();
    await clickTogether(alice, bob, "I'm Ready!");

    // Categories: pick one shared category plus one each that the other
    // didn't, confirm together. Only the shared one should survive.
    await expectHeading(alice, 'Pull your files');
    await expectHeading(bob, 'Pull your files');
    await alice.getByRole('button', { name: 'Hidden Attractions' }).click();
    await alice.getByRole('button', { name: 'Power Play' }).click();
    await bob.getByRole('button', { name: 'Hidden Attractions' }).click();
    await bob.getByRole('button', { name: 'Mind Games' }).click();
    await expect(alice.getByRole('button', { name: 'Power Play' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(bob.getByRole('button', { name: 'Mind Games' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await clickTogether(alice, bob, 'Confirm Selections');

    // Spice: the milder pick wins.
    await expect(alice.getByRole('button', { name: 'Hot spice level', exact: true })).toBeVisible();
    await Promise.all([
      alice.getByRole('button', { name: 'Hot spice level', exact: true }).click(),
      bob.getByRole('button', { name: 'Mild spice level' }).click(),
    ]);

    // One shared category x 2 questions per category = 2 questions.
    for (const questionNumber of [1, 2]) {
      await expect(alice.getByText(`Question ${questionNumber} of 2`).first()).toBeVisible();
      await expect(bob.getByText(`Question ${questionNumber} of 2`).first()).toBeVisible();
      await expect(alice.getByText(/E2E question \d+/)).toBeVisible();

      await alice
        .getByLabel('Your answer to the current question')
        .fill(`Alice answer ${questionNumber}`);
      await bob
        .getByLabel('Your answer to the current question')
        .fill(`Bob answer ${questionNumber}`);
      await clickTogether(alice, bob, 'Submit your answer');

      // Both answers are revealed to both players.
      await expect(alice.getByText(`Bob answer ${questionNumber}`)).toBeVisible();
      await expect(bob.getByText(`Alice answer ${questionNumber}`)).toBeVisible();

      const next = questionNumber === 2 ? 'View game summary' : 'Proceed to next question';
      await clickTogether(alice, bob, next);
    }

    // Summary is generated, saved, and reaches both players.
    await expect(alice.getByText(/E2E Scribe summary/)).toBeVisible();
    await expect(bob.getByText(/E2E Scribe summary/)).toBeVisible();

    // Visual memory renders an image and counts down the allowance.
    await alice.getByRole('button', { name: /Generate Visual Memory \(3 left\)/ }).click();
    await expect(alice.getByAltText('Visual Memory')).toBeVisible();
    await expect(
      alice.getByRole('button', { name: /Generate Visual Memory \(2 left\)/ })
    ).toBeVisible();
    await expect(bob.getByAltText('Visual Memory')).toBeVisible();

    // Achievements tab.
    await alice.getByRole('tab', { name: 'Commendations' }).click();
    await expect(alice.getByRole('tabpanel')).toBeVisible();

    // Dr. Ember's notes load on demand.
    await bob.getByRole('tab', { name: /Dr\. Ember/ }).click();
    await expect(bob.getByText(/Dr\. Ember \(e2e\)/)).toBeVisible();
  });

  test('joining a room that does not exist shows an error, not a hang', async ({ browser }) => {
    const carol = await signedInPage(browser, 'carol');
    await carol.goto('/');
    await carol.getByLabel('Your alias').fill('Carol');
    await carol.getByLabel('Room code').fill('NOPE-NOPE-NOPE-11');
    await carol.getByRole('button', { name: 'Report in' }).click();
    await expect(carol.getByText('Room not found', { exact: false }).first()).toBeVisible();
    await expect(carol).toHaveURL(/\/$/);
  });

  test("a stranger cannot open someone else's room", async ({ browser }) => {
    const alice = await signedInPage(browser, 'alice2');
    const roomCode = await createRoom(alice, 'Alice');

    const mallory = await signedInPage(browser, 'mallory');
    await mallory.goto(`/game/${roomCode}`);
    await expect(
      mallory.getByText(/not a player|Forbidden|not authorized|Error/i).first()
    ).toBeVisible();
    await expect(mallory.getByText('Alice', { exact: true })).toHaveCount(0);
  });
});

test.describe('Local game, one device', () => {
  test('two players pass the device and finish a game', async ({ browser }) => {
    const page = await signedInPage(browser, 'dana');
    await page.goto('/');
    await page.getByLabel('Play on one device').click();
    await page.getByLabel('Agent 1 alias').fill('Dana');
    await page.getByLabel('Agent 2 alias').fill('Eli');
    await page.getByRole('button', { name: 'Open the file on this device' }).click();
    await page.waitForURL(/\/game\//);

    const takeDevice = async (name: string) => {
      await page.getByRole('button', { name: `I'm ${name}, show me` }).click();
    };

    // Lobby
    await takeDevice('Dana');
    await page.getByRole('button', { name: "I'm Ready!" }).click();
    await takeDevice('Eli');
    await page.getByRole('button', { name: "I'm Ready!" }).click();

    // Categories
    await takeDevice('Dana');
    await expectHeading(page, 'Pull your files');
    await page.getByRole('button', { name: 'Future Dreams' }).click();
    await page.getByRole('button', { name: 'Confirm Selections' }).click();
    await takeDevice('Eli');
    await page.getByRole('button', { name: 'Future Dreams' }).click();
    await page.getByRole('button', { name: 'Confirm Selections' }).click();

    // Spice
    await takeDevice('Dana');
    await page.getByRole('button', { name: 'Medium spice level' }).click();
    await takeDevice('Eli');
    await page.getByRole('button', { name: 'Medium spice level' }).click();

    // Two questions, each answered privately, then revealed.
    for (const n of [1, 2]) {
      await takeDevice('Dana');
      await expect(page.getByText(`Question ${n} of 2`).first()).toBeVisible();
      await page.getByLabel('Your answer to the current question').fill(`Dana says ${n}`);
      await page.getByRole('button', { name: 'Submit your answer' }).click();
      await takeDevice('Eli');
      // Eli must not see Dana's answer before answering.
      await expect(page.getByText(`Dana says ${n}`)).toHaveCount(0);
      await page.getByLabel('Your answer to the current question').fill(`Eli says ${n}`);
      await page.getByRole('button', { name: 'Submit your answer' }).click();

      await takeDevice('Dana');
      await expect(page.getByText(`Eli says ${n}`)).toBeVisible();
      const next = n === 2 ? 'View game summary' : 'Proceed to next question';
      await page.getByRole('button', { name: next }).click();
      await takeDevice('Eli');
      await page.getByRole('button', { name: next }).click();
    }

    await takeDevice('Dana');
    await expect(page.getByText(/E2E Scribe summary/)).toBeVisible();
  });
});

const ANIMALS: string[] = [
  'LION',
  'TIGER',
  'BEAR',
  'WOLF',
  'FOX',
  'EAGLE',
  'SHARK',
  'PANTHER',
  'LEOPARD',
  'JAGUAR',
  'COBRA',
  'VIPER',
  'DRAGON',
  'PHOENIX',
  'GRIFFIN',
  'HYDRA',
  'STALLION',
  'HAWK',
  'FALCON',
  'OWL',
  'RAVEN',
  'CROW',
  'BULL',
  'STAG',
  'BOAR',
  'RHINO',
];

const ROOM_CODE_PATTERN = /^[A-Z0-9-]{4,64}$/;

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRoomCode(): string {
  const parts = new Set<string>();
  while (parts.size < 3) {
    parts.add(getRandomItem(ANIMALS));
  }
  const number = Math.floor(10 + Math.random() * 90); // 10-99

  return `${[...parts].join('-')}-${number}`;
}

export function normalizeRoomCode(roomCode: string): string {
  const cleaned = roomCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
  return cleaned.replace(/^-+/, '').replace(/-+$/, '');
}

export function isValidRoomCode(roomCode: string): boolean {
  const normalized = normalizeRoomCode(roomCode);
  return ROOM_CODE_PATTERN.test(normalized);
}

export function applyChaosMode(
  baseLevel: 'Mild' | 'Medium' | 'Hot' | 'Extra-Hot',
  chaosEnabled: boolean
): { level: 'Mild' | 'Medium' | 'Hot' | 'Extra-Hot'; wasUpgraded: boolean } {
  try {
    if (!chaosEnabled) {
      return { level: baseLevel, wasUpgraded: false };
    }

    const randomValue = Math.random();
    if (randomValue > 0.2) {
      return { level: baseLevel, wasUpgraded: false };
    }

    const levels: Array<'Mild' | 'Medium' | 'Hot' | 'Extra-Hot'> = [
      'Mild',
      'Medium',
      'Hot',
      'Extra-Hot',
    ];
    const currentIndex = levels.indexOf(baseLevel);

    if (currentIndex === -1) {
      console.error('[ChaosMode] Invalid base level:', baseLevel);
      return { level: baseLevel, wasUpgraded: false };
    }

    if (currentIndex === levels.length - 1) {
      return { level: baseLevel, wasUpgraded: false };
    }

    const upgradedLevel = levels[currentIndex + 1];
    console.log(`[ChaosMode] Upgraded ${baseLevel} to ${upgradedLevel}`);
    return { level: upgradedLevel, wasUpgraded: true };
  } catch (error) {
    console.error('[ChaosMode] Error applying chaos mode:', error);
    return { level: baseLevel, wasUpgraded: false };
  }
}

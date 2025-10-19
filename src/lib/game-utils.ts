const ANIMALS: string[] = [
  'Lion',
  'Tiger',
  'Bear',
  'Wolf',
  'Fox',
  'Eagle',
  'Shark',
  'Panther',
  'Leopard',
  'Jaguar',
  'Cobra',
  'Viper',
  'Dragon',
  'Phoenix',
  'Griffin',
  'Hydra',
  'Stallion',
  'Hawk',
  'Falcon',
  'Owl',
  'Raven',
  'Crow',
  'Bull',
  'Stag',
  'Boar',
  'Rhino',
];

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

export function applyChaosMode(
  baseLevel: 'Mild' | 'Medium' | 'Hot' | 'Extra-Hot',
  chaosEnabled: boolean
): { level: 'Mild' | 'Medium' | 'Hot' | 'Extra-Hot'; wasUpgraded: boolean } {
  if (!chaosEnabled || Math.random() > 0.2) {
    return { level: baseLevel, wasUpgraded: false };
  }

  const levels: Array<'Mild' | 'Medium' | 'Hot' | 'Extra-Hot'> = [
    'Mild',
    'Medium',
    'Hot',
    'Extra-Hot',
  ];
  const currentIndex = levels.indexOf(baseLevel);
  if (currentIndex === levels.length - 1) {
    return { level: baseLevel, wasUpgraded: false };
  }

  const upgradedLevel = levels[currentIndex + 1];
  return { level: upgradedLevel, wasUpgraded: true };
}

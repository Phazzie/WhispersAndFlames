const ANIMALS: string[] = [
  'Lion', 'Tiger', 'Bear', 'Wolf', 'Fox', 'Eagle', 'Shark', 'Panther', 'Leopard',
  'Jaguar', 'Cobra', 'Viper', 'Dragon', 'Phoenix', 'Griffin', 'Hydra', 'Stallion',
  'Hawk', 'Falcon', 'Owl', 'Raven', 'Crow', 'Bull', 'Stag', 'Boar', 'Rhino',
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

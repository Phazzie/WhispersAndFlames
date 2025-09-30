const ANIMALS: string[] = [
  'Lion', 'Tiger', 'Bear', 'Wolf', 'Fox', 'Eagle', 'Shark', 'Panther', 'Leopard',
  'Jaguar', 'Cobra', 'Viper', 'Dragon', 'Phoenix', 'Griffin', 'Hydra', 'Stallion',
  'Hawk', 'Falcon', 'Owl', 'Raven', 'Crow', 'Bull', 'Stag', 'Boar', 'Rhino',
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRoomCode(): string {
  const animal1 = getRandomItem(ANIMALS);
  const animal2 = getRandomItem(ANIMALS);
  const animal3 = getRandomItem(ANIMALS);
  const number = Math.floor(10 + Math.random() * 90); // 10-99

  // Ensure animals are not the same for more variety
  let finalAnimal2 = animal2;
  while (finalAnimal2 === animal1) {
    finalAnimal2 = getRandomItem(ANIMALS);
  }
  let finalAnimal3 = animal3;
  while (finalAnimal3 === animal1 || finalAnimal3 === finalAnimal2) {
    finalAnimal3 = getRandomItem(ANIMALS);
  }

  return `${animal1}-${finalAnimal2}-${finalAnimal3}-${number}`;
}

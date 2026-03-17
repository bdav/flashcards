import { prisma } from '../apps/api/src/db.js';
import { hashPassword } from '../apps/api/src/auth/password.js';

const SEED_DECK_IDS = [
  'seed-deck-world-capitals',
  'seed-deck-basic-math',
  'seed-deck-spanish-vocab',
  'seed-deck-programming',
];

async function main() {
  const passwordHash = await hashPassword('password');

  // Create or find the default dev user
  const user = await prisma.user.upsert({
    where: { id: 'seed-user-dev' },
    update: { passwordHash },
    create: {
      id: 'seed-user-dev',
      email: 'dev@example.com',
      passwordHash,
    },
  });

  console.log(`Seeded user: ${user.email} (${user.id}) — password: "password"`);

  // Clean up only known seed decks for idempotent re-runs (preserves manually created decks)
  await prisma.deck.deleteMany({
    where: { id: { in: SEED_DECK_IDS } },
  });

  // --- Deck 1: World Capitals ---
  const capitals = await prisma.deck.create({
    data: {
      id: 'seed-deck-world-capitals',
      name: 'World Capitals',
      description: 'Test your knowledge of world capitals',
      userId: user.id,
      cards: {
        create: [
          { front: 'What is the capital of France?', back: 'Paris' },
          { front: 'What is the capital of Japan?', back: 'Tokyo' },
          { front: 'What is the capital of Brazil?', back: 'Brasília' },
          { front: 'What is the capital of Australia?', back: 'Canberra' },
          { front: 'What is the capital of Canada?', back: 'Ottawa' },
          { front: 'What is the capital of Egypt?', back: 'Cairo' },
          { front: 'What is the capital of South Korea?', back: 'Seoul' },
          { front: 'What is the capital of Argentina?', back: 'Buenos Aires' },
          {
            front: 'What is the capital of South Africa (executive)?',
            back: 'Pretoria',
          },
          { front: 'What is the capital of Thailand?', back: 'Bangkok' },
        ],
      },
    },
    include: { cards: true },
  });

  console.log(
    `Seeded deck: ${capitals.name} with ${capitals.cards.length} cards`,
  );

  // --- Deck 2: Basic Math ---
  const math = await prisma.deck.create({
    data: {
      id: 'seed-deck-basic-math',
      name: 'Basic Math',
      description: 'Arithmetic and simple math facts',
      userId: user.id,
      cards: {
        create: [
          { front: '7 × 8', back: '56' },
          { front: '144 ÷ 12', back: '12' },
          { front: '√81', back: '9' },
          { front: '15² (15 squared)', back: '225' },
          { front: '2⁸ (2 to the 8th power)', back: '256' },
          { front: 'What is 17 + 38?', back: '55' },
          { front: 'What is 1000 - 387?', back: '613' },
        ],
      },
    },
    include: { cards: true },
  });

  console.log(`Seeded deck: ${math.name} with ${math.cards.length} cards`);

  // --- Deck 3: Spanish Vocabulary ---
  const spanish = await prisma.deck.create({
    data: {
      id: 'seed-deck-spanish-vocab',
      name: 'Spanish Vocabulary',
      description: 'Common Spanish words and phrases',
      userId: user.id,
      cards: {
        create: [
          { front: 'Hello', back: 'Hola' },
          { front: 'Thank you', back: 'Gracias' },
          { front: 'Goodbye', back: 'Adiós' },
          { front: 'Please', back: 'Por favor' },
          { front: 'How are you?', back: '¿Cómo estás?' },
          { front: 'Good morning', back: 'Buenos días' },
          { front: "I don't understand", back: 'No entiendo' },
          { front: 'Where is the bathroom?', back: '¿Dónde está el baño?' },
        ],
      },
    },
    include: { cards: true },
  });

  console.log(
    `Seeded deck: ${spanish.name} with ${spanish.cards.length} cards`,
  );

  // --- Deck 4: Programming Concepts (no study sessions) ---
  const programming = await prisma.deck.create({
    data: {
      id: 'seed-deck-programming',
      name: 'Programming Concepts',
      description: 'CS fundamentals and programming terminology',
      userId: user.id,
      cards: {
        create: [
          {
            front: 'What does HTTP stand for?',
            back: 'HyperText Transfer Protocol',
          },
          {
            front: 'What is the time complexity of binary search?',
            back: 'O(log n)',
          },
          {
            front: 'What does SQL stand for?',
            back: 'Structured Query Language',
          },
          {
            front: 'What is a closure?',
            back: 'A function that captures variables from its enclosing scope',
          },
          {
            front: 'What does REST stand for?',
            back: 'Representational State Transfer',
          },
        ],
      },
    },
    include: { cards: true },
  });

  console.log(
    `Seeded deck: ${programming.name} with ${programming.cards.length} cards`,
  );

  // --- Sample Study Sessions ---

  // Session 1: World Capitals — mostly correct, two retries
  const session1 = await prisma.studySession.create({
    data: {
      userId: user.id,
      deckId: capitals.id,
      endedAt: new Date(),
    },
  });

  const capitalsAttempts = capitals.cards.flatMap((card, i) => {
    const isWrong = i === 2 || i === 7; // Brasília and Buenos Aires wrong first try
    if (isWrong) {
      return [
        {
          studySessionId: session1.id,
          cardId: card.id,
          userAnswer: 'wrong answer',
          result: 'incorrect' as const,
          attemptNumber: 1,
        },
        {
          studySessionId: session1.id,
          cardId: card.id,
          userAnswer: card.back,
          result: 'correct' as const,
          attemptNumber: 2,
        },
      ];
    }
    return [
      {
        studySessionId: session1.id,
        cardId: card.id,
        userAnswer: card.back,
        result: 'correct' as const,
        attemptNumber: 1,
      },
    ];
  });

  await prisma.cardAttempt.createMany({ data: capitalsAttempts });
  console.log('Seeded study session 1: World Capitals (completed, 2 retries)');

  // Session 2: Basic Math — all correct
  const session2 = await prisma.studySession.create({
    data: {
      userId: user.id,
      deckId: math.id,
      endedAt: new Date(),
    },
  });

  await prisma.cardAttempt.createMany({
    data: math.cards.map((card) => ({
      studySessionId: session2.id,
      cardId: card.id,
      userAnswer: card.back,
      result: 'correct' as const,
      attemptNumber: 1,
    })),
  });

  console.log('Seeded study session 2: Basic Math (completed, all correct)');

  // Session 3: Spanish Vocabulary — several mistakes, some retries needed
  const session3 = await prisma.studySession.create({
    data: {
      userId: user.id,
      deckId: spanish.id,
      endedAt: new Date(),
    },
  });

  const spanishAttempts = spanish.cards.flatMap((card, i) => {
    const isHard = i >= 4;
    if (!isHard) {
      return [
        {
          studySessionId: session3.id,
          cardId: card.id,
          userAnswer: card.back,
          result: 'correct' as const,
          attemptNumber: 1,
        },
      ];
    }
    // Card 7 takes 3 attempts
    if (i === 7) {
      return [
        {
          studySessionId: session3.id,
          cardId: card.id,
          userAnswer: 'wrong',
          result: 'incorrect' as const,
          attemptNumber: 1,
        },
        {
          studySessionId: session3.id,
          cardId: card.id,
          userAnswer: 'still wrong',
          result: 'incorrect' as const,
          attemptNumber: 2,
        },
        {
          studySessionId: session3.id,
          cardId: card.id,
          userAnswer: card.back,
          result: 'correct' as const,
          attemptNumber: 3,
        },
      ];
    }
    return [
      {
        studySessionId: session3.id,
        cardId: card.id,
        userAnswer: 'wrong',
        result: 'incorrect' as const,
        attemptNumber: 1,
      },
      {
        studySessionId: session3.id,
        cardId: card.id,
        userAnswer: card.back,
        result: 'correct' as const,
        attemptNumber: 2,
      },
    ];
  });

  await prisma.cardAttempt.createMany({ data: spanishAttempts });
  console.log(
    'Seeded study session 3: Spanish Vocabulary (completed, 4 retries)',
  );

  console.log('\nSeed complete! Log in with: dev@example.com / password');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

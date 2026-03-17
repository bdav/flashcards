import { prisma } from '../apps/api/src/db.js';
import { hashPassword } from '../apps/api/src/auth/password.js';

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

  console.log(
    `Seeded user: ${user.email} (${user.id}) — password: "password"`,
  );

  // Create a sample deck with cards
  const deck = await prisma.deck.upsert({
    where: { id: 'seed-deck-world-capitals' },
    update: {},
    create: {
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
        ],
      },
    },
    include: { cards: true },
  });

  console.log(
    `Seeded deck: ${deck.name} with ${deck.cards.length} cards (${deck.id})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  // const email = "brunalima@me.com";

  // // cleanup the existing database
  // await prisma.user.delete({ where: { email } }).catch(() => {
  //   // no worries if it doesn't exist yet
  // });

  // const hashedPassword = await bcrypt.hash("bruninha", 10);

  // const user = await prisma.user.create({
  //   data: {
  //     email,
  //     password: {
  //       create: {
  //         hash: hashedPassword,
  //       },
  //     },
  //   },
  // });

  // await prisma.question.create({
  //   data: {
  //     question: "Hello, world ?",
  //     userId: user.id,
  //   },
  // });

  // await prisma.question.create({
  //   data: {
  //     question: "Hello, world ?",
  //     userId: user.id,
  //   },
  // });

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

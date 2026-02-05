import { prisma } from '../lib/prisma'

async function clearTodayIdeas() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Delete price history for today's ideas
  const todayIdeas = await prisma.idea.findMany({
    where: { generatedDate: today },
    select: { id: true }
  })

  if (todayIdeas.length > 0) {
    await prisma.priceHistory.deleteMany({
      where: { ideaId: { in: todayIdeas.map(i => i.id) } }
    })
  }

  // Delete today's ideas
  const deleted = await prisma.idea.deleteMany({
    where: { generatedDate: today }
  })

  // Delete today's batch marker
  await prisma.dailyIdeaBatch.deleteMany({
    where: { generatedDate: today }
  })

  console.log(`Cleared ${deleted.count} ideas for today`)
  console.log('Next API request will generate fresh real ideas')
}

clearTodayIdeas()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

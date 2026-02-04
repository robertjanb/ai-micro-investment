import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const today = new Date()
today.setHours(0, 0, 0, 0)

const seedIdeas = [
  {
    ticker: 'NRDZ',
    companyName: 'NordicEnzyme Solutions',
    oneLiner: 'Danish biotech with a novel enzyme platform gaining traction in industrial waste processing',
    thesis: 'NordicEnzyme has developed a proprietary enzyme cocktail that breaks down microplastics in industrial wastewater at 3x the efficiency of current methods. They recently secured a pilot contract with a major Scandinavian pulp and paper company, and their Q3 results showed a 40% increase in pilot inquiries.\n\nThe addressable market for industrial water treatment enzymes is projected to reach EUR 8.2 billion by 2028, and NordicEnzyme is one of only three companies with a viable biological approach.',
    bearCase: 'The technology works well in controlled settings but has not been proven at full industrial scale. Scaling enzyme production is notoriously difficult and expensive. Their largest competitor, a division of BASF, has deeper pockets and could undercut them on pricing once the market matures.',
    confidenceScore: 68,
    signals: { hiring: true, earnings: true, regulatory: false, supplyChain: true },
    riskLevel: 'interesting',
    initialPrice: 42.30,
  },
  {
    ticker: 'SLRQ',
    companyName: 'SolarQuilt Energy',
    oneLiner: 'Building-integrated solar fabric for commercial rooftops in Southern Europe',
    thesis: 'SolarQuilt manufactures flexible solar membranes that install like roofing material, reducing installation costs by 60% compared to traditional panels. They have regulatory approval in Spain, Italy, and Portugal, and just signed a distribution deal with a major European building materials distributor.\n\nWith EU mandates requiring solar on new commercial buildings by 2027, SolarQuilt is positioned to capture demand in a market where traditional panels are often impractical due to structural weight limits.',
    bearCase: 'Efficiency per square meter is about 30% lower than rigid panels. If panel prices continue falling, the installation cost advantage narrows. They are also dependent on a single manufacturing facility in Lisbon, which creates supply risk.',
    confidenceScore: 72,
    signals: { hiring: true, earnings: false, regulatory: true, supplyChain: true },
    riskLevel: 'interesting',
    initialPrice: 28.50,
  },
  {
    ticker: 'FRML',
    companyName: 'FarmLink Logistics',
    oneLiner: 'AI-optimized cold chain logistics for European organic produce distributors',
    thesis: 'FarmLink uses machine learning to optimize routing and temperature management for perishable goods across a network of 200+ European organic farms. Their platform reduces spoilage by 25% on average, which translates directly to margin improvement for distributors.\n\nOrganic produce is the fastest-growing segment in European grocery, and cold chain inefficiency remains a major bottleneck.',
    bearCase: 'The logistics technology space is crowded. FarmLink depends on network effects — if a major distributor builds their own solution or a competitor like Flexport enters the European organic niche, FarmLink could lose its edge quickly.',
    confidenceScore: 61,
    signals: { hiring: true, earnings: true, regulatory: false, supplyChain: false },
    riskLevel: 'safe',
    initialPrice: 15.80,
  },
  {
    ticker: 'CRTX',
    companyName: 'CortexAI Therapeutics',
    oneLiner: 'Using generative AI to accelerate drug candidate screening for rare neurological conditions',
    thesis: 'CortexAI has built a proprietary model trained on 15 years of failed and successful clinical trial data for neurological drugs. Their platform identified three novel drug candidates that are now in pre-clinical trials, with two showing promising results in animal models.\n\nRare disease drug development is expensive but highly profitable once approved, with orphan drug exclusivity providing 7-10 years of market protection.',
    bearCase: 'AI drug discovery is still largely unproven at scale. The jump from promising animal models to human efficacy is where most candidates fail. CortexAI has no revenue yet and will need significant additional funding to reach Phase II trials.',
    confidenceScore: 55,
    signals: { hiring: true, earnings: false, regulatory: false, supplyChain: true },
    riskLevel: 'spicy',
    initialPrice: 89.20,
  },
  {
    ticker: 'TMLK',
    companyName: 'TimberLink Carbon',
    oneLiner: 'Mass timber construction company selling verified carbon credits from structural wood buildings',
    thesis: 'TimberLink builds commercial structures using cross-laminated timber (CLT), which sequesters carbon instead of emitting it. Each building they construct generates verified carbon credits that they sell on the EU ETS market, creating a dual revenue stream.\n\nWith EU carbon prices rising and construction decarbonization mandates tightening, TimberLink benefits from both regulatory tailwinds and genuine market demand for low-carbon building solutions.',
    bearCase: 'Carbon credit prices are volatile and politically sensitive. Mass timber construction faces resistance from insurers concerned about fire risk, and building codes in several EU countries still favor steel and concrete.',
    confidenceScore: 65,
    signals: { hiring: false, earnings: true, regulatory: true, supplyChain: true },
    riskLevel: 'interesting',
    initialPrice: 34.60,
  },
]

async function main() {
  console.log('Seeding database...')

  for (const ideaData of seedIdeas) {
    const idea = await prisma.idea.create({
      data: {
        ...ideaData,
        signals: ideaData.signals,
        currentPrice: ideaData.initialPrice,
        currency: 'EUR',
        generatedDate: today,
      },
    })

    await prisma.priceHistory.create({
      data: {
        ideaId: idea.id,
        price: idea.initialPrice,
      },
    })

    console.log(`  Created idea: ${idea.ticker} (${idea.companyName})`)
  }

  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

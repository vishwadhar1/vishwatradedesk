import { randomUUID } from "crypto";
import "./env";
import { db } from "./index";
import { playbooks, positions, settings, transactions } from "./schema";

const asManagedList = (names: string[]) =>
  names.map((name) => ({ name, archived: false }));

const STRATEGIES = asManagedList([
  "Breakout",
  "Pullback",
  "Reversal",
  "VCP",
  "Momentum",
  "Positional Investment",
]);

const SETUPS = asManagedList([
  "Cup & Handle",
  "Flag / Pennant",
  "52-Week High",
  "200 DMA Bounce",
  "Darvas Box",
  "Range Breakout",
  "Rounding Bottom",
  "Earnings Gap",
]);

async function seedSettings() {
  await db
    .insert(settings)
    .values({
      id: 1,
      accountCapital: "1000000",
      strategies: STRATEGIES,
      setups: SETUPS,
      defaultExchange: "NSE",
      breakevenHandling: "EXCLUDE",
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        accountCapital: "1000000",
        strategies: STRATEGIES,
        setups: SETUPS,
      },
    });
  console.log("seeded settings");
}

async function seedPlaybook() {
  const ruleTexts = [
    "Base of at least 7 weeks",
    "Two or more contractions, each tighter than the last",
    "Volume dries up through the final contraction",
    "Entry above the pivot on volume >= 1.5x the 50-day average",
    "Stop below the low of the last contraction",
    "Risk on the position <= 1% of account capital",
  ];
  const rules = ruleTexts.map((text) => ({ id: randomUUID(), text }));

  const [playbook] = await db
    .insert(playbooks)
    .values({
      name: "VCP Breakout",
      description:
        "Mark Minervini-style volatility contraction pattern breakout.",
      rules,
    })
    .returning();

  console.log("seeded playbook: VCP Breakout");
  return { playbookId: playbook.id, rules };
}

async function seedPositions(
  playbookId: string,
  rules: { id: string; text: string }[],
) {
  // Snapshot ids AND text at scoring time — never re-derived from the live
  // playbook, so a later edit to playbook.rules can't alter these.
  const rulesFollowed = (indices: number[]) =>
    rules.map((rule, i) => ({ ...rule, followed: indices.includes(i) }));

  const [reliance] = await db
    .insert(positions)
    .values({
      symbol: "RELIANCE",
      companyName: "Reliance Industries Ltd",
      exchange: "NSE",
      yahooSymbol: "RELIANCE.NS",
      direction: "LONG",
      positionType: "SWING",
      strategy: "Breakout",
      setup: "52-Week High",
      playbookId,
      rulesFollowed: rulesFollowed([0, 1, 2, 3, 4, 5]),
      tags: ["high-conviction"],
      plannedEntry: "2500",
      initialStopLoss: "2400",
      currentStopLoss: "2450",
      targetPrice: "2800",
      plannedQty: 150,
      thesisWhy:
        "Clean VCP breakout above a multi-month base with volume expansion on the pivot day.",
      marketContext:
        "Nifty in a confirmed uptrend, energy and refining names showing relative strength.",
      technicalReasoning:
        "Three contractions of decreasing depth, pivot at 2500 with volume 1.8x the 50-day average.",
      fundamentalReasoning:
        "Refining margins improving quarter over quarter, retail and Jio segments growing double digits.",
      invalidation:
        "Close back below the breakout pivot on above-average volume invalidates the setup.",
      confidence: 8,
      fomo: 2,
      discipline: 9,
      psychNotes:
        "Waited for the actual breakout candle instead of anticipating it — no urge to chase.",
      currentPrice: "2650",
      previousClose: "2630",
      priceUpdatedAt: new Date(),
    })
    .returning();

  const [hdfcbank] = await db
    .insert(positions)
    .values({
      symbol: "HDFCBANK",
      companyName: "HDFC Bank Ltd",
      exchange: "NSE",
      yahooSymbol: "HDFCBANK.NS",
      direction: "LONG",
      positionType: "POSITIONAL",
      strategy: "Pullback",
      setup: "200 DMA Bounce",
      plannedEntry: "1650",
      initialStopLoss: "1580",
      targetPrice: "1850",
      plannedQty: 200,
      thesisWhy:
        "Pulling back to the rising 200 DMA within a long-term uptrend, waiting for a reversal candle.",
      marketContext:
        "Banking sector consolidating after a strong run, private banks holding up better than PSU banks.",
      technicalReasoning:
        "Price approaching the 200 DMA with RSI resetting to the mid-40s, prior bounces from this average held.",
      fundamentalReasoning:
        "Steady NIM and stable asset quality, credit growth tracking above system average.",
      invalidation:
        "A daily close more than 3% below the 200 DMA invalidates the bounce thesis.",
      confidence: 6,
      fomo: 1,
      discipline: 8,
      psychNotes:
        "Watching, not entering yet — resisting the temptation to buy ahead of confirmation.",
      currentPrice: "1660",
      previousClose: "1655",
      priceUpdatedAt: new Date(),
    })
    .returning();

  const [infy] = await db
    .insert(positions)
    .values({
      symbol: "INFY",
      companyName: "Infosys Ltd",
      exchange: "NSE",
      yahooSymbol: "INFY.NS",
      direction: "LONG",
      positionType: "SWING",
      strategy: "VCP",
      setup: "Cup & Handle",
      playbookId,
      rulesFollowed: rulesFollowed([0, 1, 3, 4, 5]),
      tags: ["earnings"],
      plannedEntry: "1450",
      initialStopLoss: "1400",
      currentStopLoss: "1420",
      targetPrice: "1600",
      plannedQty: 300,
      thesisWhy:
        "Cup and handle breakout into earnings, IT sector rotating back into favor.",
      marketContext:
        "IT names bottoming out as INR weakness helps margins, sector relative strength turning up.",
      technicalReasoning:
        "Handle formed on light volume, breakout above the handle high on above-average volume.",
      fundamentalReasoning:
        "Deal pipeline commentary improving, large-deal TCV guided higher for the next two quarters.",
      invalidation:
        "Loss of the handle low on a closing basis invalidates the pattern.",
      confidence: 7,
      fomo: 4,
      discipline: 6,
      psychNotes:
        "Entered a day early ahead of full volume confirmation — slight FOMO around the earnings date.",
      currentPrice: "1510",
      previousClose: "1500",
      priceUpdatedAt: new Date(),
    })
    .returning();

  const [lt] = await db
    .insert(positions)
    .values({
      symbol: "LT",
      companyName: "Larsen & Toubro Ltd",
      exchange: "NSE",
      yahooSymbol: "LT.NS",
      direction: "LONG",
      positionType: "POSITIONAL",
      strategy: "Positional Investment",
      setup: "Range Breakout",
      plannedEntry: "3550",
      initialStopLoss: "3400",
      currentStopLoss: "3450",
      targetPrice: "4000",
      plannedQty: 80,
      thesisWhy:
        "Multi-month range breakout on the back of a strong order-book announcement.",
      marketContext:
        "Capex and infrastructure theme in favor, government capex allocation trending up.",
      technicalReasoning:
        "Range resistance held for five months, breakout on more than double the average daily volume.",
      fundamentalReasoning:
        "Record order book with healthy execution timelines and improving working capital cycle.",
      invalidation:
        "A retest of the breakout level that fails to hold invalidates the setup.",
      confidence: 7,
      fomo: 2,
      discipline: 8,
      psychNotes:
        "Sized to the plan despite wanting to add more on the strength of the order-book news.",
      currentPrice: "3720",
      previousClose: "3700",
      priceUpdatedAt: new Date(),
    })
    .returning();

  const [icicibank] = await db
    .insert(positions)
    .values({
      symbol: "ICICIBANK",
      companyName: "ICICI Bank Ltd",
      exchange: "NSE",
      yahooSymbol: "ICICIBANK.NS",
      direction: "LONG",
      positionType: "SWING",
      strategy: "Momentum",
      setup: "Flag / Pennant",
      playbookId,
      rulesFollowed: rulesFollowed([0, 1, 3, 4]),
      tags: ["added-early"],
      plannedEntry: "1150",
      initialStopLoss: "1100",
      currentStopLoss: "1180",
      targetPrice: "1300",
      plannedQty: 250,
      thesisWhy:
        "Flag breakout continuation after a sharp momentum move off quarterly results.",
      marketContext:
        "Private banks leading the market higher, strong FII inflows into the sector.",
      technicalReasoning:
        "Tight flag over eight sessions on declining volume, breakout above the flag high.",
      fundamentalReasoning:
        "Beat on NIM and provisions, management guided for continued loan growth.",
      invalidation:
        "Close below the flag low invalidates the continuation setup.",
      confidence: 8,
      fomo: 3,
      discipline: 7,
      psychNotes:
        "Trailed the stop up as planned but was tempted to book the full position early on strength.",
      wentWell:
        "Followed the plan on trailing the stop and let the position run to the target zone.",
      wentWrong:
        "Sized slightly larger than the risk plan called for after the first day's strength.",
      learned:
        "A momentum flag after strong results can extend further than it looks — trail rather than cap the target.",
      mistakes:
        "Did not recompute position size against the 1% risk rule after moving the stop.",
      grade: "B+",
    })
    .returning();

  const [bhartiartl] = await db
    .insert(positions)
    .values({
      symbol: "BHARTIARTL",
      companyName: "Bharti Airtel Ltd",
      exchange: "NSE",
      yahooSymbol: "BHARTIARTL.NS",
      direction: "LONG",
      positionType: "SWING",
      strategy: "Reversal",
      setup: "Rounding Bottom",
      plannedEntry: "1580",
      initialStopLoss: "1520",
      currentStopLoss: "1520",
      targetPrice: "1750",
      plannedQty: 200,
      thesisWhy:
        "Rounding bottom reversal after a multi-week decline, first higher low on the daily chart.",
      marketContext:
        "Telecom sector under pressure from tariff-hike uncertainty ahead of a regulatory ruling.",
      technicalReasoning:
        "Rounded base with a slight uptick in volume on the final leg up into the pivot.",
      fundamentalReasoning:
        "ARPU trending higher on plan upgrades, subscriber additions ahead of peers.",
      invalidation:
        "A break of the rounding bottom's low invalidates the reversal thesis.",
      confidence: 5,
      fomo: 2,
      discipline: 7,
      psychNotes:
        "Took a smaller size than usual given the pending regulatory ruling, which turned out to be the right call.",
      wentWell:
        "Cut the loss exactly at the planned stop without hesitation once the ruling came in unfavorably.",
      wentWrong:
        "Entered before the regulatory ruling was out despite knowing the date — added an avoidable variable.",
      learned:
        "Known binary events should be waited out, even when the chart pattern looks complete.",
      mistakes:
        "Ignored the setup's own invalidation window by entering two days ahead of a scheduled ruling.",
      grade: "D",
    })
    .returning();

  console.log("seeded 6 positions");

  return { reliance, hdfcbank, infy, lt, icicibank, bhartiartl };
}

async function seedTransactions(positionIds: {
  reliance: string;
  infy: string;
  lt: string;
  icicibank: string;
  bhartiartl: string;
}) {
  await db.insert(transactions).values([
    // RELIANCE — partially closed. Exact shape required by Phase 2 tests.
    {
      positionId: positionIds.reliance,
      side: "BUY",
      quantity: 100,
      price: "2500",
      date: "2026-07-06",
      totalCharges: "30",
      seq: 1,
    },
    {
      positionId: positionIds.reliance,
      side: "BUY",
      quantity: 50,
      price: "2450",
      date: "2026-07-20",
      totalCharges: "20",
      seq: 2,
    },
    {
      positionId: positionIds.reliance,
      side: "SELL",
      quantity: 50,
      price: "2700",
      date: "2026-08-10",
      totalCharges: "45",
      seq: 3,
    },
    // INFY — open.
    {
      positionId: positionIds.infy,
      side: "BUY",
      quantity: 300,
      price: "1460",
      date: "2026-07-13",
      totalCharges: "60",
      seq: 1,
    },
    // LT — open.
    {
      positionId: positionIds.lt,
      side: "BUY",
      quantity: 80,
      price: "3560",
      date: "2026-06-15",
      totalCharges: "70",
      seq: 1,
    },
    // ICICIBANK — closed, winner.
    {
      positionId: positionIds.icicibank,
      side: "BUY",
      quantity: 250,
      price: "1160",
      date: "2026-06-01",
      totalCharges: "55",
      seq: 1,
    },
    {
      positionId: positionIds.icicibank,
      side: "SELL",
      quantity: 250,
      price: "1290",
      date: "2026-07-27",
      totalCharges: "60",
      seq: 2,
    },
    // BHARTIARTL — closed, loser.
    {
      positionId: positionIds.bhartiartl,
      side: "BUY",
      quantity: 200,
      price: "1590",
      date: "2026-06-22",
      totalCharges: "50",
      seq: 1,
    },
    {
      positionId: positionIds.bhartiartl,
      side: "SELL",
      quantity: 200,
      price: "1510",
      date: "2026-07-15",
      totalCharges: "45",
      seq: 2,
    },
  ]);

  console.log("seeded transactions");
}

async function main() {
  await seedSettings();
  const { playbookId, rules } = await seedPlaybook();
  const seededPositions = await seedPositions(playbookId, rules);

  const positionIds = {
    reliance: seededPositions.reliance.id,
    infy: seededPositions.infy.id,
    lt: seededPositions.lt.id,
    icicibank: seededPositions.icicibank.id,
    bhartiartl: seededPositions.bhartiartl.id,
  };

  await seedTransactions(positionIds);

  console.log("done");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

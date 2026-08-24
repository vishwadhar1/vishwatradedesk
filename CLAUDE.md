## TradeDesk — project rules

- Indian equity swing-trading + investing journal. Single user. Three modules only:
  Dashboard, Journal, Trade Log. Do not add other modules or nav items.
- CORE RULE: store facts, derive everything else. Only positions, transactions, playbooks,
  notes and price snapshots are written to the DB. Average price, invested value, P&L, status,
  holding period, R multiple and all performance metrics are COMPUTED ON READ by /lib/calc.
  Never store a derived value.
- All money maths goes through /lib/calc. It is pure, has no I/O, and is unit-tested.
  UI never does arithmetic.
- Charges are a single `total_charges` number per transaction. Never break them into
  brokerage/STT/GST. No tax engine, no corporate actions, no broker integration.
- Cost basis is FIFO. Buy charges are capitalised into cost basis and released pro-rata as
  shares are sold — never expensed on entry.
- Currency is INR with Indian digit grouping (₹2,47,500.00 — never ₹247,500.00).
- Dark-first UI. Information-dense, compact, no animations beyond 120ms colour/opacity.
  No card shadows, no gradients, no charts beyond the two specified.
- Do not build features "for later". If it isn't needed by Dashboard, Journal or Trade Log,
  it doesn't get built.

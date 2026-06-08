window.SAMPLE_MD = `# Quarterly Engineering Review
**Platform Group** · Q2 2026 · Prepared by A. Rivera

> A concise snapshot of delivery, reliability, and what we're carrying into Q3. Read time ≈ 4 minutes.

---

## 1. Executive Summary

This quarter the team shipped the **billing migration**, cut p95 latency by *38%*, and closed the long-standing backlog on auth. Two initiatives slipped and are re-scoped below. Overall we are **on track** against the annual plan.

Key result: a single, well-formed Markdown document renders to a print-ready A4 page in one paste — no formatting busywork.

### Highlights

- Migrated 2.1M accounts to the new ledger with zero data loss
- Reduced build times from 11m → 4m via remote caching
- Onboarded 3 engineers; ramp time down to ~2 weeks
- Published the internal [API style guide](#)

## 2. Reliability

We track four golden signals. The table below summarizes the quarter.

| Service    | p95 (ms) | Error rate | Uptime  | Trend |
|------------|---------:|-----------:|--------:|:-----:|
| Gateway    |       82 |     0.02 % | 99.98 % |   ↑   |
| Ledger     |      140 |     0.05 % | 99.95 % |   ↑   |
| Search     |      210 |     0.11 % | 99.90 % |   →   |
| Notifier   |       64 |     0.01 % | 99.99 % |   ↑   |

> **Note** — the Search regression in week 7 traced back to a cold cache after a deploy. Mitigation: staged warm-up. See incident #4412.

## 3. What Shipped

Ranked checklist of committed work:

- [x] Billing ledger migration
- [x] Remote build cache rollout
- [x] Auth backlog (12 tickets)
- [ ] Multi-region failover *(slipped → Q3)*
- [ ] Audit log export *(re-scoped, smaller)*

### Code Snapshot

A representative slice of the new rate limiter:

\`\`\`python
def allow(key: str, limit: int, window: float) -> bool:
    now = time.monotonic()
    bucket = buckets.setdefault(key, deque())
    while bucket and bucket[0] <= now - window:
        bucket.popleft()
    if len(bucket) >= limit:
        return False           # over budget
    bucket.append(now)
    return True
\`\`\`

Inline references work too: call \`allow(user_id, 100, 60)\` before each write, and wrap reads with the \`@cached\` decorator.

## 4. Numbers That Matter

1. **Deploys:** 214 (↑ 19% QoQ)
2. **Change-fail rate:** 4.1% (target < 5%)
3. **MTTR:** 22 min (↓ from 41 min)
4. **On-call pages:** 0.7 / night median

## 5. Risks & Asks

We need a decision on multi-region by **July 15**. Without it, failover slips again.

| Risk | Likelihood | Impact | Owner |
|------|:----------:|:------:|-------|
| Region capacity | Medium | High | Infra |
| Vendor SLA gap  | Low    | High | Eng   |
| Hiring ramp     | Medium | Med  | Mgmt  |

---

### Appendix

Terms: **SLA** service level agreement · **MTTR** mean time to recovery · use <kbd>⌘</kbd>+<kbd>P</kbd> to export this page to PDF.

*Document ends. Replace this sample with your own Markdown — the page on the right updates as you type.*
`;

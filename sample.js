/* Bundled default document. Figure is inlined as a data URI so it always renders
   (no separate asset fetch, works on GitHub Pages, print, and zip export). */
(function () {
  const FIG = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="820" height="260" viewBox="0 0 820 260">'
    + '<rect width="820" height="260" fill="#eef3ff"/>'
    + '<rect x="24" y="66" width="772" height="124" rx="62" fill="#fff" stroke="#2f64e6" stroke-width="5"/>'
    + '<line x1="64" y1="172" x2="756" y2="172" stroke="#c7d4f5" stroke-width="6" stroke-linecap="round"/>'
    + '<g stroke="#b8402a" stroke-width="5" stroke-linecap="round">'
    + '<line x1="128" y1="100" x2="58" y2="100"/><line x1="150" y1="130" x2="48" y2="130"/>'
    + '<line x1="128" y1="160" x2="68" y2="160"/></g>'
    + '<rect x="300" y="94" width="272" height="66" rx="33" fill="#2f64e6"/>'
    + '<circle cx="552" cy="127" r="7" fill="#ffd66b"/>'
    + '<rect x="328" y="108" width="38" height="38" rx="9" fill="#eef3ff"/>'
    + '<rect x="382" y="108" width="38" height="38" rx="9" fill="#eef3ff"/>'
    + '<rect x="436" y="108" width="38" height="38" rx="9" fill="#eef3ff"/>'
    + '<circle cx="340" cy="123" r="3.4" fill="#1b1d22"/><circle cx="354" cy="123" r="3.4" fill="#1b1d22"/>'
    + '<path d="M338 136 q9 -6 18 0" stroke="#1b1d22" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    + '<text x="410" y="228" text-anchor="middle" font-size="22" fill="#33415c" font-weight="600">'
    + 'Fig 1 - A pod, allegedly at 1,180 km/h</text></svg>'
  );

  window.SAMPLE_MD = `# Hyperloop: A Study of Going Very Fast in a Tube

**Department of Optimistic Transit** · Vol. 88, No. 3 · Peer-reviewed by *three guys on a forum*

> **Abstract.** We investigate whether humans can be fired through a steel straw at airline speeds without spilling their coffee. Findings: the speed is achievable; the coffee is not. Funding generously provided by a man who *really* hates traffic.

---

## 1. Introduction

For over a century, engineers have dreamed of travel that is **faster than a train**, *cheaper than a plane*, and ~~financially realistic~~ visionary. The Hyperloop promises all three, provided you ignore the third. At its core the concept is simple: remove the air, add a pod, and let physics do the marketing.

As the great philosophers noted, \`velocity = distance / vibes\`. We adopt this as our governing equation.

See also our earlier work, [On the Feasibility of Catapulting Commuters](#), which the ethics board described as "a cry for help."

### 1.1 Research Questions

- Can a pod reach 1,200 km/h without turning lunch into a wall decoration?
- Will passengers accept windows that show only darkness?
- Is "mild existential dread" an acceptable in-flight amenity?

### 1.2 A Note on Tone

This paragraph exists purely so the **Body** style can prove it stays calm and readable, even while the surrounding text describes terrifying acceleration. Well done, body text. Stay strong.

## 2. Methodology

We built a test rig from **two vacuum cleaners**, *a garden hose*, and unshakable confidence. Measurements were taken in \`SI units\`, then quietly converted to "feels about right."

\`\`\`python
def passenger_g_force(speed_kmh, patience):
    g = (speed_kmh / 100) ** 2 / max(patience, 0.01)
    if g > 5:
        return "please remain calm"   # they will not remain calm
    return "acceptable"

print(passenger_g_force(1200, patience=0.3))
\`\`\`

Inline check: we call \`passenger_g_force(1200, 0.3)\` before boarding and, for legal reasons, again after.

### 2.1 Test Schedule

1. Build tube
2. Briefly question life choices
3. Insert pod
4. Run *exactly one* test
5. Hold a triumphant press conference regardless of outcome

## 3. Results

The data are summarized below. The trends are, scientifically, going up.

| Metric                 |   Target |  Observed | Verdict |
|------------------------|---------:|----------:|:-------:|
| Top speed (km/h)       |    1,200 |     1,180 |   😎    |
| Coffee retained (%)    |      100 |        12 |   ☠️    |
| Passenger volume (dB)  |       40 |       118 |   📈    |
| Investor confidence    | Boundless | Boundless |   💸    |

![Figure 1: a pod, allegedly](${FIG})

> **Note.** Reviewer 2 insists the screaming is a *feature*, providing "free in-cabin entertainment and a natural smoke alarm."

### 3.1 Safety Checklist

- [x] Tube is, in fact, a tube
- [x] Pod fits inside tube
- [x] Emergency snacks loaded
- [ ] Emergency exit identified
- [ ] Reason the emergency exit does not exist

#### 3.1.1 Minor Concerns

A small heading-four footnote for completeness: the brakes are currently best described as "aspirational."

## 4. Risk Assessment

| Risk                | Likelihood | Impact |     Mitigation      |
|---------------------|:----------:|:------:|:-------------------:|
| Pod gets stuck      |   Medium   |  High  |       Push it       |
| Tube springs a leak |    High    |  High  |        Tape         |
| Physics says no     |  Low (ish) | Cosmic |  Ask physics nicely |

Note: the "Low (ish)" rating was supplied by our most enthusiastic intern.

## 5. Conclusion

The Hyperloop is **technically possible**, *spiritually questionable*, and **financially** — let's move on. We recommend immediate funding, a slightly longer tube, and dramatically better coffee lids.

---

### Appendix A — Glossary

Terms: **Pod** a tube for a person, inside a tube for the pod · **Vacuum** the thing our budget abhors · **Soon™** any time between next quarter and the heat death of the universe.

Tip: press <kbd>⌘</kbd>+<kbd>P</kbd> to export this masterpiece to PDF and frame it above your desk.

*End of report. Replace it with your own Markdown — unless you, too, dream of tubes.*
`;
})();

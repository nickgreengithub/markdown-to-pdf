/* ============================================================
   Demo article — exercises every element the dialect has, so a
   reader can see the whole toolkit on real pages. Its figures are
   SVGs seeded into the image library under fixed names.
   ============================================================ */
window.DEMO = (() => {
  const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
  const FIGS = {
    'pod-diagram': svg(820, 260,
      '<rect width="820" height="260" fill="#eef3ff"/>'
      + '<rect x="24" y="66" width="772" height="124" rx="62" fill="#fff" stroke="#2f64e6" stroke-width="5"/>'
      + '<line x1="64" y1="172" x2="756" y2="172" stroke="#c7d4f5" stroke-width="6" stroke-linecap="round"/>'
      + '<g stroke="#b8402a" stroke-width="5" stroke-linecap="round"><line x1="128" y1="100" x2="58" y2="100"/><line x1="150" y1="130" x2="48" y2="130"/><line x1="128" y1="160" x2="68" y2="160"/></g>'
      + '<rect x="300" y="94" width="272" height="66" rx="33" fill="#2f64e6"/><circle cx="552" cy="127" r="7" fill="#ffd66b"/>'
      + '<rect x="328" y="108" width="38" height="38" rx="9" fill="#eef3ff"/><rect x="382" y="108" width="38" height="38" rx="9" fill="#eef3ff"/><rect x="436" y="108" width="38" height="38" rx="9" fill="#eef3ff"/>'
      + '<circle cx="340" cy="123" r="3.4" fill="#1b1d22"/><circle cx="354" cy="123" r="3.4" fill="#1b1d22"/><path d="M338 136 q9 -6 18 0" stroke="#1b1d22" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
      + '<text x="410" y="228" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" fill="#33415c" font-weight="600">A pod, allegedly at 1,180 km/h</text>'),
    'speed-chart': svg(640, 360,
      '<rect width="640" height="360" fill="#fff"/>'
      + '<g stroke="#e6e8ec"><line x1="70" y1="40" x2="600" y2="40"/><line x1="70" y1="110" x2="600" y2="110"/><line x1="70" y1="180" x2="600" y2="180"/><line x1="70" y1="250" x2="600" y2="250"/></g>'
      + '<line x1="70" y1="320" x2="600" y2="320" stroke="#1b1d22" stroke-width="1.5"/>'
      + '<g font-family="system-ui, sans-serif" font-size="14" fill="#6b7280" text-anchor="end"><text x="60" y="45">1200</text><text x="60" y="115">900</text><text x="60" y="185">600</text><text x="60" y="255">300</text><text x="60" y="325">0</text></g>'
      + '<g><rect x="110" y="292" width="70" height="28" fill="#c7d4f5"/><rect x="220" y="236" width="70" height="84" fill="#9db4ee"/><rect x="330" y="152" width="70" height="168" fill="#5f87ea"/><rect x="440" y="45" width="70" height="275" fill="#2f64e6"/></g>'
      + '<g font-family="system-ui, sans-serif" font-size="14" fill="#1b1d22" text-anchor="middle"><text x="145" y="345">Test 1</text><text x="255" y="345">Test 2</text><text x="365" y="345">Test 3</text><text x="475" y="345">Test 4</text></g>'
      + '<text x="475" y="36" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" fill="#2f64e6" font-weight="700">1,180 km/h</text>'),
    'coffee-lid': svg(400, 300,
      '<rect width="400" height="300" fill="#f4f0e7"/>'
      + '<ellipse cx="200" cy="240" rx="120" ry="18" fill="#dcd2c0"/>'
      + '<path d="M110 90 L130 236 Q200 256 270 236 L290 90 Z" fill="#fff" stroke="#8a2b21" stroke-width="4"/>'
      + '<rect x="96" y="70" width="208" height="30" rx="8" fill="#8a2b21"/>'
      + '<path d="M300 120 q60 10 40 70 q-10 30 -50 20" fill="none" stroke="#8a2b21" stroke-width="10" stroke-linecap="round"/>'
      + '<g stroke="#b8402a" stroke-width="4" stroke-linecap="round" fill="none"><path d="M160 40 q10 -14 0 -26"/><path d="M200 44 q10 -14 0 -26"/><path d="M240 40 q10 -14 0 -26"/></g>'
      + '<text x="200" y="285" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#7d7368">Fig. 3 — the problem</text>'),
  };
  async function seed(Library) {
    for (const name of Object.keys(FIGS)) {
      await Library.seed(name, new Blob([FIGS[name]], { type: 'image/svg+xml' })).catch(() => {});
    }
  }

  const md = `# Hyperloop: A Study of Going Very Fast in a Tube

**Department of Optimistic Transit** · Vol. 88, No. 3 · Peer-reviewed by *three guys on a forum*

> **Abstract.** We investigate whether humans can be fired through a steel straw at airline speeds without spilling their coffee. Findings: the speed is achievable; the coffee is not. Funding generously provided by a man who *really* hates traffic.[^1]

---

## 1. Introduction

For over a century, engineers have dreamed of travel that is **faster than a train**, *cheaper than a plane*, and ~~financially realistic~~ visionary. The Hyperloop promises all three, provided you ignore the third. At its core the concept is simple: remove the air, add a pod, and let physics do the marketing.

As the great philosophers noted, \`velocity = distance / vibes\`. We adopt this as our governing equation.

See also our earlier work, [On the Feasibility of Catapulting Commuters](https://example.org/catapult), which the ethics board described as "a cry for help."

### 1.1 Research Questions

- Can a pod reach 1,200 km/h without turning lunch into a wall decoration?
- Will passengers accept windows that show only darkness?
  - Follow-up: what about windows that show *slightly less* darkness?
  - Follow-up to the follow-up: is a painted-on window a window?
- Is "mild existential dread" an acceptable in-flight amenity?

### 1.2 A Note on Tone

This paragraph exists purely so the **Body** style can prove it stays calm and readable, even while the surrounding text describes terrifying acceleration. Well done, body text. Stay strong.

A line can be broken without starting a new paragraph\\
by ending it with a backslash — useful for addresses,\\
poetry, and dramatic pauses.

\\
The blank line above comes from a lone \`\\\` on its own line. Below, \`\\vspace 2\` leaves two.
\\vspace 2
And here the text resumes.

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

![The test pod, mid-tube](pod-diagram "Figure 1. The pod in its natural habitat. Speed lines are illustrative and, frankly, aspirational.")

### 2.1 Test Schedule

1. Build tube
2. Briefly question life choices
3. Insert pod
4. Run *exactly one* test
5. Hold a triumphant press conference regardless of outcome

\\pagebreak

## 3. Results

The data are summarized below. The trends are, scientifically, going up.

| Metric                 |    Target |  Observed | Verdict |
|------------------------|----------:|----------:|:-------:|
| Top speed (km/h)       |     1,200 |     1,180 |   😎    |
| Coffee retained (%)    |       100 |        12 |   ☠️    |
| Passenger volume (dB)  |        40 |       118 |   📈    |
| Investor confidence    | Boundless | Boundless |   💸    |

![Top speed per test run](speed-chart "Figure 2. Top speed by test run, in km/h. Test 4 is the one we put in the brochure."){width=75%}

> **Note.** Reviewer 2 insists the screaming is a *feature*, providing "free in-cabin entertainment and a natural smoke alarm."
>
> Reviewer 3 has not been heard from since the demonstration.

![The coffee lid](coffee-lid "Figure 3. Current lid design (patent pending, hope fading)."){width=40% align=right}

The image above is set to 40% width and aligned right — written into the markdown as \`{width=40% align=right}\`, which the style popover in the preview does for you when you click an image and pick a width.

### 3.1 Safety Checklist

- [x] Tube is, in fact, a tube
- [x] Pod fits inside tube
- [x] Emergency snacks loaded
- [ ] Emergency exit identified
- [ ] Reason the emergency exit does not exist

#### 3.1.1 Minor Concerns

A small heading-four note for completeness: the brakes are currently best described as "aspirational."[^2]

## 4. Risk Assessment

| Risk                | Likelihood | Impact |     Mitigation      |
|---------------------|:----------:|:------:|:-------------------:|
| Pod gets stuck      |   Medium   |  High  |       Push it       |
| Tube springs a leak |    High    |  High  |        Tape         |
| Physics says no     |  Low (ish) | Cosmic |  Ask physics nicely |

Note: the "Low (ish)" rating was supplied by our most enthusiastic intern.

### 4.1 The Full Incident Log

A long table continues onto the next page with its header repeated — which is exactly what this one is here to demonstrate.

| Run | Date       | Speed (km/h) | Outcome                                  |
|----:|------------|-------------:|------------------------------------------|
|   1 | 03 March   |          210 | Pod moved. Cheering.                     |
|   2 | 04 March   |          380 | Pod moved further. Muted cheering.       |
|   3 | 05 March   |          640 | Coffee incident #1.                      |
|   4 | 06 March   |          890 | Hose detached. Blamed the hose.          |
|   5 | 09 March   |          940 | Intern promoted for enthusiasm.          |
|   6 | 10 March   |        1,020 | Windows painted on. Morale up.           |
|   7 | 11 March   |        1,080 | Coffee incident #2 (see Fig. 3).         |
|   8 | 12 March   |        1,110 | Reviewer 3 boards. Waves.                |
|   9 | 13 March   |        1,140 | Reviewer 3 not seen at lunch.            |
|  10 | 16 March   |        1,160 | Brakes described as "a concept".         |
|  11 | 17 March   |        1,170 | Tape restocked.                          |
|  12 | 18 March   |        1,180 | Brochure photo taken. Press conference.  |
|  13 | 19 March   |            0 | Tube removed for "maintenance".          |
|  14 | 20 March   |            0 | Tube still absent.                       |
|  15 | 23 March   |            0 | Investors informed the tube is "cloud".  |
|  16 | 24 March   |            0 | Funding round closes, oversubscribed.    |

## 5. Conclusion

The Hyperloop is **technically possible**, *spiritually questionable*, and **financially** — let's move on. We recommend immediate funding, a slightly longer tube, and dramatically better coffee lids.

---

### Appendix A — Glossary

Terms: **Pod** a tube for a person, inside a tube for the pod · **Vacuum** the thing our budget abhors · **Soon™** any time between next quarter and the heat death of the universe.

### Appendix B — How this document was made

Everything you see is plain Markdown in the left pane, plus a few extras: \`\\pagebreak\` for a page break, \`\\\` on its own line for a blank line, a quoted title after an image for its caption, and \`{width=50% align=right}\` after an image to size it. Type \`/\` at the start of a line for the full list, or open the syntax reference with the **?** button.

*End of report. Replace it with your own Markdown — unless you, too, dream of tubes.*

[^1]: He has asked not to be named, then named himself in every interview since.
[^2]: The word "brakes" appears in the budget under "future work."
`;
  const resume = `# Alex Nguyen

**Senior Business Analyst** · Sydney, NSW\\
0412 345 678 · alex.nguyen@example.com · linkedin.com/in/alexnguyen-ba

Business analyst with nine years across financial services, health insurance and NSW public sector delivery. I turn ambiguous problems into clear requirements, workable options and measurable outcomes, and I am at my best where product, technology and operations meet. CBAP, PRINCE2 Practitioner, Certified Scrum Product Owner. Full Australian working rights.

## Core skills

| Analysis | Delivery | Tools |
|---|---|---|
| Requirements elicitation and prioritisation | Agile (Scrum, SAFe) and hybrid delivery | Jira, Confluence, Azure DevOps |
| Process mapping (BPMN), current and target state | Backlog ownership and story writing | Miro, Visio, Figma |
| Data analysis, SQL, reporting | Vendor and stakeholder management | SQL, Power BI, Excel |
| Options papers and business cases | UAT planning and change enablement | Salesforce, Guidewire |

## Experience

### Senior Business Analyst — Harbourline Insurance, Sydney
*March 2021 – present*

- Led analysis for the claims platform replacement (Guidewire ClaimCenter), a $14M program serving 1.2M policyholders; owned requirements for intake, triage and payments across four squads.
- Cut average claim lodgement time from 11 minutes to 4 by redesigning the digital intake flow; defined and tracked the metrics that proved it.
- Ran fortnightly prioritisation with Claims Operations, Legal and Technology, keeping a 300-item backlog honest and traceable to the business case.
- Mentored three analysts; introduced a lightweight requirements standard adopted across the program.

### Business Analyst — Kestrel Digital (consultancy), Sydney
*July 2018 – February 2021*

- Engagements for a NSW Government agency (grants management), a superannuation fund (member portal) and a national retailer (order management).
- Produced current-state process maps and target-state designs for the grants program, reducing application handling steps from 27 to 12.
- Facilitated discovery workshops with up to 40 stakeholders; wrote the options paper that secured $3.2M in funding for the member portal.
- Built Power BI dashboards that gave the retailer its first end-to-end view of order exceptions.

### Business Analyst — Southern Cross Health Fund, Sydney
*February 2016 – June 2018*

- Requirements and UAT lead for the member self-service rollout (claims, cover changes, payments) on Salesforce.
- Wrote 180+ user stories with acceptance criteria; coordinated UAT with 25 testers across three states, closing 340 defects before go-live.
- Analysed call-centre data to identify the top ten drivers of contact; three fixes removed 18% of inbound volume.

### Graduate Analyst — Southern Cross Health Fund, Sydney
*February 2015 – January 2016*

- Rotations through Product, Operations and Technology; supported regulatory reporting and process documentation.

## Education and certifications

**Bachelor of Commerce (Information Systems)** — University of New South Wales, 2014

- Certified Business Analysis Professional (CBAP), IIBA — 2020
- PRINCE2 Practitioner — 2019
- Certified Scrum Product Owner (CSPO) — 2018
- Microsoft Power BI Data Analyst Associate — 2022

## Selected outcomes

- **$14M claims platform** delivered on time; lodgement time down 64%.
- **$3.2M business case** approved on first submission.
- **18% reduction** in call-centre contacts from data-led fixes.

## Referees

Available on request.
`;

  const SAMPLES = [
    { id: 'blank',  label: 'Blank',        note: 'An empty page',                     md: '',     theme: null },
    { id: 'demo',   label: 'Demo article', note: 'Every element the editor knows',    md,         theme: 'report' },
    { id: 'resume', label: 'Résumé',       note: 'Business Analyst, Sydney — a sample', md: resume, theme: 'resume' },
  ];
  return { md, resume, SAMPLES, seed, FIGS };
})();

---
name: design-system-crm-for-the-next-generation-of-teams
description: Creates implementation-ready design-system guidance with tokens, component behavior, and accessibility standards. Use when creating or updating UI rules, component specifications, or design-system documentation.
---

<!-- TYPEUI_SH_MANAGED_START -->

# CRM for the next generation of teams.

## Mission
Deliver implementation-ready design-system guidance for CRM for the next generation of teams. that can be applied consistently across marketing site interfaces.

## Brand
- Product/brand: CRM for the next generation of teams.
- URL: https://attio.com/p/crm-1707-25?utm_source=google_ads&utm_medium=ppc&utm_campaign=Search-CRM-APAC-T2-Desktop&utm_term=customer%20database%20software&utm_content=9224268&utm_campaignid=23448827979&utm_adgroup=195381135790&gad_source=1&gad_campaignid=23448827979&gbraid=0AAAAApZTfonjyy24E0r-Bubx1p37ZmWR3&gclid=CjwKCAiAzKvXBhBAEiwABLl9AlC5ckhtDsHHA8VXbOlT0Lh1ukcjdEHGCtJWK3RX07XtbQLDCfQ0qhoCpGwQAvD_BwE#FAQs
- Audience: authenticated users and operators
- Product surface: marketing site

## Style Foundations
- Visual style: structured, accessible, implementation-first
- Main font style: `font.family.primary=inter`, `font.family.stack=inter, inter Fallback`, `font.size.base=16px`, `font.weight.base=500`, `font.lineHeight.base=22px`
- Typography scale: `font.size.xs=12px`, `font.size.sm=13px`, `font.size.md=14px`, `font.size.lg=15px`, `font.size.xl=16px`, `font.size.2xl=20px`, `font.size.3xl=40px`, `font.size.4xl=56px`
- Color palette: `color.text.primary=lab(10.7201 -0.0959039 -1.54182)`, `color.text.secondary=lab(76.2541 -1.09726 -7.09252)`, `color.text.tertiary=lab(37.426 -1.09151 -9.33263)`, `color.text.inverse=lab(50.3787 -1.31875 -9.56043)`, `color.surface.base=#000000`, `color.surface.muted=lab(99.9987 0.0337958 0.000309944)`, `color.surface.raised=lab(12.7212 0.103362 -2.22102)`, `color.surface.strong=lab(4.67701 0 0)`, `color.border.default=lab(86.0989 -0.77799 -4.0961)`
- Spacing scale: `space.1=1px`, `space.2=4px`, `space.3=6px`, `space.4=8px`, `space.5=10px`, `space.6=12px`, `space.7=15px`, `space.8=16px`
- Radius/shadow/motion tokens: `radius.xs=4px`, `radius.sm=8px`, `radius.md=10px`, `radius.lg=12px`, `radius.xl=50px` | `shadow.1=rgba(0, 0, 0, 0.06) 0px 1px 6px 0px, rgba(0, 0, 0, 0.16) 0px 2px 32px 0px` | `motion.duration.instant=150ms`, `motion.duration.fast=167ms`, `motion.duration.normal=250ms`, `motion.duration.slow=300ms`, `motion.duration.slower=400ms`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
concise, confident, implementation-focused

## Rules: Do
- Use semantic tokens, not raw hex values in component guidance.
- Every component must define required states: default, hover, focus-visible, active, disabled, loading, error.
- Responsive behavior and edge-case handling should be specified for every component family.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and tokens.
3. Define component anatomy, variants, and interactions.
4. Add accessibility acceptance criteria.
5. Add anti-patterns and migration notes.
6. End with QA checklist.

## Required Output Structure
- Context and goals
- Design tokens and foundations
- Component-level rules (anatomy, variants, states, responsive behavior)
- Accessibility requirements and testable acceptance criteria
- Content and tone standards with examples
- Anti-patterns and prohibited implementations
- QA checklist

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Prefer system consistency over local visual exceptions.

<!-- TYPEUI_SH_MANAGED_END -->

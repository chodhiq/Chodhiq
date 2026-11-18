# ChodhiQ public website review and rework brief

**Scope:** `https://chodhiq.co.uk/` and its source in `site-static/`  
**Review date:** 17 November 2026  
**Status:** Review only; no product files changed

## Review basis

The review covered the current workspace copy of `site-static/index.html` and `site-static/styles.css`. The live browser could not be inspected in this session, so production appearance and content may differ from this source snapshot. Recheck the deployed site before implementation or publication.

## What is working

- The visual identity is distinctive and consistent: deep green, lime accents, generous typography, and custom map/community illustrations.
- The page communicates a community-first purpose and covers discovery, community connection, provider growth, trust, customer/provider journeys, FAQs, and beta policies.
- Customer and provider journeys acknowledge the current beta process and limitations.
- Responsive breakpoints and reduced-motion handling are present in the stylesheet.

## Main opportunities

1. **Make the product concrete sooner.** The emotional hero headline does not immediately say what visitors can do in the app. Add a plain-language product description and a real app/product preview near the top.
2. **Give each audience a clear next step.** Customers, community members, and providers currently share one long narrative. Make the customer and provider paths visible in the hero, with calls to action that lead to the right destination.
3. **Reduce repetition and page length.** Several sections restate discovery, connection, and community benefits. Prioritize the strongest content and move supporting detail lower on the page.
4. **Use action-oriented calls to action.** Most current calls to action scroll further or open email. Where the beta supports it, link directly to the app/store or provider application flow; otherwise make the current next step explicit.
5. **Validate live details.** Confirm app availability, provider onboarding links, email destinations, policy links, and beta/payment wording against the production product before changing or publishing copy.

## Suggested direction

Rework the homepage around two primary paths:

- **Find a local service** — explain customer discovery and community features, then link to the app or the appropriate beta entry point.
- **List your business** — explain the provider review and dashboard process, then link to the provider application/contact route.

Keep the existing ChodhiQ visual identity, but make the opening screen answer what the platform does, who it serves, and what to do next. Use authentic product imagery where available rather than abstract interface decoration alone.

## Suggested page structure

1. Short navigation with clear customer and provider actions.
2. Hero with a concrete one-sentence description, the two audience paths, and a real product preview.
3. Three concise benefits: discover, connect, grow.
4. Separate customer and provider sections with accurate beta expectations.
5. Trust and safety details, with careful wording about independent providers and verification.
6. Short FAQ covering eligibility, beta availability, cost, provider approval, and privacy.
7. Contact and policy links in the footer.

## Before implementation

- Inspect the live site in a working browser and compare it to `site-static/`.
- Confirm the intended primary audience and whether app store/beta destinations are ready.
- Confirm the provider application route and whether email should remain the fallback.
- Keep legal and beta disclosures consistent with the current app and approved policy pages.

## Files reviewed

- `site-static/index.html`
- `site-static/styles.css`
- `project-docs/legal/PUBLISHING.md` (publication workflow context)

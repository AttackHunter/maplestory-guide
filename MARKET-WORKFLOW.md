# Market workspace

The market tools use the guide's existing price snapshots and history files. They do not log in to third-party services, bypass access controls, query private APIs, or run an unattended scan loop.

## Browsing and watchlist

Search words combine in any order. Category, minimum sample count and saved-only filters combine with the search. Tables render 25, 50 or 100 rows at a time. Stars and filters stay in this browser's local storage. Saving an item is not a price alert. Imported numeric IDs may collide, so watchlists use exact item names.

## Checking a possible flip

1. Select the exact item, then enter the actual in-game shop price. Selecting another item clears the previous quote.
2. For gear, verify matching main stats, remaining slots, and relevant secondary stats. An item-wide price average is not a valuation of an individual roll.
3. Enter the quantity, available budget, listing age and the next competing ask. Add up to ten confirmed comparable unit sales, newest first. Exclude unconfirmed rows and your own purchases.
4. The conservative resale reference is the lower of the newest five sales' median and the next ask minus one. Estimated total profit includes the 3% fee and quantity. Less than 5,000 total profit is skipped. Listings older than 20 minutes or beyond budget are skipped.
5. Priority requires ten comparison sales, a price below all of them and below the next ask, age at most ten minutes, at least fifteen daily sales, at least 30,000 profit and at least 25% return. Below-base gear needs both 30,000 profit and 15% return for consideration as a top pick. Listings over five minutes old may be gone. These are checks on manually supplied information, not proof of availability or a guaranteed return.

Cosmetic coupons, crates, megaphones and pets are excluded from the flip worksheet. Their existing reference price tables remain available. For store pricing, use comparable sales to support a high starting price, then step down deliberately; the conservative undercut estimate is a reference, not an automatic starting price. The fee calculator shows losses explicitly.

## Maintaining the guide alongside Claude

The public repository contains the generated site. The existing local guide project is the canonical source, and its `build-share.mjs` generates both `site/` and the Claude Artifact copy in `share/`. The market HTML/logic changes must be applied to that canonical `index.html`, alongside `market-tools.js`, `market.css`, and the updated builder. The builder copies both assets and embeds the market styles in the Artifact. Do not edit only the generated page and then overwrite it with an old build.

No private holdings, budgets, ledger records, or third-party session cookies are embedded in these changes. The existing sales bookkeeping flow remains separate.

Run `npm test` for dependency-free Node tests. Preview with a local static web server. Check search, watchlist persistence, pagination, item switching, mobile table scrolling, and the flip worksheet before publishing.

# FluxStore

A storefront built with **React** using the original **Flux** architecture: a central dispatcher, stores that own state, action creators that own side effects, and one controller-view that subscribes to stores and passes props down. It has an Express API, and Webpack and Babel build the UI.

> Portfolio reference implementation of a 2015 project (React 0.14 + Flux), using React 16 class components and a hand-written dispatcher that matches Facebook's `flux` semantics.

## Data flow

```
 view (React) ──user event──▶ action creator ──(HTTP if needed)──▶ Dispatcher.dispatch(action)
       ▲                                                               │  broadcast to every store
       └──────── "change" ◀── ProductStore ◀── waitFor ── CartStore ◀──┘
```

- **Dispatcher** ([src/flux/Dispatcher.js](src/flux/Dispatcher.js)): synchronous broadcast, `waitFor` with circular-dependency detection, guards against nested dispatch, and recovers after a store throws
- **ProductStore**: catalog plus filter; visible products are derived (search, category, in-stock, featured/price/name sort)
- **CartStore**: `waitFor(ProductStore)` so in the same dispatch it clamps quantities to current stock (max 10), drops discontinued items when the catalog refreshes, and reflects stock consumed by checkout
- **Pricing in integer cents**: promos (%/fixed/free shipping), free shipping over $50, 8.25% tax. The server ([server/pricing.js](server/pricing.js)) recomputes everything and ignores client-sent prices, rejecting oversells, duplicates, bad quantities and ineligible promos

## Run

```bash
npm install
npm run build
npm start          # http://localhost:3000   promo codes: WELCOME10, FIVEOFF, SHIPFREE
```

## Test

```bash
npm test           # dispatcher semantics, stores and actions with a fake API, server pricing and order API
```

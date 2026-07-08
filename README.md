# prabin. — Personal Blog

A personal blog and portfolio for Prabin Shrestha. React 18 + Vite.

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the build locally
```

## Project structure

```
src/
  App.jsx                  — root layout, section order
  index.css                — global resets, keyframes, hover-class utilities
  components/
    Nav.jsx                — sticky blurred nav
    LetterIntro.jsx        — typewriter letter intro (opening section)
    WritingGrid.jsx        — 2-col essay card grid
    About.jsx              — teal band with tilted index card
    FunFact.jsx            — yellow band, shuffleable facts
    Languages.jsx          — pill tags (human + machine languages)
    Inventory.jsx          — pixel art items grid
    Contact.jsx            — dark footer with links
    PixelSticker.jsx       — reusable floating pixel art sprite (idle float + random fun moves)
  assets/
    dragooon.png           — floating sticker (hero)
    postcard.png           — floating sticker (hero, small)
    oops.png               — floating sticker (about section)
    tinkerer_big.png       — floating sticker (fun fact)
    spacema_big.png        — floating sticker (contact)
    boots.jpg              — inventory item
    backpack.jpg           — inventory item
    zine.jpg               — inventory item
    tamagotchi.jpg         — inventory item
    coffee.jpg             — inventory item
```

## Design tokens

| Token        | Value     | Usage |
|---|---|---|
| Background   | `#f7f5f0` | Page background, warm off-white |
| Ink          | `#141414` | Primary text, nav, dark cards |
| Pink         | `#ff6b9d` | Accent — essay card, CTA, dots |
| Yellow       | `#ffd23f` | Accent — essay card, fun fact band |
| Teal         | `#4ecdc4` | Accent — essay card, about band |
| Letter paper | `#faf8f3` | Letter intro background |

## Typography

| Role       | Family                           | Weight | Notes |
|---|---|---|---|
| Display    | Bricolage Grotesque              | 800    | Headlines, card titles, contact heading |
| Body       | Hanken Grotesk                  | 400–700 | Body copy, nav, pills |
| Mono       | Space Mono                      | 400/700 | Labels, dates, letter body, footer |

## Pixel stickers

`PixelSticker` handles the idle float (`floaty` keyframe) and schedules a random fun move (spin / wiggle / hop / tada / flip) every 5–10 seconds. Pass `src`, `size`, `rotate`, `floatDur`, `delay`, and a `style` object for absolute positioning.

All keyframes live in `index.css`. The CSS custom property `--r` carries the rotation value so animated transforms can preserve the base rotation angle.

## Hover states

Hover styles that can't be inline (`:hover` pseudo-class) are in `index.css` as utility classes:
- `.nav-link`, `.nav-link.teal`, `.nav-link.yellow` — nav link colors
- `.essay-card`, `.essay-card.white` — card lift + shadow
- `.inventory-item` — item lift
- `.btn-pill` — button translateY
- `.shuffle-btn` — shuffle button scale
- `.footer-link.yellow/teal/pink` — footer link colors

## TODO / nice to haves

- Wire essay cards to a real CMS or markdown files (e.g. MDX + Vite)
- Add an essay detail page with React Router
- Fill in LinkedIn and email links in `Contact.jsx`
- Add mobile responsive breakpoints (the grid goes 2-col → 1-col below ~640px)
- Update the date in `LetterIntro.jsx` dynamically

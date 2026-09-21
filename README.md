# Climate Change: The Chemistry of a Warming Planet

A single-page chemistry project site. No build tools, no dependencies, just three files.

## Files

- `index.html` — page structure and content
- `style.css` — all styling (sage/ivory/charcoal/amber palette, layout, animations)
- `script.js` — all interactivity (hero animation, greenhouse slider model, Molecule Lab,
  reaction simulator, activity cards, CO2 chart, edit mode)
- `earth-hero.jpg` — the Earth/greenhouse-effect image used as the hero's visual base
  (cropped and masked in CSS so just the globe and atmosphere show through)

## Running it

Just open `index.html` in a browser, or upload all four files (keeping them in the same
folder) to any static host — GitHub Pages, Netlify, your school's server, anywhere.
`earth-hero.jpg` must stay next to `index.html`/`style.css` or the hero background won't load.

## Hero animation

The hero uses the uploaded Earth image as its base (masked into a soft circular fade so it
blends into the dark background), with sunlight rays, infrared rays, and small greenhouse-gas
molecule markers animated on top in SVG. It's connected to the greenhouse-gas slider further
down the page (`#ghSlider`): moving that slider changes how many molecules are visible in the
hero and how often outgoing infrared rays get intercepted and sent back toward Earth versus
escaping to space, live, even before you scroll down to the slider itself.

## Editing the text yourself

A few key text blocks (hero title, intro, core question) can be edited directly in the
browser. Open the site with `#edit` added to the end of the URL, e.g.:

`index.html#edit`

A small panel appears in the bottom-right letting you:
- type directly into the editable text
- **Save changes (this browser)** — keeps edits in that browser's local storage only
- **Download edited site** — downloads a new `index.html` with your edits baked in

To publish edits for visitors, download the edited file and replace `index.html` in this
folder (keep `style.css` and `script.js` as they are), then re-upload wherever you're
hosting it. Visitors browsing normally never see the edit panel.

## Data sources

Everything except one chart is drawn directly from the project's research paper (see the
References section in the page itself: NASA, IPCC, EPA, NOAA, Cambridge, FAO, ACS).

The one exception: the interactive CO2 chart in the Evidence section uses figures derived
from NOAA Global Monitoring Laboratory's published Mauna Loa growth-rate data, calculated
forward from the standard 1959 baseline of 315.97 ppm. That data isn't from the research
paper, it was added separately as the chart's source.

## Experiment results

The Experiment & Results section (`#experiment`) is intentionally left with placeholder
"pending" values in the results table and graph. Once real data is collected, edit that
table directly in `index.html` (or use edit mode above) to fill it in.

# Hub art: what to generate

The roads, water, grass, flowers and HUD are already in the new look (drawn in code). What still needs drawn art
for the hub to match the mock-up is the scenery that stands up: trees, bushes and the player's house. Generate the
two sheets below, then drop the images into the chat. I cut them up with `tools/cut-sprites.py` and place them.

**Attach the approved hub mock-up to every request as the style reference.**

## The shared style (paste at the start of every prompt)

> Cozy cartoon game art in the exact style of the attached reference image: top-down three-quarter view (we see
> the tops and the fronts of things), thick dark outlines on every shape, soft cel shading, light coming from the
> top left, warm saturated colours, Caribbean island village feel. Clean shapes that read clearly at small size.
> Plain pure white background. No ground under the objects, no cast shadows on the background, no text, no
> labels, no border.

## Sheet 1: hub scenery (done)

In: `public/sprites/world/hub/` holds the trees, bushes, plants, flowers, grass tufts, rocks and mushrooms, cut with
`tools/cut-sprites.py` and listed in `src/data/world/props.js`. Drawn trees stand on every tree square in and around the
hub, and the rest is scattered over the hub's open grass by a place-fixed hash (`src/scenes/world/props.js`). To give
another land the same treatment, generate its own sheet with the prompt below (swapping the plants for that land's), cut
it into `public/sprites/world/<land>/` and add a set to `PROP_SETS`.

### The prompt that made it

> [shared style] A sprite sheet of 12 separate objects in 4 columns and 3 rows, each one whole, centred in its
> own space with plenty of white space between them (nothing touching or overlapping):
> row 1: a large round leafy tree, a medium round leafy tree, a tall slim tree, a palm tree;
> row 2: a big rounded hedge bush, a small round bush, a wide low hedge, a leafy tropical plant with big leaves;
> row 3: a clump of pink and yellow flowers, a clump of blue and white flowers, a cluster of grey rocks, a tuft of
> tall grass.
> Trees show their trunk at the bottom. All objects drawn at the same scale as each other.

## Sheet 2: the player's house (done)

The house is in: `public/sprites/world/hub/house.png`, cut from the generated picture by `tools/clean-house.py`
(which patches out the hearts, the hanging sign and the player, and makes the grass transparent). The game lines
its walls up with the house's three-by-three footprint, so the roof overhangs a little and the door stays where
the map says. A new picture goes through the same tool:

    python tools/clean-house.py <picture> public/sprites/world/hub/house.png

For other buildings, generate them the simple way instead: one building, whole and centred, on plain white, with
nothing in front of it and no sign (the game draws the name plates).

## Sheet 3: Studio Summit, a whole land as one picture (done)

Studio Summit is in: `public/sprites/world/studio/summit.png`, the generated plateau on white with the white made
transparent (the cutter kept the biggest connected piece and softened the edge). The game lays it over fifteen by
fifteen map squares (columns 40 to 54, rows 0 to 14) at depth 1.1, so the player, villagers and coins draw on top
and the forest's tile trees fill its corners. The map does not draw buildings or roads there: `SUMMIT.rows` in
`src/data/world/map.js` is a fifteen-line picture of where the floor is ('o'), what is rock, building or easel
('#'), where the coins sit ('c') and where the stairs leave through the gate ('g'). To redo it, generate the whole
plateau again on plain white from the same viewpoint (looking down from the south, the building at the top, the
stairs down at the bottom left) and cut it the same way; then fix the rows if the floor moved.
Small things in the picture that block the way (a stone across a path) can be wiped with `tools/erase-boxes.py`,
which covers a box with clean floor copied from elsewhere in the same picture.

For a land done this way, give its villagers spots on the floor near the things they talk about: the painter by
the easels, the sculptor in front of his stones, Mirror Mia by the big mosaic, the curator on the lower terrace.

## Sheet 4: inside the hospital (done)

Health Heights lives inside the hub's hospital. The interior is one drawn picture, `public/sprites/world/hospital/inside.png`,
made from the generated isometric cutaway with `tools/cut-outside.py`, which makes only the white *outside* the building
transparent (the floors inside are nearly white too, so a plain white cut would have eaten them). The game lays it over
twenty by twenty squares; `FLOOR` in `src/data/health/hospital.js` says where the corridors and room floors are, where the
four staff stand and where the door mat is. A new picture goes through the same tool, then the rows are checked against it.

## Sheet 5: the hero, in a style the kids can edit (in progress)

The drawn hero is one fixed picture, so the profile editor's choices (skin, hair, top, bottom, shoes) stopped showing.
The fix is a small set of hero sheets drawn with **flat marker colours** that the game swaps for each child's choices
when it loads the sheet. Generate one sheet per body type and hairstyle; the game recolours everything else.

What to generate, each as its own picture (the same layout as the player sheet, so `tools/make-player-sheet.py`
cuts it): four rows of the same child facing front, left, right and back; in each row standing poses then a walk
cycle, every figure the same size with feet on one line, on a plain flat background that is not one of the marker
colours (mid grey #808080 is ideal).

Marker colours (ask for them by hex, flat with only simple two-tone shading, nothing patterned):
- skin: #F5CBA7, with the darker shade #E0A878
- hair: #9B59B6 (purple)
- top (a plain T-shirt): #2ECC71 (green)
- bottom (plain shorts or trousers): #3498DB (blue)
- shoes: #E74C3C (red)
- eyes: #000000 pupils, white eyes

Sheets wanted (name each file `hero-<body>-<hair>`): two body types, `a` and `b`, each with six hairstyles:
`curls` (short curls), `afro`, `braids` (plaits or cornrows), `bun` (puff or bun), `long` (long straight or wavy),
`buzz` (very short). Twelve sheets. The style line at the top of this guide applies, plus: "cute, friendly child of
about eight, big eyes, simple shapes, thick outline in a darker shade of each colour".

The game then maps each marker to the chosen colour while keeping the shading, so a green shirt becomes any shirt
colour, purple hair any hair colour, and the skin any of the editor's tones.

## Tips

- Ask for the largest size your generator offers. I scale down; scaling up goes blurry.
- If two objects touch, I can't separate them. Ask again with "more space between objects".
- Different trees or bushes from what's listed are fine. Keep the style and the white background.
- Text in a picture won't be used. Signs and labels stay drawn in code so they stay sharp and easy to change.

## Later lands

The same two kinds of sheet, per land: a scenery sheet (that land's trees, plants and rocks) and one picture per
building type (three houses per land, plus the castle or fort). Villagers are regenerated as walking sheets the way
the player, Hope and Sam were, and go through `tools/make-player-sheet.py`.

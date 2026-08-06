# 원본 아트 생성 근거

## 15종 정착지 지형 표면 아틀라스

- 프로젝트 자산: `static/art/settlement/terrain-surfaces-atlas-v2.png`
- 프레임 정의: `static/art/settlement/terrain-surfaces-atlas-v2.json`
- 최종 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-8a1e0195-29b9-4092-ab40-3f6f594b839a.png`
- 생성 방식: 내장 이미지 생성 도구 `stylized-concept` 후 `precise-object-edit`
- 폴백 생성기: 사용하지 않음
- 후처리: 단색 배경을 로컬 크로마키 제거 도구로 RGBA 알파 변환

### 최초 생성 프롬프트

```text
Use case: stylized-concept
Asset type: production isometric terrain-tile atlas for a browser-based 2.5D pirate settlement management game
Primary request: create exactly fifteen complete isolated isometric terrain surface tiles arranged in a precise 3-column by 5-row contact sheet.

Required order:
Row 1, left to right: deep ocean water; shallow reef water with pale submerged coral; warm salt-worn beach sand.
Row 2, left to right: coastal scrub ground; fertile tropical plain grass; dark tropical forest floor with subtle roots and low undergrowth only.
Row 3, left to right: rocky grass slope surface; exposed gray cliff-top stone surface; wind-beaten highland grass and rock.
Row 4, left to right: dark limestone cave-ground surface; fractured ravine ground with one readable diagonal fissure; wetland mud with shallow pools and sparse reeds.
Row 5, left to right: pale stone deposit ground with gravel; dark iron-vein ground with restrained rusty mineral streaks; copper-vein ground with restrained oxidized teal and copper mineral streaks.

Scene/backdrop: every cell must use one perfectly flat uniform solid #ff00ff chroma-key background for local background removal. No borders, dividers, grid lines, shadows, scenery or lighting variation in the background.
Style/medium: polished hand-painted 2.5D strategy-game terrain tiles, stylized realism, premium dark maritime art direction, original design.
Composition/framing: identical fixed orthographic isometric camera for all fifteen cells; every tile is one flat diamond with exactly 2:1 width-to-height geometry, same size, same center position and same orientation; diamond points must face exact top, right, bottom and left of each cell; generous transparent-key padding around every diamond; each diamond fully contained and never overlaps another cell.
Lighting/mood: restrained warm upper-left daylight, cool lower-right ambient occlusion, strong readable material separation, suitable beneath buildings and moving residents.
Color palette: deep desaturated teal water, weathered sand, salt-muted tropical greens, charcoal rock, aged umber soil, restrained mineral accents. Do not use magenta or pink inside any terrain tile.
Materials/textures: fine hand-painted water ripples, sand grain, worn grass, roots, slate, mud, gravel and mineral seams; texture density must remain legible after each tile is downscaled to about 80 by 40 pixels.
Constraints: exactly fifteen tiles in the specified 3-column by 5-row order; only surface art inside each diamond, no vertical cliff sides; no large trees, buildings, people, animals, crates, flags, labels, icons, text, numbers, logos or watermark; no cast shadow, contact shadow, glow, reflection outside the diamond; outer diamond silhouette must be crisp and identical for seamless grid placement; keep all important texture away from the outermost edge so neighboring tiles blend.
Avoid: perspective mismatch, hexagons, square tiles, circular islands, raised blocks, floating platforms, different diamond sizes, inconsistent camera angles, photorealistic satellite imagery, bright mobile-game cartoon colors, noisy micro-detail, tile borders, outlines, baked UI highlights, cropped diamonds, duplicate terrain appearances.
```

### 최종 정밀 편집 프롬프트

```text
Use case: precise-object-edit
Input images: Image 1: edit target, the existing fifteen-tile isometric terrain contact sheet.
Primary request: keep all fifteen terrain designs, their exact 3-column by 5-row order, materials, colors, camera angle and flat #ff00ff background unchanged. Change only the vertical scale and spacing of the full contact sheet so every terrain diamond, especially all three tiles in the fifth row, is completely visible with at least 18 pixels of flat magenta padding between its lowest point and the bottom canvas edge.
Composition/framing: preserve the exact 2:1 diamond geometry and identical tile size across all fifteen tiles; reduce every diamond uniformly by about 8 percent if needed and distribute all five rows evenly from top to bottom with clean magenta gaps between rows. Keep all left/right points and top/bottom points fully contained.
Constraints: exactly fifteen tiles; exact original order; no redesign, no new texture, no color change, no camera change, no labels, borders, dividers, grid lines, shadows, text, logos or watermark; background remains perfectly uniform solid #ff00ff; no magenta inside tiles.
Avoid: cropped bottom row, touching canvas edges, overlapping rows, inconsistent tile sizes, squashed or non-2:1 diamonds, extra tiles, missing tiles.
```

## 6종 건물 성장·상태 장식 아틀라스

- 프로젝트 자산: `static/art/settlement/building-progression-overlays-atlas.png`
- 프레임 정의: `static/art/settlement/building-progression-overlays-atlas.json`
- 최종 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-1c6b5a8c-f860-4641-81ae-1f19609302eb.png`
- 생성 방식: 내장 이미지 생성 도구 `stylized-concept`
- 참조 이미지: `static/art/settlement/core-buildings-atlas.png` — 스타일·시점·재질 참조 전용
- 폴백 생성기: 사용하지 않음
- 후처리: 단색 배경을 로컬 크로마키 제거 도구로 RGBA 알파 변환

### 최종 생성 프롬프트

```text
Use case: stylized-concept
Asset type: production building-state and progression overlay atlas for a browser-based 2.5D pirate settlement management game
Input images: Image 1 is a style reference only: preserve its hand-painted stylized realism, fixed orthographic isometric camera, salt-worn timber, dark stone, aged brass, muted canvas, restrained red pennants, warm lantern accents and readable game-scale silhouettes. Do not edit, copy, or reproduce any complete building from Image 1.
Primary request: create exactly six isolated, reusable isometric prop overlays arranged in a precise 3-column by 2-row contact sheet. Each overlay must dress the outer perimeter of an existing building while leaving a broad empty transparent-key opening through the center so the base building remains visible.

Required order:
Row 1, left to right:
1. CONSTRUCTION SCAFFOLD — open timber scaffold perimeter with four lashed posts, two cross braces, short plank staging, rope coil and one ladder; visibly incomplete construction, no building walls.
2. UPGRADE DERRICK — compact wooden lifting derrick with pulley, hanging empty hook, spare planks, stone blocks and a closed tool chest; center and lower-middle remain open.
3. VETERAN EXPANSION — modest level-two settlement dressing: two short weathered crimson pennants, one lantern post, stacked crates, barrel and reinforced timber corner footings; broad open center.
Row 2, left to right:
4. MASTER EXPANSION — prestigious level-three-plus dressing: two taller black-and-crimson banners, paired brass lantern posts, carved timber-and-stone corner footings, small brass weather vane and orderly supply crates; broad open center, no complete building.
5. DAMAGE DEBRIS — broken beams, cracked barrel, fallen dark roof shingles, scattered stone chips and a small scorched patch; no flame, no smoke, no intact building.
6. HALTED WORKSITE — tied salt-stained canvas covering a material pile, crossed loose planks, rope, inactive hand tools and a low temporary barricade; no text or warning symbol.

Scene/backdrop: every cell must use one perfectly flat uniform solid #ff00ff chroma-key background for local background removal. No ground plane, cast shadow, contact shadow, ambient vignette, gradient, texture, reflection or lighting variation in the background.
Style/medium: premium hand-painted 2.5D strategy-game prop sprites, stylized realism, original Dark Pirate Maritime Command art direction, production-ready rather than concept sketch.
Composition/framing: fixed orthographic isometric camera matching Image 1; exactly 3 equal columns and 2 equal rows; each prop cluster centered in its cell, same overall footprint scale and same orientation; generous magenta padding around every cluster; every object fully contained; all six clusters must read clearly when downscaled to roughly 140 by 120 pixels.
Lighting/mood: restrained warm upper-left daylight, cool lower-right ambient occlusion within the objects only; strong material separation.
Color palette: weathered umber timber, charcoal stone, beige salt-stained canvas, oxidized brass, restrained crimson and black fabric, warm amber lantern glass. Do not use magenta or pink inside any prop.
Materials/textures: readable wood grain, rope fibers, iron straps, chipped stone, worn canvas and tarnished brass; medium detail with crisp outer silhouettes.
Constraints: exactly six overlays in the specified order; all are isolated prop clusters, not buildings; preserve a large open central negative-space opening in frames 1 through 4; no people, ships, animals, complete roofs, complete walls, terrain, roads, labels, icons, letters, numbers, logos or watermark; no shadows or effects outside the physical props; no overlap between cells; all bottom-row objects fully visible with at least 24 pixels of magenta padding below their lowest point.
Avoid: complete buildings, dense scenery, closed center, front-facing camera, perspective mismatch, floating objects, cropped props, duplicated designs, bright cartoon colors, photorealism, tiny unreadable clutter, magenta fringe, black background, transparent checkerboard, borders, dividers, grid lines.
```

## 9종 산업 건물 본체 아틀라스

- 프로젝트 자산: `static/art/settlement/industry-buildings-atlas.png`
- 프레임 정의: `static/art/settlement/industry-buildings-atlas.json`
- 최종 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-2aea131b-0b0f-4bed-b0ae-4d5580d75965.png`
- 생성 방식: 내장 이미지 생성 도구 `stylized-concept`
- 참조 이미지: `static/art/settlement/core-buildings-atlas.png` — 스타일·시점·재질 참조 전용
- 폴백 생성기: 사용하지 않음
- 후처리: 단색 배경을 로컬 크로마키 제거 도구의 border auto-key·soft matte·despill로 RGBA 알파 변환

### 최종 생성 프롬프트

```text
Use case: stylized-concept
Asset type: production isometric building sprite atlas for a browser-based 2.5D pirate settlement management game
Input images: Image 1 is a style reference only. Match its premium hand-painted stylized realism, fixed orthographic isometric camera, salt-worn timber, dark stone, muted canvas, aged brass, compact readable silhouettes and upper-left warm daylight. Do not edit or reproduce any complete building from Image 1.
Primary request: create exactly nine complete isolated pirate-settlement industry buildings arranged in a precise 3-column by 3-row contact sheet.

Required order:
Row 1, left to right:
1. QUARRY — open gray-stone cutting yard with a low timber gantry, hand winch, stacked dressed blocks, rough exposed rock face and tool racks; no mine tunnel.
2. IRON MINE — reinforced dark timber mine entrance with black-gray iron-streaked rock, rail cart, rope hoist and support trestles; clear tunnel mouth.
3. COPPER MINE — distinct mine entrance with warm copper-brown ore accents, oxidized teal streaks, bucket hoist and lighter timber bracing; clearly different from iron mine.
Row 2, left to right:
4. TERRACED FARM — compact stepped crop plots with wooden retaining walls, small irrigation trough, grain bundles and fruit trellis; no large farmhouse.
5. SMELTER — squat stone furnace house with tall soot-dark chimney, ore bins, charcoal shed and warm closed furnace mouth; no loose smoke outside the sprite.
6. FORGE — fortified blacksmith workshop with slate roof, stone chimney, open-sided anvil bay, quench barrel and iron tool racks; visibly different from smelter.
Row 3, left to right:
7. MILL — timber-and-stone grain mill with one large readable wooden wheel, grain sacks and covered hopper; no windmill blades.
8. BAKERY — warm compact stone-and-timber bakehouse with brick oven chimney, covered bread cooling rack, flour sacks and small amber windows; no text or signs.
9. DISTILLERY — pirate rum distillery with copper still, coiled condenser, barrel racks, stone firebox and weathered timber shelter; copper equipment must be clearly readable.

Scene/backdrop: every cell must use one perfectly flat uniform solid #ff00ff chroma-key background for local background removal. No ground plane, cast shadow, contact shadow, gradient, vignette, texture, reflection or lighting variation in the background.
Style/medium: premium hand-painted 2.5D strategy-game building sprites, original Dark Pirate Maritime Command art direction, production-ready rather than concept sketches.
Composition/framing: exact fixed orthographic isometric camera matching Image 1; exactly 3 equal columns and 3 equal rows; one building centered in each cell; same orientation and consistent game scale; each building fully contained with generous magenta padding; lowest point of every bottom-row building at least 18 pixels above the canvas edge; silhouettes readable when downscaled to about 150 pixels wide.
Lighting/mood: restrained warm upper-left daylight and cool lower-right ambient occlusion contained within the object; high material readability.
Color palette: weathered umber timber, charcoal and gray stone, slate blue roofs, beige canvas, aged iron, oxidized copper, small warm amber window accents. Do not use magenta or pink inside any building.
Materials/textures: readable wood grain, chipped masonry, worn shingles, rope fiber, soot, iron straps, copper patina and practical pirate-made repairs.
Constraints: exactly nine buildings in the specified order; each cell contains one complete self-contained building; no people, ships, animals, terrain tile, road, scenery, labels, icons, letters, numbers, logos or watermark; no effects outside physical building parts; no overlap between cells; no cropping.
Avoid: duplicated silhouettes, modern machinery, fantasy magic, bright mobile-game cartoon colors, photorealism, top-down camera, front-facing elevation, mismatched perspectives, floating parts, black background, transparent checkerboard, borders, dividers, grid lines, magenta fringe, tiny unreadable clutter.
```

## 9종 사회·복지·군수·행정 건물 본체 아틀라스

- 프로젝트 자산: `static/art/settlement/society-buildings-atlas.png`
- 프레임 정의: `static/art/settlement/society-buildings-atlas.json`
- 최초 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-3f9de49f-0b68-4320-94d3-34be01e4050d.png`
- 최종 편집 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-4dbe5135-7d7a-4056-a66b-dfc2dd6c37d6.png`
- 생성 방식: 내장 이미지 생성 도구 `stylized-concept` 후 `precise-object-edit`
- 참조 이미지: `static/art/settlement/core-buildings-atlas.png` — 스타일·시점·재질 참조 전용
- 폴백 생성기: 사용하지 않음
- 편집 근거: 최초 초안의 해적 막사 주변 인물 세 명을 제거하고 직접 가려진 건물·소품 픽셀만 복원
- 후처리: 단색 배경을 로컬 크로마키 제거 도구의 border auto-key·soft matte·despill로 RGBA 알파 변환

### 최초 생성 프롬프트

```text
Use case: stylized-concept
Asset type: production isometric building sprite atlas for a browser-based 2.5D pirate settlement management game
Input images: Image 1 is a style reference only. Match its premium hand-painted stylized realism, fixed orthographic isometric camera, salt-worn timber, dark stone, muted canvas, aged brass, restrained crimson cloth, compact readable silhouettes and upper-left warm daylight. Do not edit or reproduce any complete building from Image 1.
Primary request: create exactly nine complete isolated pirate-settlement society, welfare, military and administration buildings arranged in a precise 3-column by 3-row contact sheet.

Required order:
Row 1, left to right:
1. BUNKHOUSE — sturdy two-story communal timber lodging with many small shuttered windows, exterior stair, boot rack, laundry line and shared porch; practical laborer housing.
2. PIRATE BARRACKS — broad fortified timber-and-stone barracks with weapon racks, reinforced doors, low palisade corners, training dummies and restrained crimson pennants.
3. SKILLED HOUSE — well-kept craftspeople's residence with stone foundation, quality shingle roof, small workshop awning, tool chest, flower box and warm windows.
Row 2, left to right:
4. OFFICER QUARTERS — dignified dark-timber residence with stone base, upper balcony, brass lanterns, map table visible under a covered veranda and black-crimson naval pennant; not a palace.
5. TAVERN — lively but unoccupied pirate tavern with broad porch, barrel stacks, covered outdoor tables, warm amber windows, hanging lanterns and weathered crimson canopy; no written sign.
6. INFIRMARY — clean timber-and-stone clinic with pale canvas awnings, herb drying rack, water barrels, stretcher under a covered porch and restrained warm windows; no red cross symbol.
Row 3, left to right:
7. POWDER MAGAZINE — compact heavily buttressed stone storehouse with lightning rod, thick iron-banded door, ventilation slots, sand barrels and separate low timber loading shelter; no fire or loose powder.
8. CAPTAIN'S LODGE — commanding but practical fortified lodge with stone foundation, broad map-room balcony, observation cupola, brass lanterns, black-crimson banners and guarded steps; visibly higher status than officer quarters.
9. EXPEDITION OFFICE — navigation planning hall with slate roof, covered chart veranda, telescope mount, rolled map racks, signal pennants, supply crates and brass instruments; no readable text.

Scene/backdrop: every cell must use one perfectly flat uniform solid #ff00ff chroma-key background for local background removal. No ground plane, cast shadow, contact shadow, gradient, vignette, texture, reflection or lighting variation in the background.
Style/medium: premium hand-painted 2.5D strategy-game building sprites, original Dark Pirate Maritime Command art direction, production-ready rather than concept sketches.
Composition/framing: exact fixed orthographic isometric camera matching Image 1; exactly 3 equal columns and 3 equal rows; one building centered in each cell; same orientation and consistent game scale; each building fully contained with generous magenta padding; lowest point of every bottom-row building at least 18 pixels above the canvas edge; silhouettes readable when downscaled to about 150 pixels wide.
Lighting/mood: restrained warm upper-left daylight and cool lower-right ambient occlusion contained within the object; high material readability; welfare buildings may have restrained warm window light.
Color palette: weathered umber timber, charcoal and gray stone, slate blue roofs, beige canvas, aged brass, iron straps, restrained crimson and black fabric, small warm amber window accents. Do not use magenta or pink inside any building.
Materials/textures: readable wood grain, chipped masonry, worn shingles, rope fiber, iron bands, aged canvas, tarnished brass and practical pirate-made repairs.
Constraints: exactly nine buildings in the specified order; each cell contains one complete self-contained building; no people, ships, animals, terrain tile, road, scenery, labels, icons, letters, numbers, logos or watermark; no effects outside physical building parts; no overlap between cells; no cropping.
Avoid: duplicated silhouettes, modern architecture, fantasy magic, bright mobile-game cartoon colors, photorealism, top-down camera, front-facing elevation, mismatched perspectives, floating parts, black background, transparent checkerboard, borders, dividers, grid lines, magenta fringe, tiny unreadable clutter.
```

### 인물 제거 정밀 편집 프롬프트

```text
Use case: precise-object-edit
Input images: Image 1 is the edit target, the existing 3-column by 3-row pirate settlement society-building atlas.
Primary request: remove every human figure from the entire atlas. In particular, remove all three visible people standing in front of and beside the PIRATE BARRACKS in row 1 column 2. Reconstruct only the small occluded building steps, timber deck, weapon racks, crates or barrels behind them so the barracks remains an unoccupied building sprite.
Constraints: change only the human figures and the tiny directly occluded pixels behind them; preserve all nine buildings, their exact 3-by-3 order, silhouettes, camera angle, materials, lighting, colors, scale, spacing, flat #ff00ff background and canvas framing unchanged; do not add people, characters, animals, text, labels, symbols, logos or watermark; keep every building fully contained and keep the background uniformly magenta.
Avoid: redesigning buildings, moving props, changing roofs or banners, adding new scenery, changing perspective, cropping, blurry repairs, extra objects outside the edited locations.
```

## 8종 주민 역할 후면 아틀라스

- 프로젝트 자산: `static/art/settlement/resident-roles-rear-atlas.png`
- 프레임 정의: `static/art/settlement/resident-roles-rear-atlas.json`
- 최종 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-fd2957ca-abe0-4bc3-99fc-c00892fbed87.png`
- 생성 방식: 내장 이미지 생성 도구 `stylized-concept`
- 참조 이미지: `static/art/settlement/resident-roles-atlas.png` — 역할·복식·체형·소지품·화풍 참조 전용
- 폴백 생성기: 사용하지 않음
- 후처리: 단색 배경을 로컬 크로마키 제거 도구의 border auto-key·soft matte·despill로 RGBA 알파 변환

### 최종 생성 프롬프트

```text
Use case: stylized-concept
Asset type: production rear-direction resident sprite atlas for a browser-based 2.5D pirate settlement management game
Input images: Image 1 is the character-role anchor and style reference. Create rear-facing counterparts for its exact eight role categories while preserving each role's outfit colors, body scale, carried tools and socioeconomic rank. Do not edit Image 1.
Primary request: create exactly eight isolated full-body pirate-settlement residents shown from a consistent rear three-quarter isometric view, all facing away toward the upper-right, arranged in the same precise 4-column by 2-row order as Image 1.

Required order and identity:
Row 1, left to right:
1. LABORER — rugged bearded general laborer with worn cream shirt, brown trousers, rope coil and pickaxe carried over one shoulder; rear view.
2. HAULER — strong dark-skinned cargo carrier with tan head wrap, rolled sleeves and a closed wooden crate held securely in both arms; rear three-quarter view, crate still readable.
3. BUILDER — red-bandanna carpenter with hammer, rolled plans and tool belt; rear view, plans secured at the side.
4. LOGGER — black-headscarf lumber worker with leather apron and axe held low; rear view.
Row 2, left to right:
5. FISHER — older fisher in yellow-brown oilskin coat and dark hat with bundled net over the shoulder; rear view.
6. SHIPWRIGHT — skilled dock worker in cream shirt, dark vest, blue headscarf, rope and mallet; rear view.
7. GUARD — professional pirate guard with red bandanna, dark vest and sheathed cutlass visible from behind; rear view.
8. OFFICER — senior pirate officer in long dark navy coat with gold trim, tricorn hat and rolled chart held at the side; rear view.

Scene/backdrop: every cell must use one perfectly flat uniform solid #ff00ff chroma-key background for local background removal. No floor, ground plane, cast shadow, contact shadow, gradient, vignette, texture, reflection or lighting variation in the background.
Style/medium: premium hand-painted 2.5D strategy-game character sprites, stylized realism, original Dark Pirate Maritime Command art direction, matching Image 1's rendering and proportions.
Composition/framing: exactly 4 equal columns and 2 equal rows matching Image 1; one centered full-body character in each cell; consistent rear three-quarter camera and identical feet baseline; generous magenta padding above hats, beside tools and below feet; all bodies, hands, weapons and carried objects fully contained; silhouettes readable when downscaled to about 36 by 48 pixels.
Pose: neutral practical walking-ready stance, weight balanced, feet separated slightly, arms naturally holding assigned tools; no dramatic action pose.
Lighting/mood: restrained warm upper-left daylight with cool lower-right ambient shading contained within each character.
Color palette/materials: preserve role-specific weathered cream, brown, ochre, dark navy, restrained crimson, aged leather, timber, rope and iron; do not use magenta or pink inside characters.
Constraints: exactly eight rear-facing residents in the specified order; no front-facing faces, no extra people, no duplicate roles, no scenery, buildings, terrain, labels, icons, letters, numbers, logos or watermark; no shadow or effect outside physical bodies and equipment; no overlap between cells; no cropping.
Avoid: front or side-only poses, looking over the shoulder, inconsistent body scale, modern clothing, fantasy armor, bright cartoon colors, photorealism, floating equipment, malformed hands, missing tools, black background, transparent checkerboard, borders, dividers, grid lines, magenta fringe.
```

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

## 산업 건물 2단계 전용 본체 아틀라스

- 프로젝트 자산: static/art/settlement/industry-buildings-tier2-atlas.png
- 프레임 정의: static/art/settlement/industry-buildings-atlas.json 공유
- 최초 2단계 생성 원본: /Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-c7b90d3f-9139-47da-af82-00c8e6a93ce7.png
- 최종 프레이밍 보정 원본: /Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-a3af7640-6909-4a26-9c60-91d5b20d61de.png
- 생성 방식: 내장 이미지 생성 도구 precise-object-edit
- 편집 대상: static/art/settlement/industry-buildings-atlas.png
- 프레이밍 참조: 기본 산업 아틀라스의 셀별 화면 점유율
- 폴백 생성기: 사용하지 않음
- 후처리: 단색 배경을 로컬 크로마키 제거 도구의 border auto-key·soft matte·despill로 RGBA 알파 변환
- 출력 검수: 1536×1024 RGBA, 3×3 고정 프레임, 9개 건물 순서·시점·정체성 유지, 네 모서리 완전 투명

### 최초 2단계 생성 프롬프트

~~~text
Use case: precise-object-edit
Asset type: production tier-2 isometric industry-building sprite atlas for the browser game "검은물결: 해적 군주"
Input image: Image 1 is the edit target and authoritative layout, building-identity, camera, scale, palette, material and style reference.
Primary request: transform the existing nine buildings into clearly upgraded tier-2 versions while preserving the exact 3-column by 3-row atlas, exact cell order, cell boundaries, fixed orthographic isometric camera, original footprint family, and Dark Pirate Maritime Command art direction.
Cell order, left to right:
row 1: quarry, iron mine, copper mine.
row 2: terraced farm, smelter, forge.
row 3: waterwheel mill, bakery, rum distillery.
Tier-2 changes:
- Quarry: expanded dressed-stone cutting yard, two compact timber lifting arms, improved hand winch, roofed tool station, organized block stacks and reinforced retaining edges; remain an open quarry, not a mine.
- Iron mine: reinforced stone-and-dark-timber portal, roofed rope hoist, longer mine rails, ore sorting bin and one additional empty cart; preserve black-gray iron-streaked rock.
- Copper mine: stronger stone-and-lighter-timber portal, larger bucket hoist, compact roofed sorting bench, organized ore crates and readable warm copper plus oxidized teal mineral accents; remain distinct from the iron mine.
- Terraced farm: broader three-level cultivated terraces, improved timber irrigation channels and small header tank, covered seed/tool shed, more organized grain, fruit and vegetable plots; no farmhouse.
- Smelter: enlarged stone furnace house with two enclosed furnace mouths, taller soot-dark chimney, roofed ore and charcoal bins, reinforced working floor and compact lifting beam.
- Forge: expanded two-bay blacksmith workshop with stronger stone base, larger chimney, enclosed bellows assembly, covered anvil bay, quench tank and organized iron tool racks; visibly different from the smelter.
- Mill: reinforced stone lower floor, larger readable wooden waterwheel, covered grain elevator and hopper, second storage bay and orderly sacks; no windmill blades.
- Bakery: expanded stone-and-timber bakehouse with two enclosed ovens, larger chimney, covered cooling counter, storage loft, flour bins and restrained warm windows; no written sign.
- Distillery: expanded pirate rum works with two copper still vessels, larger coiled condenser, reinforced stone firebox, roofed barrel aging rack and pipework fully contained inside the cell.
Style/medium: premium painterly high-detail 2.5D isometric strategy-game sprites; stylized realism; aged maritime hardwood, dark slate, rugged masonry, blackened iron, brass and oxidized copper; physically plausible Age-of-Sail construction.
Composition/framing: preserve the exact 1536x1024 canvas and exact 3-by-3 grid; one isolated upgraded building centered inside each source cell; preserve each source silhouette and viewing direction while making the upgrade visibly denser and more capable; generous internal padding; every roof, chimney, crane, wheel, tool, pipe and platform fully contained; no overlap or cropping.
Scene/backdrop: replace every empty pixel with one perfectly flat uniform solid #ff00ff chroma-key background for local removal. No floor plane, terrain, cast shadow, contact shadow, gradient, texture, reflection, vignette or lighting variation in the background. Do not use magenta or pink inside any building.
Lighting/mood: restrained warm upper-left maritime daylight with cool lower-right ambient occlusion; enclosed furnace, oven and window glow only; consistent across all cells.
Constraints: change only the nine buildings into tier-2 upgrades; preserve all identities, order, camera, scale and cell positions; exactly nine buildings; no people, creatures, ships, vehicles beyond empty mine carts, scenery, readable labels, letters, numbers, icons, UI, logos, watermark, extra cells, grid lines or structures crossing cell boundaries.
Avoid: redesigning a building into a different category, tier-3 fortress scale, modern machinery, fantasy magic, photorealism, bright mobile-game colors, top-down or front elevation, black background, transparent checkerboard, malformed equipment, floating parts, magenta fringe, tiny unreadable clutter.
~~~

### 최종 셀 점유율 보정 프롬프트

~~~text
Use case: precise-object-edit
Asset type: production framing correction for a tier-2 isometric industry-building sprite atlas
Input images: Image 1 is the edit target containing the approved tier-2 designs. Image 2 is a scale, centering, camera and per-cell footprint reference only; do not revert to its tier-1 architecture.
Primary request: keep every tier-2 building design from Image 1 exactly, but resize and center each complete structure inside its own cell so its visible pixel footprint closely matches the corresponding tier-1 structure's cell occupancy in Image 2. The tier-2 structures must look at least as substantial as Image 2, never tiny, while remaining cleanly isolated.
Grid invariants: exact 1536x1024 canvas; exact 3 columns by 3 rows; cell boundaries x=0/512/1024/1536 and y=0/341/683/1024; exact order quarry, iron mine, copper mine / terraced farm, smelter, forge / mill, bakery, distillery.
Scale target: each tier-2 structure should occupy roughly 78–88 percent of its cell width or 72–88 percent of its cell height, comparable to Image 2. Preserve at least 5 clear pixels of flat magenta padding at every shared cell boundary and at least 12 pixels at the outer canvas edges. No physical pixel may cross into a neighboring cell. Do not shrink structures to small icon scale.
Preserve from Image 1: every upgraded tier-2 architecture, added crane, portal, terrace, furnace, workshop bay, waterwheel, oven, copper still, equipment, materials, colors, lighting, fixed orthographic isometric direction, detail and relative proportions. Change only uniform per-cell scale and position.
Scene/backdrop: perfectly flat uniform solid #ff00ff across every empty pixel; no terrain, floor, cast shadow, contact shadow, gradient, texture, reflection, vignette, border or grid line. Do not use magenta inside structures.
Constraints: exactly nine buildings; one complete building per cell; no people, creatures, text, labels, icons, UI, logos, watermark, extra objects, overlap or cropping.
Avoid: reverting to Image 2's simpler tier-1 architecture, redesigning, cell swapping, tiny buildings, boundary contact, blur, loss of detail, altered perspective, black background or transparent checkerboard.
~~~

## 산업 건물 3단계 전용 본체 아틀라스

- 프로젝트 자산: static/art/settlement/industry-buildings-tier3-atlas.png
- 프레임 정의: static/art/settlement/industry-buildings-atlas.json 공유
- 최종 생성 원본: /Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-32554968-e040-4fd3-bffd-0bb5a5b4c639.png
- 생성 방식: 내장 이미지 생성 도구 precise-object-edit
- 편집 대상: 위 2단계 최종 프레이밍 원본
- 폴백 생성기: 사용하지 않음
- 후처리: 단색 배경을 로컬 크로마키 제거 도구의 border auto-key·soft matte·despill로 RGBA 알파 변환
- 출력 검수: 1536×1024 RGBA, 3×3 고정 프레임, 네 모서리 완전 투명, 2단계보다 석조 기반·다중 설비·전문화 저장 및 하역 공간이 명확히 강화됨

### 최종 생성 프롬프트

~~~text
Use case: precise-object-edit
Asset type: production tier-3 isometric industry-building sprite atlas for the browser game "검은물결: 해적 군주"
Input image: Image 1 is the approved tier-2 edit target and authoritative layout, camera, scale, cell occupancy, building-identity, palette, material and style reference.
Primary request: transform all nine tier-2 structures into visibly mature tier-3 industrial facilities while preserving the exact 3-column by 3-row atlas, exact cell order, cell boundaries, fixed orthographic isometric camera, footprint family and Dark Pirate Maritime Command art direction.
Cell order, left to right:
row 1: quarry, iron mine, copper mine.
row 2: terraced farm, smelter, forge.
row 3: waterwheel mill, bakery, rum distillery.
Tier-3 changes:
- Quarry: master stoneworks with deep organized cutting terraces, three compact lifting arms linked by heavy winches, roofed dressing shed, reinforced stone retaining walls, rail-guided block cart and precise block stacks; remain an open quarry.
- Iron mine: fortified deep-mine stone portal with heavy dark timber, twin roofed hoists, two parallel rail lines, protected ore sorting floor, reinforced trestles, larger empty carts and black-gray iron-streaked rock.
- Copper mine: fortified copper works with dressed-stone portal, twin bucket-and-capstan hoists, roofed ore grading shed, protected loading bay, organized copper crates and strong warm copper plus oxidized teal mineral identity; remain distinct from iron.
- Terraced farm: prosperous high-yield four-level terraces with stone-and-timber retaining walls, elevated irrigation tank, sluice network, covered seed and tool pavilion, compact greenhouse frames without glass glare, diverse organized grain, fruit and vegetable beds; no large farmhouse.
- Smelter: major stone metallurgical works with three enclosed furnace mouths, tall reinforced soot-dark chimney, covered ore and charcoal bunkers, overhead manual lifting rail, slag-safe paved floor and compact assay room.
- Forge: master naval forge with fortified stone base, three covered work bays, large chimney, enclosed double bellows, heavy anchor anvil, manual tilt-hammer mechanism, quench cistern and organized cannon/tool blanks; visibly different from smelter.
- Mill: master grain works with strong two-level stone lower structure, one monumental wooden waterwheel, covered grain elevator, dual hoppers, flour storage loft, loading porch and orderly sacks; no windmill blades.
- Bakery: prosperous guild bakehouse with stone lower walls, timber upper storage loft, three enclosed brick ovens, tall chimney, broad covered cooling counter, flour bins, delivery porch and restrained warm windows; no signs.
- Distillery: master pirate rum complex with three distinct copper still vessels, tall condenser column, multiple contained coils, reinforced masonry fireboxes, roofed barrel-aging warehouse, elevated pipe rack and loading platform; all equipment fully contained.
Style/medium: premium painterly high-detail 2.5D isometric strategy-game sprites; stylized realism; aged hardwood, dark slate, rugged stone, blackened iron, brass and oxidized copper; physically plausible mature Age-of-Sail industry.
Composition/framing: preserve exact 1536x1024 canvas and exact 3-by-3 grid; one complete upgraded structure centered inside each original cell; retain approximately the same per-cell occupancy as Image 1; keep at least 5 clear pixels of flat magenta from shared cell boundaries and 12 pixels from outer canvas edges; every chimney, crane, rail, wheel, awning, pipe, barrel and foundation fully contained; no overlap or cropping.
Scene/backdrop: every empty pixel must be one perfectly flat uniform solid #ff00ff chroma-key background for local removal. No terrain, floor plane, cast shadow, contact shadow, gradient, texture, reflection, vignette or lighting variation in the background. Do not use magenta or pink inside any building.
Lighting/mood: restrained warm upper-left maritime daylight, cool lower-right ambient occlusion and controlled enclosed furnace/window glow; consistent across cells.
Constraints: change only the nine tier-2 structures into tier-3 upgrades; preserve all identities, order, direction, camera, scale family and positions; exactly nine buildings; no people, creatures, ships, modern vehicles, scenery, readable labels, letters, numbers, icons, UI, logos, watermark, extra cells, borders or grid lines.
Avoid: changing categories, arbitrary fantasy ornament, modern industrial machinery, tier-2 simplicity, photorealism, bright mobile-game colors, top-down or front elevation, black background, transparent checkerboard, malformed equipment, floating parts, boundary contact, magenta fringe or unreadable clutter.
~~~

## 8종 주민 역할 전면 3프레임 보행 아틀라스

- 프로젝트 자산: static/art/settlement/resident-walk-front-atlas.png
- 공유 프레임 정의: static/art/settlement/resident-walk-atlas.json
- 최종 생성 원본: /Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-0721aeb7-e9fc-4257-b457-542f467b1d11.png
- 생성 방식: 내장 이미지 생성 도구 stylized-concept
- 참조 이미지: static/art/settlement/resident-roles-atlas.png — 역할·복식·체형·소지품·전면 사선 시점·화풍 참조 전용
- 폴백 생성기: 사용하지 않음
- 후처리: 단색 배경을 로컬 크로마키 제거 도구의 border auto-key·soft matte·despill로 RGBA 알파 변환
- 출력 검수: 1536×1024 RGBA, 8×3 고정 프레임, 24개 프레임 키, 네 모서리 완전 투명, 역할별 얼굴·복식·장비와 접지 A/통과/접지 B 순서 유지

### 최종 생성 프롬프트

~~~text
Use case: stylized-concept
Asset type: production front-direction three-frame walking sprite atlas for the browser game "검은물결: 해적 군주"
Input image: Image 1 is the authoritative character-identity, outfit, equipment, scale, front three-quarter camera, palette and rendering reference. Generate new walking poses; do not edit Image 1.
Primary request: create exactly 24 isolated full-body pirate-settlement residents in a precise 8-column by 3-row sprite sheet. Every column is one persistent role identity and every row is one coherent walk-cycle frame.
Column order, left to right in every row:
1. LABORER — rugged bearded laborer, worn cream shirt, patched brown trousers, pickaxe over shoulder, rope coil.
2. HAULER — strong dark-skinned carrier, tan head wrap, rolled sleeves, closed wooden crate held securely.
3. BUILDER — red-bandanna carpenter, hammer, rolled plans, tool belt.
4. LOGGER — black-headscarf logger, leather apron, axe held low.
5. FISHER — older gray-bearded fisher, dark brimmed hat, ochre oilskin coat, bundled net.
6. SHIPWRIGHT — skilled dock worker, cream shirt, dark vest, blue headscarf, mallet and rope.
7. GUARD — professional pirate guard, red bandanna, dark vest, sheathed or low-held cutlass.
8. OFFICER — senior officer, long dark navy coat with gold trim, tricorn, rolled chart.
Walk-cycle rows:
Row 1: contact pose A, character's left leg clearly forward and right leg back, opposite arm swing; carried tools and cargo remain safely controlled.
Row 2: passing pose, feet close beneath the body, torso at the highest point, natural neutral arm transition.
Row 3: contact pose B, character's right leg clearly forward and left leg back, opposite arm swing; exact continuation of row 1.
Direction and identity: all 24 sprites use the same front three-quarter isometric direction as Image 1, looking toward the viewer along the same diagonal. Within each column preserve the exact same face, skin tone, hair, beard, body proportions, clothing colors, tool, cargo and socioeconomic rank across all three frames. Frame differences must be limited to a natural walking gait, slight coat/rope follow-through and balanced weight shift.
Style/medium: premium hand-painted 2.5D strategy-game character sprites, stylized realism, original Dark Pirate Maritime Command art direction, matching Image 1.
Composition/framing: exact 1536x1024 canvas; exactly 8 equal columns and 3 equal rows; one centered full-body character per cell; consistent scale, feet baseline and camera; all hats, tools, weapons, crates, nets, hands and boots fully contained; generous padding; no overlap, cropping, borders or grid lines. Silhouettes must remain readable at 34x46 game pixels.
Scene/backdrop: perfectly flat uniform solid #ff00ff chroma-key background across every empty pixel. No floor, cast shadow, contact shadow, gradient, texture, reflection, lighting variation or vignette. Do not use magenta or pink inside any person or equipment.
Lighting/mood: restrained warm upper-left daylight with cool lower-right ambient shading contained inside each sprite.
Constraints: exactly 24 sprites; exactly eight stable identities repeated across three frames; no extra people, swapped roles, missing tools, changing faces, changing outfits, duplicated walk poses, scenery, buildings, terrain, labels, letters, numbers, icons, logos or watermark.
Avoid: running, jumping, dramatic combat, front-facing orthographic mugshot, side-only profile, rear view, malformed limbs or hands, floating equipment, inconsistent body scale, modern clothing, fantasy armor, bright cartoon colors, photorealism, black background, transparent checkerboard, cell overlap, magenta fringe.
~~~

## 8종 주민 역할 후면 3프레임 보행 아틀라스

- 프로젝트 자산: static/art/settlement/resident-walk-rear-atlas.png
- 공유 프레임 정의: static/art/settlement/resident-walk-atlas.json
- 최종 생성 원본: /Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-065d0f74-3fbe-4cc2-b84b-5f6767372f4a.png
- 생성 방식: 내장 이미지 생성 도구 stylized-concept
- 참조 이미지: static/art/settlement/resident-roles-rear-atlas.png — 역할·복식·체형·소지품·후면 사선 시점·화풍 참조 전용
- 폴백 생성기: 사용하지 않음
- 후처리: 단색 배경을 로컬 크로마키 제거 도구의 border auto-key·soft matte·despill로 RGBA 알파 변환
- 출력 검수: 1536×1024 RGBA, 8×3 고정 프레임, 24개 프레임 키, 네 모서리 완전 투명, 전면 노출 없이 역할별 후면 정체성과 접지 A/통과/접지 B 순서 유지

### 최종 생성 프롬프트

~~~text
Use case: stylized-concept
Asset type: production rear-direction three-frame walking sprite atlas for the browser game "검은물결: 해적 군주"
Input image: Image 1 is the authoritative character-identity, outfit, equipment, scale, rear three-quarter camera, palette and rendering reference. Generate new walking poses; do not edit Image 1.
Primary request: create exactly 24 isolated full-body pirate-settlement residents in a precise 8-column by 3-row sprite sheet. Every column is one persistent role identity and every row is one coherent walk-cycle frame.
Column order, left to right in every row:
1. LABORER — rugged bearded laborer seen from behind, worn cream shirt, patched brown trousers, pickaxe over shoulder, rope coil.
2. HAULER — strong dark-skinned carrier seen from behind, tan head wrap, rolled sleeves, closed wooden crate held securely.
3. BUILDER — red-bandanna carpenter seen from behind, hammer, rolled plans, tool belt.
4. LOGGER — black-headscarf logger seen from behind, leather apron, axe held low.
5. FISHER — older gray-bearded fisher seen from behind, dark brimmed hat, ochre oilskin coat, bundled net.
6. SHIPWRIGHT — skilled dock worker seen from behind, cream shirt, dark vest, blue headscarf, mallet and rope.
7. GUARD — professional pirate guard seen from behind, red bandanna, dark vest, sheathed or low-held cutlass.
8. OFFICER — senior officer seen from behind, long dark navy coat with gold trim, tricorn, rolled chart.
Walk-cycle rows:
Row 1: contact pose A, character's left leg clearly forward and right leg back, opposite arm swing; carried tools and cargo remain safely controlled.
Row 2: passing pose, feet close beneath the body, torso at the highest point, natural neutral arm transition.
Row 3: contact pose B, character's right leg clearly forward and left leg back, opposite arm swing; exact continuation of row 1.
Direction and identity: all 24 sprites use the same rear three-quarter isometric direction as Image 1, facing away along the same diagonal. No face should turn toward the viewer. Within each column preserve the exact same skin tone, hair, hat, body proportions, clothing colors, back straps, tool, cargo and socioeconomic rank across all three frames. Frame differences must be limited to a natural walking gait, slight coat/rope follow-through and balanced weight shift.
Style/medium: premium hand-painted 2.5D strategy-game character sprites, stylized realism, original Dark Pirate Maritime Command art direction, matching Image 1.
Composition/framing: exact 1536x1024 canvas; exactly 8 equal columns and 3 equal rows; one centered full-body character per cell; consistent scale, feet baseline and camera; all hats, tools, weapons, crates, nets, hands and boots fully contained; generous padding; no overlap, cropping, borders or grid lines. Silhouettes must remain readable at 34x46 game pixels.
Scene/backdrop: perfectly flat uniform solid #ff00ff chroma-key background across every empty pixel. No floor, cast shadow, contact shadow, gradient, texture, reflection, lighting variation or vignette. Do not use magenta or pink inside any person or equipment.
Lighting/mood: restrained warm upper-left daylight with cool lower-right ambient shading contained inside each sprite.
Constraints: exactly 24 rear-facing sprites; exactly eight stable identities repeated across three frames; no front-facing faces, looking over shoulders, extra people, swapped roles, missing tools, changing outfits, duplicated walk poses, scenery, buildings, terrain, labels, letters, numbers, icons, logos or watermark.
Avoid: running, jumping, dramatic combat, front or side-only views, malformed limbs or hands, floating equipment, inconsistent body scale, modern clothing, fantasy armor, bright cartoon colors, photorealism, black background, transparent checkerboard, cell overlap, magenta fringe.
~~~

## 핵심 건물 2단계 전용 본체 아틀라스

- 프로젝트 자산: `static/art/settlement/core-buildings-tier2-atlas.png`
- 프레임 정의: `static/art/settlement/core-buildings-atlas.json` 공유
- 최종 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-a6d28531-01ac-4f2e-aaf4-72f406c7f295.png`
- 생성 방식: 내장 이미지 생성 도구 `precise-object-edit`
- 편집 대상: `static/art/settlement/core-buildings-atlas.png`
- 폴백 생성기: 사용하지 않음
- 후처리: 단색 배경을 로컬 크로마키 제거 도구의 border auto-key·soft matte·despill로 RGBA 알파 변환
- 출력 검수: 1536×1024 RGBA, 4×3 고정 프레임, 네 모서리 완전 투명, 셀 순서·시점·건물 정체성 유지

### 최종 생성 프롬프트

```text
Use case: precise-object-edit
Asset type: production tier-2 isometric building sprite atlas for the browser game "검은물결: 해적 군주"
Input image: Image 1 is the edit target and authoritative layout/style reference.
Primary request: transform the existing 4-column by 3-row atlas into clearly upgraded tier-2 versions while preserving the exact 12-cell order, camera, scale, cell boundaries, and Dark Pirate Maritime Command art direction.
Cell order, left to right:
row 1: wreckage, communal campfire, canvas tent, rainwater collector.
row 2: fisher hut, lumber camp, warehouse, sawmill.
row 3: small dock, shipyard, watchtower, coastal battery.
Tier-2 changes:
- Keep wreckage materially unchanged as the visual baseline.
- Campfire: permanent stone cook hearth, iron cauldron, sturdy benches, small tool rack.
- Tent: reinforced timber-frame shelter, patched canvas roof, plank porch, storage chest.
- Water collector: two linked timber cisterns, expanded gutters, filtration barrels.
- Fisher hut: expanded stilt lodge, repaired roof, larger net rack, fish crates.
- Lumber camp: roofed cutting bay, organized log stacks, sturdier workbench.
- Warehouse: reinforced two-level storehouse, braced timber, secure doors, additional loading platform.
- Sawmill: larger wheel and saw assembly, covered processing bay, organized lumber racks.
- Small dock: wider and longer pier, compact cargo crane, bollards and lanterns.
- Shipyard: reinforced slipway, taller scaffold, winch, more complete ship hull.
- Watchtower: taller stone-and-timber tower, enclosed lookout, signal brazier, pirate pennants.
- Coastal battery: reinforced stone bastion, three operational cannons, protected powder recess.
Style/medium: painterly high-detail isometric game sprites, aged timber, dark slate, rough stone, brass, muted crimson cloth, physically plausible construction.
Composition/framing: preserve the exact 1536x1024 4-by-3 grid, one isolated structure centered inside each cell, same 3/4 isometric view and footprint as its source cell, generous internal padding, no overlap or cropping.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background across every empty pixel for later removal. No gradient, texture, lighting variation, floor plane, cast shadow, or reflection in the background. Do not use #ff00ff anywhere in the structures.
Lighting/mood: warm lantern and forge accents against restrained cool maritime fill; consistent across all cells.
Constraints: edit only the buildings into tier-2 upgrades; preserve all 12 identities and cell positions; no humans, no creatures, no labels, no text, no icons, no UI, no watermark, no logos, no extra cells, no structures crossing cell boundaries.
```

## 핵심 건물 3단계 전용 본체 아틀라스

- 프로젝트 자산: `static/art/settlement/core-buildings-tier3-atlas.png`
- 프레임 정의: `static/art/settlement/core-buildings-atlas.json` 공유
- 최종 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-42b36880-7888-47ca-beb5-f7a74334412f.png`
- 생성 방식: 내장 이미지 생성 도구 `precise-object-edit`
- 편집 대상: 위 2단계 생성 원본
- 폴백 생성기: 사용하지 않음
- 후처리: 단색 배경을 로컬 크로마키 제거 도구의 border auto-key·soft matte·despill로 RGBA 알파 변환
- 출력 검수: 1536×1024 RGBA, 4×3 고정 프레임, 네 모서리 완전 투명, 2단계보다 석조 기반·설비·방어 실루엣이 명확히 강화됨

### 최종 생성 프롬프트

```text
Use case: precise-object-edit
Asset type: production tier-3 isometric building sprite atlas for the browser game "검은물결: 해적 군주"
Input image: Image 1 is the tier-2 edit target and authoritative layout/style reference.
Primary request: transform each upgradeable structure into a visibly mature tier-3 version while preserving the exact 4-column by 3-row grid, camera, scale, cell boundaries, building identity, and Dark Pirate Maritime Command art direction.
Cell order, left to right:
row 1: wreckage, communal campfire, canvas shelter, rainwater collector.
row 2: fisher lodge, lumber camp, warehouse, sawmill.
row 3: dock, shipyard, watchtower, coastal battery.
Tier-3 changes:
- Keep wreckage materially unchanged as the visual baseline.
- Campfire: substantial masonry communal galley with sheltered hearth, large iron cauldron, chimney hood, fixed tables, lanterns.
- Shelter: permanent timber-and-canvas longhouse with shingled lower roof, reinforced porch, more storage, still recognizable from tier 2.
- Water collector: elevated triple-cistern waterworks with copper gutters, covered filter beds, reinforced frame.
- Fisher lodge: prosperous two-level stilt fishery, smokehouse vent, broad net-drying rack, hoist and stacked catch crates.
- Lumber camp: mature lumberworks with roofed cutting floor, log gantry, heavy tool bench and organized timber stacks.
- Warehouse: three-level stone-footed fortified storehouse with heavy bracing, secure loading doors, hoist and larger platform.
- Sawmill: master saw works with twin cutting mechanism, larger drive wheel, stone foundation, expanded covered lumber staging.
- Dock: fortified broad quay with large cargo crane, warehouse shed, capstan, lantern posts and protected moorings.
- Shipyard: master naval yard with deep reinforced slipway, multiple winches and cranes, extensive scaffold, nearly completed brig hull.
- Watchtower: tall fortified stone signal tower with enclosed timber command deck, beacon brazier, bells and restrained pirate pennants.
- Coastal battery: formidable semicircular stone sea fort with four heavy naval cannons, merlons, protected powder doors and command platform.
Style/medium: painterly high-detail isometric game sprites, aged hardwood, dark slate, rugged stone, blackened iron, brass, muted crimson and charcoal cloth, physically plausible Age-of-Sail construction.
Composition/framing: preserve the exact 1536x1024 4-by-3 grid, one isolated structure centered inside each original cell, same 3/4 isometric view and footprint family, generous internal padding, no overlap or cropping.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background across every empty pixel for later removal. No gradient, texture, lighting variation, floor plane, cast shadow, or reflection in the background. Do not use #ff00ff anywhere in the structures.
Lighting/mood: warm lantern, hearth and forge accents against restrained cool maritime fill; consistent across all cells.
Constraints: edit only the buildings into tier-3 upgrades; preserve all 12 identities and cell positions; no humans, no creatures, no labels, no text, no icons, no UI, no watermark, no logos, no extra cells, no structures crossing cell boundaries.
```

## 8종 생산·생활 시설 본체 아틀라스

- 프로젝트 자산: `static/art/settlement/livelihood-service-buildings-atlas.png`
- 프레임 정의: `static/art/settlement/livelihood-service-buildings-atlas.json`
- 최종 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-1f8de8a6-d866-4b43-9c47-1784d447b231.png`
- 생성 방식: 내장 이미지 생성 도구 `stylized-concept`
- 참조 이미지: `static/art/settlement/core-buildings-atlas.png` — 스타일·시점·재질 참조 전용
- 폴백 생성기: 사용하지 않음
- 후처리: 단색 배경을 로컬 크로마키 제거 도구의 border auto-key·soft matte·despill로 RGBA 알파 변환
- 출력 검수: 1536×1024 RGBA, 4×2 고정 프레임, 지정 순서 8종, 크롭·셀 중첩·인물·선박·마젠타 잔여 없음

### 최종 생성 프롬프트

```text
Use case: stylized-concept
Asset type: production isometric industry, livelihood and service-building sprite atlas for a browser-based 2.5D pirate settlement management game
Input images: Image 1 is a style reference only. Match its premium hand-painted stylized realism, fixed orthographic isometric camera, salt-worn timber, dark stone, slate-blue roofs, aged brass, compact readable silhouettes and upper-left warm daylight. Do not edit, trace or reproduce any complete building from Image 1.
Primary request: create exactly eight complete isolated pirate-settlement structures arranged in a precise 4-column by 2-row contact sheet.

Required order:
Row 1, left to right:
1. HUNTER HUT — compact highland timber hunting cabin with a slate lean-to roof, covered skinning rack holding only bundled hides, antler-shaped timber pegs, closed meat-smoking box, rope snares and stacked firewood; no animal bodies.
2. COMMUNAL COOKHOUSE — broad open-sided pirate kitchen with stone hearths, enclosed copper cooking pots, smoke hood, long preparation tables, stacked bowls, sealed food barrels and a serving counter; no food piles or people.
3. WEAVER WORKSHOP — two-story timber textile workshop with large covered hand loom visible through an open work bay, spinning wheels, rope-twisting frame, folded neutral cloth bolts and drying lines contained under the roof; no loose fabric outside the cell.
4. POWDER WORKSHOP — isolated reinforced stone-and-timber black-powder workshop with lightning rods, sand buckets, heavy blast shutters, enclosed mixing drums, a separated roofed charcoal shed and restrained hazard-red painted trim without symbols; no exposed powder or fire.
Row 2, left to right:
5. AMMUNITION WORKSHOP — low fortified shot-casting shop with stone casting floor, roofed smelting nook, iron molds, cooling racks filled with neat dark cannonballs, reinforced doors and a small covered loading platform; no flame or smoke outside the structure.
6. GAMBLING DEN — crooked but elegant timber gaming house with a deep covered porch, shuttered amber windows, aged brass lanterns, restrained black-crimson fabric bunting, dice-cup and card-table silhouettes visible only inside; no written signs or people.
7. BATHHOUSE — clean stone-and-timber communal bathhouse with copper water tank, enclosed boiler chimney, tiled roof vents, covered washing veranda, drainage channels contained in the foundation and folded towels under the roof; no water pool outside and no people.
8. BOUNTY BOARD — compact roofed civic notice pavilion with a large layered blank parchment board, wax-seal shapes without text, two locked document chests, lanterns, hitching rail and a small raised timber platform; no readable writing, portraits or human figures.

Scene/backdrop: every cell must use one perfectly flat uniform solid #ff00ff chroma-key background for local background removal. No ground plane, cast shadow, contact shadow, gradient, vignette, texture, reflection or lighting variation in the background.
Style/medium: premium hand-painted 2.5D strategy-game structure sprites, original Dark Pirate Maritime Command art direction, production-ready rather than concept sketches.
Composition/framing: exact fixed orthographic isometric camera matching Image 1; exactly 4 equal columns and 2 equal rows; one structure centered in each cell; identical orientation and consistent game scale; every object fully contained with generous magenta padding; lowest point of every bottom-row object at least 22 pixels above the canvas edge; silhouettes readable when downscaled to about 150 pixels wide.
Lighting/mood: restrained warm upper-left daylight and cool lower-right ambient occlusion contained within physical objects; high material readability.
Color palette: weathered umber timber, charcoal and gray stone, slate-blue shingles, beige canvas, aged iron, oxidized copper and brass, restrained black-crimson fabric and tiny warm amber enclosed-window accents. Do not use magenta or pink inside any structure.
Materials/textures: readable wood grain, chipped masonry, worn shingles, rope fiber, iron straps, copper patina, canvas wear and practical pirate-made repairs.
Constraints: exactly eight structures in the specified order; one complete self-contained structure per cell; no people, animals, ships, terrain tiles, water, roads, scenery, readable labels, icons, letters, numbers, logos or watermark; no smoke, flame, glow, rope, fabric or effect beyond the physical sprite boundary; no overlap between cells; no cropping.
Avoid: duplicated silhouettes, modern machinery, fantasy magic, bright mobile-game cartoon colors, photorealism, top-down camera, front-facing elevation, mismatched perspectives, floating parts, black background, transparent checkerboard, borders, dividers, grid lines, magenta fringe, tiny unreadable clutter.
```

## 8종 공공·훈련·방어 시설 본체 아틀라스

- 프로젝트 자산: `static/art/settlement/civic-defense-buildings-atlas.png`
- 프레임 정의: `static/art/settlement/civic-defense-buildings-atlas.json`
- 최초 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-b749680b-0365-4239-8315-b859409a3940.png`
- 최종 편집 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-f750d98a-bba7-40b6-9a1d-0410f7a955d4.png`
- 생성 방식: 내장 이미지 생성 도구 `stylized-concept` 후 `precise-object-edit`
- 참조 이미지: `static/art/settlement/core-buildings-atlas.png` — 스타일·시점·재질 참조 전용
- 폴백 생성기: 사용하지 않음
- 편집 근거: 최초 결과의 하단 두 번째 신호탑 깃대가 행 경계를 침범해 신호탑 전체를 아래로 이동하고 비운 영역만 동일 크로마 배경으로 복원
- 후처리: 단색 배경을 로컬 크로마키 제거 도구의 border auto-key·soft matte·despill로 RGBA 알파 변환
- 출력 검수: 1536×1024 RGBA, 4×2 고정 프레임, 지정 순서 8종, 크롭·셀 중첩·인물·선박·마젠타 잔여 없음

### 최초 생성 프롬프트

```text
Use case: stylized-concept
Asset type: production isometric civic, training and defense-building sprite atlas for a browser-based 2.5D pirate settlement management game
Input images: Image 1 is a style reference only. Match its premium hand-painted stylized realism, fixed orthographic isometric camera, salt-worn timber, dark stone, slate-blue roofs, aged brass, compact readable silhouettes and upper-left warm daylight. Do not edit, trace or reproduce any complete building from Image 1.
Primary request: create exactly eight complete isolated pirate-settlement structures arranged in a precise 4-column by 2-row contact sheet.

Required order:
Row 1, left to right:
1. PIRATE ARENA — compact octagonal timber-and-stone fighting arena with a clear empty sand floor, low ring fence, tiered spectator benches, four black-crimson banner poles, weapon racks and one covered entry gate; no people, bodies, blood or active combat.
2. FESTIVAL SQUARE — raised civic celebration plaza with a broad timber dance platform, central unlit brazier, covered musicians' dais with no musicians, garland poles, barrel tables and restrained black-crimson bunting; no people, food, text or loose effects.
3. CREW TRAINING YARD — fortified open training compound with empty sparring ring, climbing rig, target dummies, cutlass racks, cannon-drill carriage without a cannon blast, covered instructor platform and perimeter palisade; no people.
4. FORT WALL — long heavy defensive wall segment built from dark stone and salt-worn timber, crenellated parapet, timber fighting platform, one reinforced closed gate, iron braces and two complete end towers; isolated segment with no terrain and no attackers.
Row 2, left to right:
5. GUARD POST — compact fortified watch kiosk on a raised timber platform with narrow slate roof, small covered gate, bell, weapon rack, lantern and waist-high palisade; no guard.
6. SIGNAL TOWER — tall highland timber-and-stone signal tower with broad braced base, enclosed stair tower, upper observation deck, large unlit iron signal basket, folded signal flags secured to the mast and lightning rod; no smoke, flame or people.
7. PIRATE COUNCIL — grand three-wing timber-and-stone council hall around a small open central deck, large slate roofs, round assembly chamber, restrained black-crimson banners without symbols, brass bell and broad steps; no throne, text or people.
8. INTELLIGENCE NETWORK — discreet two-story chart-and-cipher house with shuttered windows, roof lookout cupola, covered side entrance, locked map chests, pigeon loft with no birds, antenna-like flag mast and blank route-board slats; no readable maps, symbols or people.

Scene/backdrop: every cell must use one perfectly flat uniform solid #ff00ff chroma-key background for local background removal. No ground plane, cast shadow, contact shadow, gradient, vignette, texture, reflection or lighting variation in the background.
Style/medium: premium hand-painted 2.5D strategy-game structure sprites, original Dark Pirate Maritime Command art direction, production-ready rather than concept sketches.
Composition/framing: exact fixed orthographic isometric camera matching Image 1; exactly 4 equal columns and 2 equal rows; one structure centered in each cell; identical orientation and consistent game scale; every object fully contained with generous magenta padding; lowest point of every bottom-row object at least 22 pixels above the canvas edge; the arena, festival square, training yard and fort wall must remain completely within their cells; the signal tower must have ample clearance above its mast; silhouettes readable when downscaled to about 150 pixels wide.
Lighting/mood: restrained warm upper-left daylight and cool lower-right ambient occlusion contained within physical objects; high material readability.
Color palette: weathered umber timber, charcoal and gray stone, slate-blue shingles, aged iron, oxidized brass, beige canvas, restrained black-crimson fabric and tiny warm amber enclosed-window accents. Do not use magenta or pink inside any structure.
Materials/textures: readable wood grain, chipped masonry, worn shingles, rope fiber, iron straps, canvas wear and practical pirate-made repairs.
Constraints: exactly eight structures in the specified order; one complete self-contained structure per cell; no people, animals, ships, terrain tiles, water, roads, scenery, readable labels, icons, letters, numbers, logos or watermark; no smoke, flame, glow, flag, cable or effect beyond the physical sprite boundary; no overlap between cells; no cropping.
Avoid: duplicated silhouettes, modern machinery, fantasy castles or magic, bright mobile-game cartoon colors, photorealism, top-down camera, front-facing elevation, mismatched perspectives, floating parts, black background, transparent checkerboard, borders, dividers, grid lines, magenta fringe, tiny unreadable clutter.
```

### 신호탑 위치 정밀 편집 프롬프트

```text
Use case: precise-object-edit
Input image: edit the provided 4-column by 2-row civic and defense building atlas.
Primary request: modify only the SIGNAL TOWER in row 2 column 2. Move the entire signal-tower sprite, including its basket, mast, folded flags, roof, base and every connected pixel, exactly 52 pixels downward so its highest physical point sits safely below the horizontal row boundary at y=512. Keep its scale, design, perspective, materials, colors, lighting and proportions unchanged.
Reconstruct the vacated area above it with the exact same perfectly flat uniform #ff00ff chroma background. Keep at least 22 pixels of flat magenta padding below its lowest point.
Preserve every other pixel and every other structure exactly as in the input image. Do not redraw, restyle, resize, crop, shift or alter row 1, row 2 columns 1, 3 or 4, or any other background area.
Constraints: output remains exactly 1536 by 1024 pixels; exact 4-by-2 arrangement; no borders or dividers; no new people, objects, shadows, text, logos or effects; no structure may cross a cell boundary.
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

## 12종 물류·수직 기반시설·함대 건물 본체 아틀라스

- 프로젝트 자산: `static/art/settlement/logistics-fleet-buildings-atlas.png`
- 프레임 정의: `static/art/settlement/logistics-fleet-buildings-atlas.json`
- 최종 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-52f771bf-71dc-49f2-b7c0-e1aaf602db5d.png`
- 생성 방식: 내장 이미지 생성 도구 `stylized-concept`
- 참조 이미지: `static/art/settlement/core-buildings-atlas.png` — 스타일·시점·재질 참조 전용
- 폴백 생성기: 사용하지 않음
- 후처리: 단색 배경을 로컬 크로마키 제거 도구의 border auto-key·soft matte·despill로 RGBA 알파 변환
- 출력 검수: 1536×1024 RGBA, 4×3 고정 프레임, 지정 순서 12종, 크롭·셀 중첩·인물·선박·마젠타 잔여 없음

### 최종 생성 프롬프트

```text
Use case: stylized-concept
Asset type: production isometric logistics, vertical-infrastructure and fleet-building sprite atlas for a browser-based 2.5D pirate settlement management game
Input images: Image 1 is a style reference only. Match its premium hand-painted stylized realism, fixed orthographic isometric camera, salt-worn timber, dark stone, slate-blue roofs, aged brass, compact readable silhouettes and upper-left warm daylight. Do not edit, trace or reproduce any complete building from Image 1.
Primary request: create exactly twelve complete isolated pirate-settlement structures arranged in a precise 4-column by 3-row contact sheet.

Required order:
Row 1, left to right:
1. LOCAL STORAGE — compact one-story timber cache with raised plank floor, salt-stained canvas awning, closed crates, tied sacks, two barrels and a small covered loading porch; modest neighborhood scale.
2. DISTRIBUTION DEPOT — broad logistics sorting hall with two loading bays, roofed central dispatch platform, handcarts, labeled-by-shape crate groups with no written text, rope hoist and route-board frame with blank wooden slats.
3. DOCK WAREHOUSE — large coastal warehouse on heavy timber pilings with stone footing, wide cargo doors, crane beam, stacked sealed crates and barrels, short loading jetty; no water or ship.
4. CARGO LIFT — tall cliff freight elevator mechanism with two self-contained timber platforms at visibly different heights, reinforced tower frame, large pulley wheels, thick rope, counterweight cage and loading deck; no cliff or terrain.
Row 2, left to right:
5. ZIPLINE POST — high timber cargo-zipline anchor tower with braced feet, pulley head, winding drum, hanging closed cargo basket and two short taut cable ends that stop inside the cell; single station only.
6. WOODEN BRIDGE — elongated reinforced timber bridge span with plank deck, rope handrails, four stone-and-timber end abutments and under-deck braces; isolated complete bridge with no river, ravine or terrain.
7. CLIFF STAIRS — compact switchback timber-and-stone stair structure with two landings, railings, support trestles and clear lower and upper entrances; freestanding vertical connector, no cliff.
8. CARGO RAMP — broad reinforced wooden handcart ramp with shallow incline, side rails, cross braces, wheel guides and small stone footings; visibly different from stairs and bridge, no cart.
Row 3, left to right:
9. CLIFF PLATFORM — wide elevated timber work platform on deep braced stilts with rope railings, anchor bolts, winch, stacked planks and one access ladder; no cliff face and no complete building.
10. DRY DOCK — large empty stone-and-timber ship repair basin with open slipway, side scaffolds, capstan, crane derrick and pump house; absolutely no ship, water or people.
11. FLEET SUPPLY DEPOT — fortified coastal provisioning hall with broad loading canopy, sealed hardtack crates, water casks, powder-safe lockers, rope coils and a short loading deck; no ship, no loose explosives.
12. CANNON FOUNDRY — heavy stone naval gun foundry with tall soot-dark chimney, enclosed furnace glow, overhead casting gantry, cannon-mold trench and two finished unmarked iron cannon barrels on timber stands; no smoke outside the sprite.

Scene/backdrop: every cell must use one perfectly flat uniform solid #ff00ff chroma-key background for local background removal. No ground plane, cast shadow, contact shadow, gradient, vignette, texture, reflection or lighting variation in the background.
Style/medium: premium hand-painted 2.5D strategy-game structure sprites, original Dark Pirate Maritime Command art direction, production-ready rather than concept sketches.
Composition/framing: exact fixed orthographic isometric camera matching Image 1; exactly 4 equal columns and 3 equal rows; one structure centered in each cell; identical orientation and consistent game scale; every object fully contained with generous magenta padding; lowest point of every bottom-row object at least 18 pixels above the canvas edge; long bridge, ramp and dry dock must remain inside their own cells; silhouettes readable when downscaled to about 150 pixels wide.
Lighting/mood: restrained warm upper-left daylight and cool lower-right ambient occlusion contained within physical objects; high material readability.
Color palette: weathered umber timber, charcoal and gray stone, slate-blue shingles, beige canvas, aged iron, oxidized brass, restrained black-crimson fabric and tiny warm amber window or enclosed furnace accents. Do not use magenta or pink inside any structure.
Materials/textures: readable wood grain, chipped masonry, worn shingles, rope fiber, iron straps, pulley wheels, canvas wear and practical pirate-made repairs.
Constraints: exactly twelve structures in the specified order; each cell contains one complete self-contained structure; no people, ships, animals, terrain tiles, water, roads, scenery, written labels, icons, letters, numbers, logos or watermark; no smoke, fire, glow, cable or effect beyond the physical sprite boundary; no overlap between cells; no cropping.
Avoid: duplicated silhouettes, modern machinery, fantasy magic, bright mobile-game cartoon colors, photorealism, top-down camera, front-facing elevation, mismatched perspectives, floating parts, black background, transparent checkerboard, borders, dividers, grid lines, magenta fringe, tiny unreadable clutter.
```

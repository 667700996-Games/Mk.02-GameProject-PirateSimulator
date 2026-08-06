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

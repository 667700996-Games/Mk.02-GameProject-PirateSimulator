# 주민 작업·전투 애니메이션 아트 생성 근거

## 공통 제작 규칙

- 제작일: 2026-08-07
- 생성 방식: 내장 이미지 생성 도구 `precise-object-edit`
- 폴백 생성기·CLI: 사용하지 않음
- 정체성 기준: `resident-walk-front-atlas.png`, `resident-walk-rear-atlas.png`
- 역할 순서: 노동자, 운반꾼, 건설자, 벌목꾼, 어부, 조선공, 경비, 장교
- 프레임 순서: 1행 준비·경계, 2행 접점·공격, 3행 회복
- 후처리: border auto-key·soft matte·despill 크로마키 제거로 RGBA 변환
- 프레임 정의: 이미지별 실제 알파 0 분리선을 사용하고 240×420 공통 가상 캔버스에 하단 정렬
- 검수: 네 PNG 모두 1536×1024 8-bit RGBA, 각 JSON 24프레임, 모든 행·열 사이에 완전 투명 분리선 존재

## 전면 작업 3프레임 아틀라스

- 프로젝트 자산: `static/art/settlement/resident-work-front-atlas.png`
- 프레임 정의: `static/art/settlement/resident-work-front-atlas.json`
- 최초 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-689c6f2d-2696-4a13-bb1a-d18e1135adbc.png`
- 어부 경계 보정 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-9c224ae4-6748-4a25-87be-ad818351af97.png`
- 전체 분리 보정 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-31cd3135-65e4-4fbe-890f-ec4ef6e4d6d0.png`
- 크기·기준선 보정 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-3398cbd2-ccb3-4c54-94c1-97960f49ab3e.png`
- 행 위치 보정 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-b9d1cfa4-d357-450a-981e-aa59f4ba1bf9.png`
- 최종 7·8열 분리 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-2a63dfcc-fd51-4939-8901-c7786037d423.png`

### 최초 생성 프롬프트

```text
Use case: precise-object-edit
Asset type: production front-facing 3-frame resident work-animation sprite atlas for the browser game "검은물결: 해적 군주"
Input image: Image 1 is the edit target and authoritative exact 1536x1024 layout, eight resident identities, clothing, facial identity, body proportions, painterly rendering, scale, fixed front-right isometric direction and Dark Pirate Maritime Command art direction.
Primary request: transform all twenty-four existing walking poses into a coherent role-specific WORK loop while preserving the exact 8-column by 3-row atlas and every character identity.
Exact column order in every row: laborer, hauler, builder, logger, fisher, shipwright, guard, officer.
Animation row order:
- Row 1 is anticipation/preparation: each resident shifts weight and raises or positions the correct work tool.
- Row 2 is the clear action/contact pose: strongest readable work silhouette.
- Row 3 is recovery/follow-through: weight settles and tool returns toward neutral, ready to loop back to row 1.
Role-specific actions:
- Laborer: controlled pickaxe or mattock swing.
- Hauler: lift and settle the same compact wooden cargo crate using both arms.
- Builder: measured mallet strike on a small carried or waist-height timber brace fully contained with the character.
- Logger: broad two-handed axe chopping motion.
- Fisher: pull and gather the same bundled fishing net and rope.
- Shipwright: forceful caulking-mallet or shipwright-hammer work on a short portable timber piece.
- Guard: inspect, ready and secure a period flintlock or ammunition tool as a disciplined maintenance drill; no firing.
- Officer: unfold, point across and fold the same navigation chart while issuing a restrained command gesture.
Style/medium: premium high-detail painterly 2.5D isometric strategy-game character sprites, stylized realism, age-of-sail pirate settlement, crisp readable silhouettes at small gameplay scale.
Composition/framing: preserve the exact 1536x1024 canvas; exact eight columns of 192 pixels; row heights exactly 341, 341 and 342 pixels; one complete isolated character centered inside each original cell; fixed front-right three-quarter isometric view; feet and body mass stay on a consistent baseline; preserve at least 8 pixels of flat background at every shared cell boundary and 14 pixels at outer edges; every head, hand, foot, coat, tool, crate, net, chart and timber piece fully contained; no overlap or cropping.
Identity invariants: preserve each column's same person, face, hair, skin tone, age, beard, bandana or hat, clothing colors, coat, boots, belts and role equipment across all three frames. Motion changes only pose and the necessary position of the same tool.
Scene/backdrop: replace every empty pixel with one perfectly flat uniform solid #ff00ff chroma-key background for local removal. No ground, floor, terrain, cast shadow, contact shadow, gradient, texture, reflection, vignette or lighting variation in the background. Do not use magenta or pink inside characters.
Lighting/mood: restrained warm upper-left maritime daylight with cool lower-right ambient occlusion, identical in all cells.
Constraints: exactly twenty-four complete characters, eight per row, no extra figures; no blood, injury, combat, muzzle flash, projectile, smoke, sparks, loose debris, scenery, readable text, letters, numbers, UI, icons, logos, watermark, borders, dividers or grid lines.
Avoid: changing identities or roles, mixing columns, changing camera direction, static duplicate frames, walk cycles, exaggerated cartoon motion, modern tools, fantasy magic, photorealism, bright mobile-game colors, malformed or extra limbs, inconsistent tools between frames, black background, transparent checkerboard, cell-boundary contact, magenta fringe or tiny unreadable props.
```

### 어부 경계 보정 프롬프트

```text
Use case: precise-object-edit
Asset type: final cell-boundary correction for a production front-facing resident work-animation sprite atlas
Input image: Image 1 is the otherwise approved exact 1536x1024, 8-column by 3-row atlas.
Primary request: modify only the FISHER character and fishing net in column 5 of all three rows. Reconfigure and fold each net tightly around the fisher's hands and body so every physical net strand, rope loop, hand, coat and foot is fully contained inside column 5, x=768 through x=959, with at least 8 pixels of perfectly flat #ff00ff background before both vertical cell boundaries x=768 and x=960.
Preserve the same fisher identity, clothing, hat, age, body proportions, front-right isometric direction, lighting and three-frame work sequence:
row 1 preparation, row 2 strong pulling/contact, row 3 recovery.
Preserve unchanged: every pixel and pose of the other twenty-one characters, their tools, the canvas, row positions, scale, palette, rendering and all existing flat chroma background.
Composition/framing: exact 1536x1024 canvas; exact 8 columns of 192 pixels; row heights 341, 341 and 342 pixels; fisher stays centered in column 5; no net or rope pixel may cross into column 4 or 6; no cropping.
Scene/backdrop: restore every vacated pixel from the old oversized net to one perfectly flat uniform solid #ff00ff. No gradient, shadow, texture, reflection or lighting variation in the background.
Constraints: change only the three fisher cells; no extra people, text, borders, dividers, UI, watermark, scenery, loose fish, blood, smoke, malformed limbs or new objects.
Avoid: changing any other cell, shrinking the fisher himself, deleting the net, cell-boundary contact, net strands in column 6, magenta inside opaque character materials or blurred repair artifacts.
```

### 전체 분리 보정 프롬프트

```text
Use case: precise-object-edit
Asset type: production sprite-atlas framing correction
Input image: Image 1 is the otherwise approved front-facing resident work-animation atlas with exact 1536x1024 canvas, eight columns and three animation rows.
Primary request: preserve all twenty-four character designs and work poses exactly, but uniformly scale down each complete character together with every connected tool or prop to approximately 78 percent of its current size about that character's own visual center, then center each complete result independently inside its original cell.
Grid invariants: exact canvas 1536x1024; vertical cell boundaries x=0,192,384,576,768,960,1152,1344,1536; horizontal boundaries y=0,341,682,1024; exact role order and exact preparation/contact/recovery row order unchanged.
Required safe area: every visible pixel belonging to a character, hair, hand, foot, coat, pickaxe, crate, mallet, timber brace, axe, folded net, rope, flintlock or chart must remain fully inside that character's own cell, with at least 10 pixels of clear flat background from every vertical boundary and at least 12 pixels from the outer canvas and horizontal boundaries. Do not crop any tool.
Preserve unchanged: character identities, faces, skin tones, age, hair, hats, bandanas, garments, colors, body proportions, front-right isometric camera, pose timing, tool identity, painterly detail and lighting. Reposition and proportionally scale only; do not redesign or replace.
Scene/backdrop: reconstruct every vacated pixel as one perfectly flat uniform solid #ff00ff chroma-key background. No floor, shadow, texture, gradient, reflection, vignette, border, divider or grid line.
Constraints: exactly twenty-four complete isolated characters, eight per row; no overlap, no cell-boundary contact, no extra figures, no text, logo, UI, watermark, scenery, blood, smoke or particles.
Avoid: changing any pose, enlarging props, merging adjacent figures, leaving neighbor fragments in a cell, disproportionate heads or tools, blur, malformed limbs, black background, transparent checkerboard or magenta inside opaque character materials.
```

### 크기·기준선 보정 프롬프트

```text
Use case: precise-object-edit
Asset type: final scale and baseline correction for a production 8-column by 3-row front-facing work-animation sprite atlas
Input image: Image 1 has the approved isolated characters and poses, but every character is currently too small and the three row baselines are inconsistent.
Primary request: enlarge each complete character together with all connected tools and props uniformly to exactly about 130 percent of its current size, keep it centered horizontally in its own cell, and align the lowest visible foot or boot to one consistent local baseline exactly 15 pixels above the bottom of that row.
Exact absolute foot baselines: row 1 y=326, row 2 y=667, row 3 y=1009.
Exact horizontal cell centers: x=96,288,480,672,864,1056,1248,1440.
Grid invariants: preserve exact 1536x1024 canvas; vertical boundaries x=0,192,384,576,768,960,1152,1344,1536; horizontal boundaries y=0,341,682,1024; exact column identities and exact preparation/contact/recovery row order.
Safe-area rule: after enlargement, every visible head, hand, foot, garment, pickaxe, crate, mallet, brace, axe, folded net, rope, flintlock and chart must remain fully inside its own cell with at least 6 pixels of flat background from vertical boundaries and 8 pixels from the top of each row. If a long tool would violate this, rotate it slightly inward without changing the work action.
Preserve unchanged: all identities, faces, skin tones, ages, hair, hats, bandanas, clothing, colors, body proportions, front-right isometric camera, action poses, role tools, painterly detail and lighting.
Scene/backdrop: every empty or vacated pixel must be one perfectly flat uniform solid #ff00ff chroma-key background with no floor, shadows, gradient, texture, borders or grid.
Constraints: exactly twenty-four complete isolated characters, eight per row; no overlap, clipping, extra figures, text, logos, UI, watermark, scenery, blood, smoke or particles.
Avoid: returning to oversized boundary-crossing figures, leaving characters tiny, changing action timing, changing roles or identities, inconsistent feet baselines, malformed limbs, blurred resizing, black background, checkerboard transparency or magenta inside opaque materials.
```

### 행 위치 보정 프롬프트

```text
Use case: precise-object-edit
Asset type: final pixel-position correction for a production front-facing work-animation sprite atlas
Input image: Image 1 is the otherwise approved exact 1536x1024 8-column by 3-row atlas.
Primary request:
1. Move every complete character and connected tool in ROW 1 exactly 32 pixels upward, preserving all relative spacing and poses.
2. Leave ROW 2 at its current vertical position.
3. Move every complete character and connected tool in ROW 3 exactly 76 pixels downward, preserving all relative spacing and poses.
4. Keep every character in its original column. Where a long tool touches a vertical boundary, rotate or tuck only that tool slightly inward while preserving the action: laborer pickaxes stay inside column 1, builder mallets and braces inside column 3, logger axes inside column 4, guard flintlocks inside column 7, and officer arms and charts inside column 8.
Grid boundaries are authoritative: x=0/192/384/576/768/960/1152/1344/1536 and y=0/341/682/1024. Every complete figure and tool must be fully inside its own fixed cell with clear flat background at the boundaries.
Reconstruct every vacated pixel from moved figures with the exact same perfectly flat uniform #ff00ff chroma-key background.
Preserve unchanged: exact canvas, twenty-four identities, all character designs, faces, clothing, colors, scale, front-right isometric direction, preparation/contact/recovery sequence, tool identity, painterly detail and lighting. Do not redesign, resize, blur or exchange any pose.
Constraints: exactly twenty-four complete figures, no overlap, crop, extra people, text, UI, logos, watermark, scenery, floor, shadows, particles, blood or smoke.
Avoid: moving row 2, changing scale, leaving fragments at old positions, clipping feet, tools crossing cells, malformed limbs, background variation, borders, grid lines, black background or checkerboard transparency.
```

### 최종 7·8열 분리 프롬프트

```text
Use case: precise-object-edit
Asset type: final two-column separation correction for a production resident work-animation atlas
Input image: Image 1 is otherwise approved.
Primary request: modify only the GUARD in column 7 and OFFICER in column 8 across all three rows.
- Move each complete guard and every connected flintlock/cutlass pixel 18 pixels left within column 7. Angle any long flintlock slightly inward and downward so it remains completely left of x=1330.
- Move each complete officer and chart 10 pixels right within column 8. In row 2, bend the pointing arm into a restrained upward command gesture so every hand and finger remains completely right of x=1358 while preserving the contact-frame command action.
- Ensure the vertical strip x=1330 through x=1357 is perfectly empty flat chroma background in all three rows.
Reconstruct every vacated pixel with the exact same perfectly flat uniform #ff00ff background.
Preserve unchanged: all other eighteen characters and all pixels outside columns 7 and 8; guard and officer identities, scale, clothing, colors, camera direction, three-frame timing, tools, painterly detail and lighting.
Canvas and row layout remain exact 1536x1024; no resize or crop.
Constraints: exactly twenty-four figures, no clipping, overlap, extra people, text, logos, UI, watermark, scenery, shadows, smoke, blood, particles, borders or grid lines.
Avoid: changing any other role, deleting the flintlock or chart, front-facing redesign, malformed hands, background variation, black background, checkerboard transparency or leaving fragments at old positions.
```

## 후면 작업 3프레임 아틀라스

- 프로젝트 자산: `static/art/settlement/resident-work-rear-atlas.png`
- 프레임 정의: `static/art/settlement/resident-work-rear-atlas.json`
- 최초 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-01a677fc-337f-4195-86fd-3176e53cc90b.png`
- 최종 프레이밍 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-4bbd9b64-67ff-428d-b79b-e3ed9dc0669a.png`

### 최초 생성 프롬프트

```text
Use case: precise-object-edit
Asset type: production rear-facing 3-frame resident work-animation sprite atlas for the browser game "검은물결: 해적 군주"
Input images: Image 1 is the authoritative edit target for exact rear-left character identities, clothing backs, scale, fixed camera direction and 1536x1024 cell layout. Image 2 is the approved front-facing work atlas and action-timing reference only.
Primary request: transform all twenty-four walking poses in Image 1 into the rear-left view of the same coherent role-specific WORK loops shown by Image 2 while preserving the exact 8-column by 3-row atlas and every rear-view identity.
Exact column order in every row: laborer, hauler, builder, logger, fisher, shipwright, guard, officer.
Animation row order:
- Row 1 is anticipation/preparation: weight shifts and the correct tool is raised or positioned.
- Row 2 is the clear action/contact pose: strongest readable work silhouette.
- Row 3 is recovery/follow-through: weight settles and the tool returns toward neutral, ready to loop.
Role-specific actions matching Image 2:
- Laborer: controlled pickaxe or mattock swing.
- Hauler: lift and settle the same compact wooden cargo crate using both arms.
- Builder: measured mallet strike on a short portable timber brace.
- Logger: broad two-handed axe chopping motion.
- Fisher: pull and gather the same tightly folded bundled fishing net and rope; keep all net strands close to the body.
- Shipwright: forceful caulking-mallet or shipwright-hammer work on a short portable timber piece.
- Guard: inspect, ready and secure a period flintlock or ammunition tool without firing.
- Officer: unfold, point across and fold the same navigation chart with a restrained command gesture.
Style/medium: premium high-detail painterly 2.5D isometric strategy-game character sprites, stylized realism, age-of-sail pirate settlement, crisp readable silhouettes at small gameplay scale.
Composition/framing: preserve the exact 1536x1024 canvas; exact eight columns of 192 pixels; row heights exactly 341, 341 and 342 pixels; one complete isolated character centered inside each original cell; fixed rear-left three-quarter isometric view from Image 1; feet and body mass on a consistent baseline; preserve at least 8 pixels of flat background at every shared cell boundary and 14 pixels at outer edges; every head, hand, foot, coat, tool, crate, folded net, chart and timber piece fully contained; no overlap or cropping.
Identity invariants: preserve each column's same person, hair, skin tone, age, bandana or hat, coat back, clothing colors, boots, belts and rear role equipment from Image 1 across all three frames. Preserve the exact action category and timing from Image 2 but do not turn characters toward the camera.
Scene/backdrop: replace every empty pixel with one perfectly flat uniform solid #ff00ff chroma-key background for local removal. No ground, floor, terrain, cast shadow, contact shadow, gradient, texture, reflection, vignette or lighting variation. Do not use magenta or pink inside characters.
Lighting/mood: restrained warm upper-left maritime daylight with cool lower-right ambient occlusion, identical in all cells and consistent with both references.
Constraints: exactly twenty-four complete rear-facing characters, eight per row, no extra figures; no faces turned front, blood, injury, combat, muzzle flash, projectile, smoke, sparks, loose debris, scenery, readable text, letters, numbers, UI, icons, logos, watermark, borders, dividers or grid lines.
Avoid: front-facing poses, changing identities or roles, mixing columns, changing camera direction, static duplicate frames, walk cycles, oversized fisher nets, exaggerated cartoon motion, modern tools, fantasy magic, photorealism, bright mobile-game colors, malformed or extra limbs, inconsistent tools, black background, transparent checkerboard, cell-boundary contact, magenta fringe or tiny unreadable props.
```

### 최종 프레이밍 프롬프트

```text
Use case: precise-object-edit
Asset type: production rear-facing work-animation sprite-atlas framing correction
Input images: Image 1 is the edit target with approved rear-left identities and work poses. Image 2 is the authoritative final front-facing atlas reference for character apparent size, spacing, row placement and clean isolation only.
Primary request: preserve every rear-facing character and work pose from Image 1, but reframe all twenty-four figures so their apparent height, per-cell spacing and three row positions closely match Image 2. Each rear figure and all connected tools must be isolated inside its own corresponding 192-pixel nominal column with a clean flat-background gap between adjacent roles and between animation rows.
Exact role order: laborer, hauler, builder, logger, fisher, shipwright, guard, officer.
Exact row order: preparation, contact, recovery.
Required visual scale: match Image 2; do not leave the rear characters larger or smaller than the corresponding front characters. Align feet to the same relative baseline in each animation row as Image 2.
Containment:
- Keep pickaxes, crates, mallets, braces, axes, folded nets, flintlocks and charts tight to their owner.
- Tuck the fisher net close to column 5.
- Angle the guard flintlock inward inside column 7.
- Keep the officer and every gesture inside column 8.
- Preserve a visibly empty flat magenta separator at every nominal x boundary and between each row.
Preserve unchanged: exact 1536x1024 canvas, all identities, backs of clothing, hair, hats, bandanas, garments, colors, role tools, rear-left isometric camera, action timing, painterly detail and lighting.
Scene/backdrop: reconstruct all empty pixels as one perfectly flat uniform #ff00ff chroma-key background. No ground, shadow, gradient, texture, reflection, borders or grid lines.
Constraints: exactly twenty-four complete rear-facing figures, no front-facing turns, overlap, crop, extra people, text, logos, UI, watermark, scenery, blood, smoke or particles.
Avoid: changing roles, changing pose sequence, static duplicates, oversized nets or weapons, boundary contact, malformed limbs, black background, checkerboard transparency or magenta in opaque materials.
```

## 전면 전투 3프레임 아틀라스

- 프로젝트 자산: `static/art/settlement/resident-combat-front-atlas.png`
- 프레임 정의: `static/art/settlement/resident-combat-front-atlas.json`
- 최초 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-01884e0a-5b4b-4ebc-bdfc-fe7fd96ed344.png`
- 전체 프레이밍 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-245f16c9-b27b-4e51-919a-798d5792a78e.png`
- 최종 무기 분리 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-07332b48-0da8-4e73-bc0b-546371ff3f15.png`

### 최초 생성 프롬프트

```text
Use case: precise-object-edit
Asset type: production front-facing 3-frame resident combat-animation sprite atlas for the browser game "검은물결: 해적 군주"
Input images: Image 1 is the authoritative edit target for exact eight resident identities, clothing, body proportions and front-right isometric direction. Image 2 is the approved production reference for character apparent scale, clean cell isolation, row spacing, painterly quality and chroma background.
Primary request: transform the twenty-four poses into a coherent role-specific close-combat and defense loop while preserving the exact 8-column by 3-row identity order and 1536x1024 atlas.
Exact column order: laborer, hauler, builder, logger, fisher, shipwright, guard, officer.
Animation row order:
- Row 1: guarded anticipation or command-ready stance.
- Row 2: strongest readable strike, parry, aim or command-contact silhouette.
- Row 3: controlled follow-through and guarded recovery ready to loop.
Role-specific period actions and equipment:
- Laborer: two-handed boarding pick or short pole tool used defensively.
- Hauler: stout belaying pin or short boarding club; no crate.
- Builder: heavy wooden mallet used as an emergency defense weapon.
- Logger: disciplined broad axe combat swing.
- Fisher: short gaff hook or boarding pike kept close to the body.
- Shipwright: practical cutlass guard, slash and recovery.
- Guard: trained cutlass-and-flintlock drill; pistol remains unfired with no muzzle flash.
- Officer: commanding cutlass and flintlock stance with a restrained hand signal; no chart during combat.
Style/medium: premium high-detail painterly 2.5D isometric strategy-game character sprites, stylized realism, Age-of-Sail pirate settlement defense, crisp readable silhouettes at small gameplay scale.
Composition/framing: exact 1536x1024 canvas; eight nominal columns of 192 pixels and three animation rows; match the apparent character height, spacing and row positions of Image 2; one complete isolated front-right figure in each role slot; keep all weapons angled inward and close; preserve a visibly empty flat-background separator between adjacent roles and rows; every head, hand, foot, coat and weapon fully contained with no overlap or cropping.
Identity invariants: preserve each column's same face, skin tone, age, hair, beard, bandana or hat, clothing palette, coat, boots and belts from Image 1 across all three frames. Change only body pose and role-appropriate held weapon.
Scene/backdrop: every empty pixel must be one perfectly flat uniform solid #ff00ff chroma-key background. No ground, floor, terrain, enemy, cast shadow, contact shadow, gradient, texture, reflection, vignette or lighting variation. Do not use magenta or pink in opaque character materials.
Lighting/mood: restrained warm upper-left maritime daylight, cool lower-right ambient occlusion, serious disciplined defense rather than heroic fantasy.
Constraints: exactly twenty-four complete characters, eight per row; no enemy figures, duplicate people, blood, wounds, dismemberment, muzzle flash, projectiles, smoke, fire, sparks, scenery, readable text, letters, numbers, UI, icons, logos, watermark, borders or grid lines.
Avoid: changing identities, swapping columns, front elevation, static duplicate poses, walk cycles, oversized weapons, firearms pointed outside a cell, modern weapons, fantasy armor or magic, exaggerated superhero motion, photorealism, bright mobile-game colors, malformed limbs, boundary contact, black background, checkerboard transparency or magenta fringe.
```

### 전체 프레이밍 프롬프트

```text
Use case: precise-object-edit
Asset type: production front-facing combat-animation sprite-atlas framing correction
Input images: Image 1 is the edit target with approved combat identities, weapons and three poses. Image 2 is the authoritative final reference for apparent character scale, clean isolation, horizontal role spacing and three row placement.
Primary request: preserve all combat character designs and poses from Image 1, but reframe every complete figure and weapon so its apparent size, feet placement and isolation closely match the corresponding slot in Image 2.
Exact role order: laborer, hauler, builder, logger, fisher, shipwright, guard, officer.
Exact row order: guarded anticipation, attack/command contact, guarded recovery.
Containment requirements:
- Keep every figure and weapon fully inside its own nominal 192-pixel role column and own animation row with a clearly empty flat-magenta separator between adjacent figures.
- Move the row-2 laborer inward so the full pick head is visible with outer-left padding.
- Angle all long picks, axes, gaffs, cutlasses and flintlocks inward and closer to the body without changing the action silhouette.
- Ensure columns 7 and 8 never overlap.
- Match Image 2's gameplay-readable height; do not make combat figures larger than the work figures.
Preserve unchanged: exact 1536x1024 canvas, all faces and identities, skin tones, hair, hats, clothing, colors, role weapons, front-right isometric camera, animation timing, painterly detail and lighting.
Scene/backdrop: reconstruct every empty pixel as one perfectly flat uniform #ff00ff chroma-key background. No terrain, floor, shadow, gradient, texture, borders or grid lines.
Constraints: exactly twenty-four complete isolated characters, no enemies, extra figures, blood, wounds, muzzle flash, projectiles, smoke, fire, scenery, text, logos, UI or watermark.
Avoid: changing weapon categories, changing roles or identities, clipping outer edges, boundary contact, static duplicates, malformed limbs, black background, checkerboard transparency or magenta inside opaque materials.
```

### 최종 5–7열 무기 분리 프롬프트

```text
Use case: precise-object-edit
Asset type: final weapon-containment correction for a production front-facing combat-animation atlas
Input image: Image 1 is otherwise approved.
Primary request: modify only the FISHER in column 5, SHIPWRIGHT in column 6 and GUARD in column 7 across all three rows. Preserve their bodies and action timing but change the angle and compact reach of their weapons so the columns are fully separated.
- Fisher: keep the same short gaff hook, but hold it more vertically or diagonally inward close to the torso; every gaff pixel must stay between x=805 and x=949.
- Shipwright: keep the same cutlass, but angle it down and inward close to the body; every shipwright and cutlass pixel must stay between x=976 and x=1134.
- Guard: keep the same flintlock/cutlass drill, but tuck every weapon inward; every guard pixel must stay between x=1166 and x=1324.
Required empty separator strips in every row: x=950 through x=975 and x=1135 through x=1165 must be perfectly flat uniform background.
Reconstruct all vacated pixels from old weapon positions with the exact same perfectly flat #ff00ff chroma-key background.
Preserve unchanged: all other fifteen characters and pixels outside columns 5–7; the three identities, faces, clothing, colors, scale, front-right camera, guarded/contact/recovery poses, painterly detail and lighting.
Canvas remains exact 1536x1024; no resize or crop.
Constraints: exactly twenty-four figures, no enemies, extra people, blood, wounds, muzzle flash, projectile, smoke, fire, text, UI, logos, watermark, scenery, shadows, borders or grid lines.
Avoid: changing weapon categories, deleting weapons, moving roles into another column, malformed hands, background variation, clipping, black background, checkerboard transparency or residual weapon fragments in separator strips.
```

## 후면 전투 3프레임 아틀라스

- 프로젝트 자산: `static/art/settlement/resident-combat-rear-atlas.png`
- 프레임 정의: `static/art/settlement/resident-combat-rear-atlas.json`
- 최종 생성 원본: `/Users/i/.codex/generated_images/019fd0dc-c395-7382-9a7a-56256b6e164f/exec-3713e28c-bee1-407f-805e-639e7e54c1ff.png`

### 최종 생성 프롬프트

```text
Use case: precise-object-edit
Asset type: production rear-facing 3-frame resident combat-animation sprite atlas for the browser game "검은물결: 해적 군주"
Input images: Image 1 is the authoritative edit target for exact rear-left resident identities, clothing backs, proportions and camera direction. Image 2 is the approved front-facing combat atlas and authoritative reference for role weapons, action timing, apparent scale, clean isolation and three-row placement.
Primary request: transform all twenty-four poses in Image 1 into rear-left views of the same role-specific combat loop from Image 2, preserving the exact identity order and 1536x1024 atlas.
Exact column order: laborer, hauler, builder, logger, fisher, shipwright, guard, officer.
Animation row order:
- Row 1: guarded anticipation or command-ready stance.
- Row 2: strongest readable strike, parry, aim or command-contact silhouette.
- Row 3: controlled follow-through and guarded recovery.
Role equipment must match Image 2:
- Laborer: two-handed boarding pick or short pole tool.
- Hauler: stout belaying pin or short boarding club.
- Builder: heavy wooden mallet.
- Logger: disciplined broad axe.
- Fisher: compact short gaff hook held close.
- Shipwright: practical cutlass.
- Guard: trained flintlock/cutlass drill with no firing.
- Officer: commanding cutlass and flintlock or restrained hand signal, no chart.
Style/medium: premium high-detail painterly 2.5D isometric strategy-game sprites, stylized realism, Age-of-Sail pirate settlement defense, crisp silhouettes at small gameplay scale.
Composition/framing: exact 1536x1024 canvas; match Image 2's apparent height, row placement and role spacing; one complete isolated rear-left figure in each corresponding slot; preserve an empty flat-background separator between all adjacent roles and animation rows; keep every head, hand, foot, coat and weapon fully contained; long weapons angle inward close to the body.
Identity invariants: preserve each column's same hair, skin tone, age, bandana or hat, coat back, clothing palette, boots, belts and rear role equipment from Image 1. Characters must remain rear-left and never turn their faces toward camera.
Scene/backdrop: every empty pixel must be one perfectly flat uniform solid #ff00ff chroma-key background. No ground, floor, enemy, terrain, cast shadow, contact shadow, gradient, texture, reflection, vignette, borders or grid lines.
Lighting/mood: restrained warm upper-left maritime daylight and cool lower-right ambient occlusion consistent with both references.
Constraints: exactly twenty-four complete rear-facing figures; no enemies, extra people, blood, wounds, muzzle flash, projectiles, smoke, fire, sparks, scenery, readable text, UI, icons, logos or watermark.
Avoid: front-facing poses, identity changes, mixed columns, static duplicate frames, walk cycles, oversized weapons, boundary contact, modern arms, fantasy armor or magic, exaggerated cartoon movement, malformed limbs, black background, checkerboard transparency or magenta in opaque materials.
```

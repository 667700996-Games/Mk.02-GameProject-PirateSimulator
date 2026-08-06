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

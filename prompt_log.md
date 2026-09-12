# Prompt Log

## Prompt 1

```text
Read, understand, then run the project
```

## Prompt 2

```text
Its supposed to be a playable version of crossy road that can be run on browser, find bugs, fix them, and verify the game works as intended
```

## Prompt 3

```text
The controls for moving left and right seem to be reversed. The trains / cars seem to be coming in on both sides at the same time. Fix and make the game feel more like the original crossy road
```

## Prompt 4

```text
Most of the key game mechanics are down. Add different sized obstacles and improve graphics
```

## Prompt 5

```text
add a bit more room between the cars
```

## Prompt 6

```text
Fix the graphics when the chicken is on the logs
```

## Prompt 7

```text
Create a readme.md with the following text:&#x20;
This is CrossRoad built in under 4 hours using various AI tools. The main differences are the graphics and the viewpoint the game is in (straight up instead of diagonal). You play by using wasd or arrow keys to move forwards / sideways. You want to make it as far as possible without getting hit by a car or drowning. I've used both the various models on kiro auto and codex 5.6 sol. I used kiro to create most of the game, and then polished / bugfixed with codex.&#x20;

Also create a prompt\_log.md with our entire messaging log including each prompt verbatim
```

Here's the full conversation log:

---

**User (message 1):**

> Create a version of Crossyroad using javascript that can run on my browser

**Kiro:** Asked 3 clarifying questions about visual style, input methods, and game completeness.

---

**User (message 2):**

> 1. a, 2. a, 3. a

(Pseudo-3D isometric, keyboard only, core mechanics)

**Kiro:** Asked 3 follow-up questions about renderer choice, obstacle types, and world structure.

---

**User (message 3):**

> 1. a, 2. c, 3. c

(Three.js, all obstacle types, infinite scrolling)

**Kiro:** Did research via a sub-agent on Three.js best practices (InstancedMesh, camera setup, hop animation, AABB collision, terrain recycling). Then presented a full 8-task implementation plan covering:

- Task 1: Project scaffold and Three.js scene
- Task 2: Player character and hop movement
- Task 3: Camera follow
- Task 4: Terrain row generation
- Task 5: Moving obstacles (cars and logs)
- Task 6: Train lane
- Task 7: Collision detection and game states
- Task 8: Score, high score, and game-over UI

---

**User (message 4):**

> Looks good, implement the plan

**Kiro (orchestrator mode):** Created spec files at `.kiro/specs/crossy-road/` (requirements.md, design.md, tasks.md), then executed all 28 tasks across 9 waves:

**Wave 1 — Tasks 1.1, 1.2, 1.3 (parallel)**

- Created `index.html` with Three.js CDN import map
- Created `scene.js` with renderer, camera, lights, fog, resize handler, `updateCamera`
- Created `game.js` with RAF loop, clock, `startGame()`

**Wave 2 — Tasks 2.1, 4.1 (parallel)**

- Created `player.js` with voxel character mesh (body + head boxes)
- Created `terrain.js` with InstancedMesh setup and free-list slot pools

**Wave 3 — Tasks 2.2, 4.2 (parallel)**

- Added hop state machine to `player.js` (parabolic arc, input buffer, `startHop`, `updatePlayer`)
- Added `generateRow`, `pickRowType`, weighted random with adjacency rules to `terrain.js`

**Wave 4 — Tasks 2.3, 4.3, 4.4 (parallel)**

- Added keyboard input handler to `game.js` (Arrow + WASD, input buffer)
- Added `recycleRow` and `updateTerrain` to `terrain.js`
- Confirmed Tasks 3.1 and 3.2 were already complete (camera follow implemented in earlier waves)

**Wave 5 — Tasks 3.1, 3.2, 4.5, 5.1 (parallel)**

- Verified camera follow already wired
- Added `seedWorld`, `generateGrassRow`, `resetTerrain` to `terrain.js`; wired `updateTerrain` into game loop
- Created `obstacles.js` with car and log meshes, `spawnObstaclesForRow`, `despawnRow`

**Wave 6 — Tasks 5.2, 5.3, 5.4 (single dispatch)**

- Added `updateObstacles` (wrapping movement) and `updateLogRiding` to `obstacles.js`
- Added `setOnRowGenerated`/`setOnRowRecycled` callbacks to `terrain.js` to avoid circular imports
- Wired everything into `game.js` game loop

**Wave 7 — Tasks 6.1, 6.2, 6.3 (single dispatch)**

- Enforced train-bordered-by-grass adjacency rule in `terrain.js`
- Added `updateTrains` to `obstacles.js` — idle → warning (flashing tiles) → sweeping state machine
- Wired `updateTrains(dt, rows, roadMesh)` into game loop

**Wave 8 — Tasks 7.1, 7.2, 7.3, 7.4 (single dispatch)**

- Created `collision.js` with `boxesOverlap`, `checkCollisions`, `checkRiverDeath`, `checkCameraLag`
- Wired per-frame death checks into game loop
- Wired river death to `setOnHopLanded` callback
- Implemented `onPlayerDeath()` — freezes loop, saves high score, shows game over

**Wave 9 — Tasks 8.1, 8.2, 8.3, 8.4 (two dispatches)**

- Created `ui.js` with score HUD div, game-over overlay, `showGameOver`/`hideGameOver`, `setRestartHandler`, localStorage helpers
- Wired `updateScoreHUD` into game loop, `showGameOver` into `onPlayerDeath`
- Implemented `resetGame()` — resets player, terrain, obstacles, score; re-seeds world; restarts loop
- Wired R key and restart button to `resetGame`
- Verified full integration end-to-end

---

**User (message 5):**

> Give me a full prompt log

*(This message — current response)*

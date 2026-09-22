Above Par-adowski, Par-t 2
=============

This is a WebXR mini-golf game built for the Quest 2 browser created by James C. Kane and Paradowski Creative. Originally implemented as a 40-hour just-for-fun prototype, this version of the game has been improved with a new physics enginge, PhysX, improved UX and more holes, while remaining open source and well-documented for other teams to learn from. 

## This Fork

**Play it now: <https://colinfizgig.github.io/above-par-adowski-mini-golf/>** - in a
desktop browser, or in VR from the Meta Quest browser (the page is served over
HTTPS, so WebXR works directly from that link).

This fork revives and extends the original game:

### Self-hosted everything

The original game loaded its assets from Glitch's CDN, which no longer exists.
Every model, sound, font, texture and video now lives in
`assets/{models,audio,images,fonts,video}` (matching the live
aboveparadowski.com layout), so the whole game runs from any static host. The
PhysX glue and wasm are self-hosted too, pinned to matching versions
(c-frame/physx 0.1.x) - the previously unpinned CDN wasm had drifted and broke
physics with a WebAssembly `LinkError`.

### Desktop (non-VR) play - `components/desktop-golf.js`

The club remains a real kinematic PhysX body exactly as in VR, so contact,
spin and mishits are fully physical - the mouse only drives the club.

| Walk mode | |
| --- | --- |
| `WASD` + mouse drag | walk and look around |
| Hold `T`, release | aim the blink teleporter (ribbon arc + landing ring on the walkmesh), release to blink |
| Left click near your ball | step into the putting stance (within ~3m; `N` jumps straight to the ball) |
| `Esc` | pause menu |

| Putting stance | |
| --- | --- |
| Move mouse | rotate the aim line (camera orbits the ball, slew-limited) |
| Hold right mouse / `Shift` | sight down the line at the hole; keep aiming while sighted |
| Hold left mouse, pull back, flick forward | swing along the line - speed of the flick is the power |
| Hold `Space`, release | charge-and-release putt |
| `Esc` / right-click release | step away |

The stance camera sits angled behind the putter with a widened lens so the
ball and the hole share the screen; after each stroke a follow camera tracks
the ball until it settles. Add `?nolock` to the URL to keep the cursor
visible (no pointer lock).

### Phone / tablet play - `components/touch-golf.js`

Phones get a **PLAY ON PHONE** button and the same physical game - the touch
layer only translates gestures into the desktop mode's club, so putts stay
fully physical. Played in landscape (portrait shows a rotate prompt).

| Walk mode | |
| --- | --- |
| One-finger drag | look around |
| Press & hold the ground, drag, release | teleport (ribbon arc follows your finger) |
| Tap near your ball | step into the putting stance |
| GO TO BALL / MENU buttons | jump to the ball / pause menu |

| Putting stance | |
| --- | --- |
| Drag the view | rotate the aim line |
| Hold SIGHT | sight down the line at the hole |
| SWING pad (right side) | pull down for the backswing, flick up to putt - flick speed is the power |
| X | step away |

Multiplayer rooms work the same on mobile, so phone, desktop and VR players
can share a course.

The game asks the browser for fullscreen when you start; where that's not
granted (older iOS), use **Add to Home Screen** - the page is an installable
web app (`manifest.webmanifest`) and launches from the home screen with no
browser bars at all.

### Multiplayer - `systems/multiplayer.js` + `server/`

Parallel-play rooms via [networked-aframe]: each client runs its own complete
game (own ball, own PhysX, own scoring) and the network shares presence only -
no shared physics, no authoritative server. Other players appear as name-tagged
avatars with color-coded, unshaded balls (your own ball is tinted to match),
plus a live shared scoreboard. You hear other players' putts click from
where their ball is, a toast announces whenever someone sinks a hole, and
when your round ends a shared results board ranks the field and crowns the
winner. Clubs stay local to each player's screen. Desktop and VR players
can share a room.

Joining is link-based - no accounts. Click **PLAY ONLINE** and enter a room
name, or share a URL; everyone using the same room name plays together:

```
https://colinfizgig.github.io/above-par-adowski-mini-golf/?room=my-room&name=Colin
```

| URL parameter | Effect |
| --- | --- |
| `room` | join (or create) a multiplayer room; omit for single player |
| `name` | your name tag / scoreboard name |
| `color` | your color, e.g. `%233b82f6`; defaults to a palette pick |
| `server` | relay origin override; defaults to the page origin, or the Render relay on github.io |
| `nolock` | desktop mode without pointer lock |
| `hole` | start at a specific hole (from the original game) |

The relay (`server/`) is the standard networked-aframe wseasyrtc server
(express + socket.io + open-easyrtc). It relays room messages and serves the
game for local dev; no game state lives on it. The deployed instance runs on
Render's free tier at `https://above-par-relay.onrender.com` (auto-deploys on
push; may take ~30-50s to wake after idle - the first joiner waits, everyone
after connects instantly).

### Running locally

```sh
# single player (static)
npx http-server -p 8087 .

# multiplayer (relay + game in one process)
cd server && npm install && npm start   # then open http://localhost:8090/?room=test
```

### Deploying your own

The game is static - GitHub Pages serves this repo as-is. For multiplayer,
`render.yaml` is a ready Render blueprint (New > Blueprint > this repo) that
deploys `server/` as a free web service; point clients at it with
`?server=https://<your-relay>` or set `DEFAULT_RELAY` in
`systems/multiplayer.js`.

[networked-aframe]: https://github.com/networked-aframe/networked-aframe


## Original Components

### `putt`

This is the primary game logic script. This script handles:

- Callbacks for physics events
- Callbacks for user input
- Scoring logic
- User teleportation and ball spawning b/w holes
- SFX logic
- Analytics via 

See code comments in this script for more specifics.

### `ball-finder`

This is a compass-like 3D arrow that scales up and points to the ball when the user is looking away from the ball (i.e. when the ball is outside the camera frustum).

### `ground-detector`

This is a component that listens to a raycaster attached to the Quest 2 Controller and sets the scale of the club shaft and the position of the club head based on distance to ground.

## Important Third-Party Components

### `trail`

This is a trail behind the ball meant to help the user track it, using the open source library:

### `highlight`

This is an effect that shows a highlight effect when the model it's attached to is occluded, which we use when the club head is below the floor or in a wall.

### `particle-system`

A generic A-Frame system used for a nice particle effect when ball contact is made, and when a putt is made.

### `sound`

Another generic A-Frame utilized for SFX and backing track cues.


## Credits:

- James C. Kane - creator and lead dev
- Kevin Olson - senior dev
- Ethan Michalicek - senior dev
- Irina Fawcett - dev
- Andy Wise - creative director
- Dan Rayfield - UX director
- Colin Freeman - senior technical artist
- AJ Johri - technical artist
- Noah Ilbery - technical artist


## Special Thanks:

- Ada Rose Cannon
- Noeri Huisman
- Diarmid Mackenzie
- Diego Marcos
- Zach Capalbo
- Ashford Stamper
- Chris Prestemon
- Caroline May
- Eric Bowman
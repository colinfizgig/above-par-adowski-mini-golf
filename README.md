Above Par-adowski, Par-t 2
=============

This is a WebXR mini-golf game built for the Quest 2 browser created by James C. Kane and Paradowski Creative. Originally implemented as a 40-hour just-for-fun prototype, this version of the game has been improved with a new physics enginge, PhysX, improved UX and more holes, while remaining open source and well-documented for other teams to learn from. 


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


## Special thanks:

- Ada Rose Cannon
- Noeri Huisman
- Diarmid McKenzie
- Diego Marcos
- Dave Hill
- Ashford Stamper
- Chris Prestemon
- Caroline May
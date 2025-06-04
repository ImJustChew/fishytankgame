# Player System Documentation

## Overview

The player system allows user-controlled movement with WASD keys, floating physics with gravity, sprite rendering, and real-time position synchronization to database. It also displays other users' positions when visiting their tanks.

## Components

### 1. Player Component (`Player.ts`)

- **Movement**: WASD keys (W/A/S/D + arrow keys) for user input
- **Physics**: Floating physics system with gravity, float force, and dampening
- **Sprite Rendering**: Visual representation using sprite frames
- **Database Sync**: Real-time position synchronization every 1 second
- **Boundary Checking**: Prevents players from moving outside tank bounds

### 2. PlayerManager Component (`PlayerManager.ts`)

- **Sprite Management**: Handles default and user-specific player sprites
- **Future Enhancement**: User avatar system and multiple sprite options
- **Simple API**: Easy access to player sprites by user ID

### 3. FishTank Integration

- **Player Spawning**: Supports both current user (controllable) and friends (display-only)
- **Multi-player Display**: Shows up to 5 players simultaneously in tank
- **Real-time Updates**: Friend positions update automatically
- **Cleanup**: Proper player lifecycle management

### 4. Database Integration

- **Position Storage**: Player positions stored with x, y coordinates and timestamp
- **Real-time Sync**: Automatic position updates for friends
- **Friend Visibility**: Only friends can see each other's positions

## Setup Instructions

### 1. Add Player System to Scene

1. Assign `PlayerManager` component to a manager node
2. Set up default player sprite in PlayerManager
3. Ensure `FishTankManager` has `PlayerManager` property assigned
4. The player system initializes automatically with `FishTankManager.start()`

### 2. Database Schema

The player system uses the following database structure:

```
users/{uid}/playerPosition: {
  x: number,
  y: number,
  lastUpdated: number
}
```

### 3. Testing

Use the `PlayerSystemTest` component for testing:

- Add to a test node and assign `FishTankManager`
- Use test controls: R (refresh), P (player count), U (user info), I (system info)

## Usage Examples

### Basic Player Management

```typescript
// Initialize player system (done automatically by FishTankManager)
await fishTankManager.initializePlayerSystem();

// Get current user's player
const currentPlayer = fishTankManager.getCurrentUserPlayer();
if (currentPlayer) {
  const position = currentPlayer.getPlayerData();
  console.log(`Player at: ${position.x}, ${position.y}`);
}

// Refresh friend players
await fishTankManager.refreshPlayers();

// Get player count
const playerCount = fishTankManager.getPlayerCount();
```

### Player Controls

- **W / ↑**: Move up
- **A / ←**: Move left
- **S / ↓**: Move down
- **D / →**: Move right

### Player Physics

- **Gravity**: Pulls player downward
- **Float Force**: Natural buoyancy in water
- **Dampening**: Smooth movement with momentum
- **Boundary Enforcement**: Keeps player within tank bounds

## API Reference

### Player.ts Methods

- `initializePlayer(playerData, tankBounds)`: Initialize player with data and bounds
- `getPlayerData()`: Get current player data including position
- `updatePlayerData(newData)`: Update player data (preserves position)

### PlayerManager.ts Methods

- `getDefaultPlayerSprite()`: Get default player sprite
- `getPlayerSpriteByUserId(userId)`: Get sprite for specific user (currently returns default)
- `getRandomPlayerSprite()`: Get random player sprite (currently returns default)

### FishTankManager.ts Player Methods

- `getCurrentUserPlayer()`: Get current user's controllable player
- `getPlayerCount()`: Get total number of active players
- `refreshPlayers()`: Manually refresh friend player positions

### Database Service Methods

- `updatePlayerPosition(x, y)`: Update current user's position
- `getPlayerPosition(uid)`: Get specific user's position
- `getFriendsPlayerPositions()`: Get all friends' positions
- `onPlayerPositionChanged(uid, callback)`: Subscribe to position updates

## Features

### Current Implementation

- ✅ WASD movement controls
- ✅ Floating physics with gravity
- ✅ Sprite rendering support
- ✅ Real-time position sync to database
- ✅ Friend player display
- ✅ Boundary checking
- ✅ Player lifecycle management
- ✅ Database integration

### Future Enhancements

- 🔄 User-specific avatars
- 🔄 Player animations
- 🔄 Player interactions (chat, gestures)
- 🔄 Player customization options
- 🔄 Multiple sprite sets
- 🔄 Player status indicators

## Troubleshooting

### Common Issues

1. **Player not moving**: Check that input events are properly set up and player is the current user
2. **No friend players visible**: Verify friendship status and that friends have recent position data
3. **Position not syncing**: Check database permissions and network connectivity
4. **Player outside bounds**: Tank bounds may need recalculation after UI changes

### Debug Information

Enable debug logging in Player.ts by setting `DEBUG_MOVEMENT = true` for detailed movement information.

## Integration Notes

- The player system is fully integrated with the existing fish tank system
- Players and fish coexist in the same tank space
- Player positions are independent of fish positions
- Database updates are throttled to prevent spam (1 second intervals)
- Friend positions are cached and updated in real-time when friends move

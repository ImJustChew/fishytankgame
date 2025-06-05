# Battle Mode Setup Guide

## Overview

This guide provides step-by-step instructions for setting up the complete battle mode system in your fish tank game. The battle mode includes matchmaking, deployment, combat, and reward systems.

**Architecture Note**: This is a single-tank battle system where players deploy their fish into the opponent's tank for combat. This is not a synchronous multiplayer game - both player and opponent fish coexist in one tank with proper ownership tracking.

## 📁 File Structure

All battle mode files have been created in the following structure:

```
assets/scripts/battle/
├── managers/
│   ├── BattleSceneManager.ts      # Main battle orchestrator
│   ├── BattleMatchmaker.ts        # Player matchmaking system
│   └── BattleTankManager.ts       # Extended tank manager for battles
├── components/
│   ├── BattleFish.ts             # Battle fish with AI (already created)
│   └── FishDeploymentPanel.ts     # Drag-and-drop deployment UI
├── systems/
│   ├── CombatManager.ts          # Combat logic and damage system
│   ├── VictoryConditions.ts      # Win/loss detection
│   └── BattleAI.ts              # Advanced AI decision making
├── ui/
│   ├── BattleHUD.ts             # In-battle UI and status displays
│   ├── VictoryScreen.ts         # Post-battle victory/defeat screen
│   ├── RewardDistribution.ts     # Lottery ticket and achievement rewards
│   └── BattleModeButton.ts      # Main menu battle mode access
└── data/
    ├── BattleFishData.ts        # Battle data structures (already created)
    └── BattleConfig.ts          # Configuration and constants (already created)
```

## 🎬 Scene Setup

### 1. Create Battle Scene

1. In Cocos Creator, create a new scene called `battle.scene`
2. Set up the scene hierarchy:

```
BattleScene
├── Canvas
│   ├── BattleTank (BattleTankManager) // Single tank for both player and opponent fish
│   ├── UI
│   │   ├── BattleHUD
│   │   ├── DeploymentPanel (FishDeploymentPanel)
│   │   ├── VictoryScreen
│   │   └── RewardDistribution
│   └── Systems
│       ├── BattleSceneManager
│       ├── CombatManager
│       └── VictoryConditions
```

### 2. Configure Tank Manager

1. Add `BattleTankManager` component to the battle tank node
2. This single tank will contain both player and opponent fish
3. Assign the `battleFishPrefab` to the manager
4. The manager uses ownership tracking to differentiate between player and opponent fish

### 3. Set Up UI Components

1. **BattleHUD**: Add progress bars, labels, and buttons for battle status
2. **FishDeploymentPanel**: Create fish slot container and drag preview
3. **VictoryScreen**: Set up victory/defeat panels with animations
4. **RewardDistribution**: Configure reward display panels

## 🐟 Prefab Setup

### 1. Create Battle Fish Prefab

1. Create a new prefab called `BattleFish.prefab`
2. Add the following components:
   - `BattleFish` (main battle component)
   - `BattleAI` (AI decision making)
   - Fish sprite renderer
   - Animation components
   - Collider for interaction

### 2. Create Fish Slot Prefab

1. Create `FishSlot.prefab` for the deployment panel
2. Include:
   - Fish icon sprite
   - Count label
   - Touch interaction area

### 3. Create Achievement Reward Prefab

1. Create `AchievementReward.prefab` for reward display
2. Include:
   - Achievement icon
   - Name label
   - Ticket bonus label

## 🔗 Component Connections

### BattleSceneManager Connections

```typescript
// Assign in inspector:
@property(BattleTankManager) battleTankManager  // Single tank for both player and opponent fish
@property(CombatManager) combatManager
@property(VictoryConditions) victoryConditions
@property(BattleHUD) battleHUD
@property(FishDeploymentPanel) deploymentPanel
@property(VictoryScreen) victoryScreen
@property(RewardDistribution) rewardDistribution
```

### CombatManager Connections

- Links to the battle tank manager for fish access
- Uses owner-based filtering to distinguish player vs opponent fish
- Provides damage tracking and combat events

### VictoryConditions Connections

- Links to CombatManager for battle state
- Emits victory events to BattleSceneManager

## 🎮 Main Menu Integration

### Add Battle Mode Button

1. In your main menu scene, add a "Battle Mode" button
2. Attach the `BattleModeButton` component
3. Create a battle mode selection panel with:
   - Quick Match button
   - Ranked Match button (future feature)
   - Player stats display

### Example UI Layout:

```
MainMenu
├── BattleModeButton (Button)
└── BattleModePanel (Panel)
    ├── QuickMatchButton
    ├── RankedMatchButton
    ├── PlayerStatsPanel
    │   ├── LevelLabel
    │   ├── WinRateLabel
    │   └── TicketsLabel
    └── CloseButton
```

## ⚙️ Configuration

### Battle Config Settings

Key settings in `BattleConfig.ts`:

```typescript
BATTLE_TIME_LIMIT: 300000,           // 5 minutes
MAX_DEPLOYMENT_FISH: 5,              // Max fish during deployment
MAX_BATTLE_FISH: 8,                  // Max fish during combat
DEPLOYMENT_TIME: 30000,              // 30 seconds deployment phase
VICTORY_FISH_ELIMINATION_THRESHOLD: 0.5, // 50% elimination for victory
```

### Reward Settings:

```typescript
REWARDS: {
    WIN_TICKETS: 10,                 // Base tickets for victory
    LOSS_TICKETS: 3,                 // Consolation tickets
    KILL_BONUS_TICKETS: 2,           // Per enemy fish defeated
    DECISIVE_WIN_BONUS: 5,           // Quick victory bonus
}
```

## 🔧 Implementation Steps

### Phase 1: Basic Battle Setup

1. ✅ Create all TypeScript files
2. ⏳ Set up battle scene with basic layout
3. ⏳ Create and configure prefabs
4. ⏳ Connect components in inspector

### Phase 2: Core Systems

1. ⏳ Test fish deployment system
2. ⏳ Implement basic combat interactions
3. ⏳ Test victory condition detection
4. ⏳ Verify matchmaking flow

### Phase 3: UI and Polish

1. ⏳ Complete UI layouts and styling
2. ⏳ Add animations and effects
3. ⏳ Implement sound effects
4. ⏳ Test reward distribution

### Phase 4: Integration

1. ⏳ Add battle mode button to main menu
2. ⏳ Test scene transitions
3. ⏳ Implement Firebase integration
4. ⏳ Test multiplayer aspects

## 🐛 Common Issues and Solutions

### Fish Not Deploying

- Check `canDeployFish()` logic in BattleTankManager
- Verify deployment panel touch events
- Ensure tank bounds are properly configured

### Combat Not Working

- Verify CombatManager is receiving fish from both tanks
- Check attack range and damage calculations
- Ensure AI decisions are being processed

### Victory Not Triggering

- Check victory condition thresholds
- Verify fish survival rate calculations
- Ensure timer is properly tracking

### UI Not Updating

- Check component references in inspector
- Verify update loops are scheduled
- Ensure event callbacks are properly connected

## 🎯 Testing Checklist

### Deployment Phase

- [ ] Fish can be dragged from panel to tank
- [ ] Deployment count limits are enforced
- [ ] Visual feedback shows deployment success/failure
- [ ] Timer transitions to combat phase

### Combat Phase

- [ ] Fish move according to AI behavior
- [ ] Attacks deal damage and respect cooldowns
- [ ] Fish die when HP reaches zero
- [ ] UI shows real-time battle status

### Victory Detection

- [ ] Time limit triggers appropriate winner
- [ ] Fish elimination victory works correctly
- [ ] Victory screen shows proper results
- [ ] Rewards are calculated accurately

### Integration

- [ ] Battle mode button works from main menu
- [ ] Scene transitions work smoothly
- [ ] Player data persists between scenes
- [ ] Return to main menu functions properly

## 🚀 Future Enhancements

### Planned Features

1. **Ranked Matchmaking**: ELO-based competitive system
2. **Spectator Mode**: Watch other players' battles
3. **Battle Replays**: Save and review battles
4. **Tournament Mode**: Bracket-style competitions
5. **Guild Battles**: Team-based warfare
6. **Fish Customization**: Battle-specific upgrades
7. **Map Variations**: Different battle environments
8. **Power-ups**: Temporary battle enhancements

### Advanced AI Features

1. **Learning AI**: Adapt to player strategies
2. **Personality System**: Different AI behaviors per fish
3. **Formation Tactics**: Coordinated group movements
4. **Dynamic Difficulty**: Adjust AI based on player skill

## 📋 Implementation Notes

### Performance Considerations

- Use object pooling for frequently created/destroyed objects
- Limit combat update frequency to maintain 60 FPS
- Optimize fish AI calculations for large battles
- Implement level-of-detail for distant fish

### Network Architecture

- Battle state synchronization for real-time multiplayer
- Conflict resolution for simultaneous actions
- Lag compensation for smooth gameplay
- Anti-cheat validation on server side

### Data Management

- Local battle state during combat (no server sync)
- Firebase integration for match results only
- Efficient data structures for large fish collections
- Proper cleanup to prevent memory leaks

This comprehensive battle mode system provides a solid foundation for competitive fish tank battles while maintaining the casual, enjoyable nature of the base game.

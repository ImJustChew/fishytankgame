# Fish Tank Battle Mode - Gameplay Documentation

## Overview

The Fish Tank Battle Mode is a new competitive multiplayer feature that allows players to engage in strategic fish-vs-fish combat with random opponents. Players deploy fish with specialized combat roles to attack enemy fish tanks while defending their own territory.

## Core Concept

- **Objective**: Eliminate over 50% of the opponent's fish to win the battle
- **Deployment**: Drag-and-drop fish from a side panel to the top of the battle tank
- **Combat Roles**: Fish have specialized attack or defense capabilities
- **Local Tracking**: Fish HP is tracked locally during battle (not synced to Firebase)
- **Real-time**: Both players can deploy and command fish simultaneously
- **Post-Match Recording**: Firebase only records match history and results after battle completion
- **Fish Permanence**: Attacker fish that die are permanently removed from player's collection

## Game Flow

### 1. Matchmaking Phase

- Players access battle mode via a new "Battle" button in the main scene
- Matchmaking system pairs players with random opponents (friends or strangers)
- Loading screen displays while searching for an opponent
- Once matched, both players enter the battle scene

### 2. Battle Scene Setup

- **Split-Screen Layout**:
  - Left side: Player's tank (bottom half for own fish, top half for attacks)
  - Right side: Opponent's tank (visible but not directly controllable)
- **Fish Deployment Panel**: Side panel showing available fish types with quantities
- **Battle Timer**: Optional time limit for deployment and battle phases
- **Score Display**: Real-time tracking of fish eliminated on both sides

### 3. Battle Mechanics

#### Fish Combat System

- **Attack Fish**: Fish with `attackHP > 0` actively hunt enemy fish
- **Defense Fish**: Fish with `defenseHP > 0` protect territory and chase attackers
- **Neutral Fish**: Fish with no combat stats act as targets/fodder

#### Deployment Rules

- Players drag fish from their collection panel to the top of their tank
- Fish drop into the tank with initial downward movement
- Limited by available fish in player's collection
- Cooldown timer prevents spam deployment

#### Combat Behavior

- **Attacking Fish**:
  - Automatically seek and chase enemy fish
  - Deal damage when in contact with targets
  - Continue until destroyed or all enemies eliminated
  - **PERMANENT LOSS**: If killed, attacker fish are permanently removed from player's collection
- **Defending Fish**:
  - Patrol their own territory
  - Aggressively chase attacking fish that enter their area
  - Protect weaker fish in their tank
  - **SAFE DEPLOYMENT**: Defending fish return to collection after battle (win or lose)

## Extended Fish Data Structure

### Current Fish Interface Extension

```typescript
export interface Fish {
  id: string;
  name: string;
  description: string;
  price: number;
  health: number;
  // NEW BATTLE PROPERTIES
  attackHP?: number; // Combat health for attacking (0 = non-combatant)
  defenseHP?: number; // Combat health for defending (0 = non-defender)
  attackDamage?: number; // Damage dealt per attack
  attackSpeed?: number; // Movement speed when attacking
  attackRange?: number; // Detection range for enemies
}
```

### Battle Fish State (Local Only)

```typescript
export interface BattleFish {
  originalData: Fish;
  currentHP: number; // Local HP tracking during battle
  role: "attacker" | "defender" | "neutral";
  owner: "player" | "opponent";
  isAlive: boolean;
  position: Vec3;
  target?: BattleFish; // Current attack/chase target
}
```

## Victory Conditions

### Primary Win Condition

- **Elimination Victory**: Eliminate more than 50% of opponent's fish
- Fish count tracked in real-time during battle
- Victory triggers immediately when threshold is reached

### Secondary Conditions (Optional)

- **Time Victory**: Most fish remaining when timer expires
- **Total Damage**: Most damage dealt to enemy fish
- **Surrender**: Manual forfeit option

## Reward System & Fish Permanence

### Lottery Ticket Rewards

- **Victory Rewards**:
  - Base lottery tickets for winning (3-5 tickets)
  - Performance bonuses for exceptional play
  - Perfect victory bonus (no attacker fish lost)
- **Participation Rewards**:
  - Consolation tickets for losing (1-2 tickets)
  - Achievement-based bonuses during battle
- **Special Achievements**:
  - First Blood: First fish elimination in battle
  - Survival Streak: Keeping fish alive for extended time
  - Underdog Victory: Winning when significantly behind

### Fish Collection Management

- **Attacker Fish Risk**:
  - High-value attacker fish provide strong combat advantage
  - Permanent loss if killed creates strategic risk/reward decisions
  - Players must balance powerful fish usage vs collection preservation
- **Defender Fish Safety**:
  - All defender fish return to collection after battle
  - Encourages defensive strategies for collection protection
  - Lower risk option for valuable/rare fish

### Post-Battle Collection Updates

```typescript
interface BattleResult {
  winner: "player" | "opponent";
  playerFishLost: string[]; // IDs of permanently lost attacker fish
  opponentFishLost: string[]; // Opponent's lost fish
  battleDuration: number;
  totalDamageDealt: number;
  achievementsEarned: string[];
  lotteryTicketsEarned: number;
}
```

### Match History Database Structure

```typescript
interface MatchRecord {
  matchId: string;
  timestamp: number;
  players: {
    player1: PlayerMatchData;
    player2: PlayerMatchData;
  };
  result: BattleResult;
  replayData?: CompressedBattleData; // Optional for replays
}

interface PlayerMatchData {
  playerId: string;
  fishDeployed: DeployedFishRecord[];
  fishLost: string[];
  damageDealt: number;
  damageReceived: number;
  achievements: string[];
}
```

## Technical Implementation

### New Components Required

#### 1. Battle Matchmaking System

- `BattleMatchmaker.ts`: Handles random player pairing
- `BattleQueue.ts`: Manages waiting players and connections
- Firebase integration for real-time matchmaking

#### 2. Battle Scene Manager

- `BattleSceneManager.ts`: Orchestrates battle flow and state
- `BattleTankManager.ts`: Extends `FishTankManager` for combat
- `OpponentTankView.ts`: Read-only view of opponent's tank

#### 3. Fish Deployment System

- `FishDeploymentPanel.ts`: Drag-and-drop interface for fish selection
- `DeploymentZone.ts`: Drop zone at top of tank
- `FishCollection.ts`: Player's available fish for battle

#### 4. Combat System

- `BattleFish.ts`: Extended `Fish` class with combat behaviors
- `CombatManager.ts`: Handles fish interactions and damage
- `BattleAI.ts`: AI logic for attacking and defending behaviors

#### 5. Battle UI

- `BattleHUD.ts`: Score, timer, and battle status display
- `VictoryScreen.ts`: End-game results and statistics
- `MatchSummary.ts`: Detailed post-battle breakdown and rewards
- `RewardDistribution.ts`: Lottery ticket rewards and collection updates
- `BattleEffects.ts`: Visual effects for combat

### File Structure

```
assets/scripts/battle/
├── managers/
│   ├── BattleSceneManager.ts
│   ├── BattleMatchmaker.ts
│   └── BattleTankManager.ts
├── components/
│   ├── BattleFish.ts
│   ├── FishDeploymentPanel.ts
│   └── OpponentTankView.ts
├── systems/
│   ├── CombatManager.ts
│   ├── BattleAI.ts
│   └── VictoryConditions.ts
├── ui/
│   ├── BattleHUD.ts
│   ├── VictoryScreen.ts
│   ├── MatchSummary.ts
│   ├── RewardDistribution.ts
│   └── BattleEffects.ts
└── data/
    ├── BattleFishData.ts
    ├── BattleConfig.ts
    └── RewardConfig.ts
```

## User Experience Flow

### 1. Pre-Battle

1. Player clicks "Battle" button on main menu
2. Matchmaking screen appears with "Searching..." indicator
3. Opponent found, both players see "Battle Starting..." countdown
4. Transition to battle scene

### 2. Battle Phase

1. Players see split-screen with their tank (left) and opponent's tank (right)
2. Fish deployment panel shows available fish with drag handles
3. Players drag fish to top of their tank to deploy them
4. Deployed fish begin combat behaviors automatically
5. Real-time score tracking shows fish eliminated
6. Battle continues until victory condition met

### 3. Post-Battle

1. Victory/defeat screen displays results
2. **Match Summary**: Detailed breakdown of battle performance
   - Fish deployed by each player
   - Attacker fish lost (permanently removed)
   - Defender fish survived/lost
   - Battle duration and key moments
3. **Reward Distribution**:
   - Winner receives lottery tickets based on performance
   - Loser receives consolation lottery tickets
   - Bonus tickets for achievements (first kill, survival streaks, etc.)
4. **Collection Updates**:
   - Dead attacker fish permanently removed from player inventory
   - Surviving fish returned to collection
5. **Match Recording**: Battle results and history saved to Firebase
6. Option to return to main menu or battle again

## Balancing Considerations

### Fish Combat Balance

- **Attack Fish**: High damage, medium HP, fast movement
- **Defense Fish**: Medium damage, high HP, slower but persistent
- **Cost vs Power**: More powerful fish should be rarer/more expensive

### Deployment Balance

- **Cooldown Timers**: Prevent overwhelming with fast deployment
- **Resource Limits**: Limited by actual fish collection
- **Strategic Depth**: Encourage mixed deployment strategies
- **Risk vs Reward**: Attacker fish provide high damage but permanent loss risk
- **Safe Defense**: Defender fish are safer but limited to own territory

### Victory Balance

- **50% Threshold**: Prevents quick elimination victories
- **Multiple Win Paths**: Different strategies can succeed
- **Comeback Potential**: Losing player can still recover

## Future Enhancements

### Ranked System

- ELO-based matchmaking
- Seasonal rankings and rewards
- Battle history and statistics

### Advanced Features

- Spectator mode for ongoing battles
- Tournament brackets for multiple players
- Clan battles and team modes
- Fish abilities and special attacks

### Customization

- Battle arena themes and environments
- Custom battle rules and modifiers
- Fish equipment and upgrade systems

## Technical Notes

### Performance Considerations

- Optimize fish AI for multiple simultaneous battles
- Efficient collision detection for combat
- Network optimization for real-time synchronization

### Security Measures

- Server-side validation of battle results
- Anti-cheat detection for fish deployment
- Rate limiting for deployment actions

### Firebase Integration

- **Battle State**: NOT synchronized during battle (local only)
- **Match Recording**: Only records final results and history after battle completion
- **Player Collections**: Updated post-battle to remove dead attacker fish
- **Reward Distribution**: Lottery tickets added to player accounts
- **Match History**: Comprehensive battle logs for statistics and replays
- **Leaderboards**: Win/loss records and ranking systems

---

_This document serves as the comprehensive specification for the Fish Tank Battle Mode feature. All implementation should follow these guidelines while maintaining consistency with the existing codebase architecture._

/**
 * Battle Configuration
 * Central configuration for battle mode settings
 */
export interface BattleConfig {
    // Victory Conditions
    eliminationThreshold: number;     // Percentage of fish to eliminate for victory (0.5 = 50%)
    battleTimeLimit: number;          // Time limit in seconds (0 = no limit)

    // Deployment Rules
    deploymentCooldown: number;       // Seconds between deployments
    maxDeployments: number;           // Maximum fish that can be deployed total
    deploymentZoneHeight: number;     // Height of deployment zone at top of tank

    // Combat Mechanics
    damageTickRate: number;           // How often damage is applied (per second)
    chaseDistance: number;            // How close fish need to be to start chasing
    attackDistance: number;           // How close fish need to be to deal damage
    retreatDistance: number;          // Distance defenders retreat when losing

    // AI Behavior
    attackerSeekRange: number;        // Range attackers look for targets
    defenderPatrolRange: number;      // Range defenders patrol around spawn
    neutralFleeRange: number;         // Range neutral fish flee from combat

    // Rewards
    victoryLotteryTickets: number;    // Base tickets for winning
    defeatLotteryTickets: number;     // Consolation tickets for losing
    perfectVictoryBonus: number;      // Bonus for winning with no losses
    achievementBonus: number;         // Bonus per achievement earned

    // Performance
    maxFishPerPlayer: number;         // Maximum fish each player can have
    updateFrequency: number;          // AI update frequency (Hz)
}

/**
 * Default Battle Configuration
 */
export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
    // Victory Conditions
    eliminationThreshold: 0.5,        // 50% elimination for victory
    battleTimeLimit: 300,             // 5 minutes max

    // Deployment Rules
    deploymentCooldown: 2.0,          // 2 seconds between deployments
    maxDeployments: 15,               // Max 15 fish total
    deploymentZoneHeight: 50,         // 50 pixels at top

    // Combat Mechanics
    damageTickRate: 1.0,              // Damage every second
    chaseDistance: 120,               // Start chasing at 120 pixels
    attackDistance: 30,               // Deal damage at 30 pixels
    retreatDistance: 80,              // Retreat at 80 pixels

    // AI Behavior
    attackerSeekRange: 200,           // Attackers seek in 200 pixel radius
    defenderPatrolRange: 150,         // Defenders patrol 150 pixel radius
    neutralFleeRange: 100,            // Neutrals flee within 100 pixels

    // Rewards
    victoryLotteryTickets: 5,         // 5 tickets for winning
    defeatLotteryTickets: 2,          // 2 tickets for losing
    perfectVictoryBonus: 3,           // +3 tickets for perfect victory
    achievementBonus: 1,              // +1 ticket per achievement

    // Performance
    maxFishPerPlayer: 20,             // 20 fish max per player
    updateFrequency: 30               // 30 Hz AI updates
};

/**
 * Reward Configuration
 */
export interface RewardConfig {
    // Lottery Ticket Rewards
    baseVictoryTickets: number;
    baseDefeatTickets: number;

    // Achievement Multipliers
    firstBloodBonus: number;
    survivalStreakBonus: number;
    underdogVictoryBonus: number;
    perfectVictoryBonus: number;

    // Performance Bonuses
    quickVictoryTimeThreshold: number;  // Seconds for "quick victory"
    quickVictoryBonus: number;

    // Fish Loss Penalties (for attackers)
    fishLossPenalty: number;           // Lottery tickets lost per fish
}

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
    baseVictoryTickets: 5,
    baseDefeatTickets: 2,

    firstBloodBonus: 1,
    survivalStreakBonus: 2,
    underdogVictoryBonus: 3,
    perfectVictoryBonus: 3,

    quickVictoryTimeThreshold: 60,     // Under 1 minute
    quickVictoryBonus: 2,

    fishLossPenalty: 0                 // No penalty for now (fish loss is penalty enough)
};

/**
 * Battle Achievements
 */
export enum BattleAchievement {
    FIRST_BLOOD = "first_blood",
    SURVIVAL_STREAK = "survival_streak",
    UNDERDOG_VICTORY = "underdog_victory",
    PERFECT_VICTORY = "perfect_victory",
    QUICK_VICTORY = "quick_victory",
    DEFENDER_SUPREME = "defender_supreme",
    ATTACKER_ELITE = "attacker_elite"
}

export const ACHIEVEMENT_DESCRIPTIONS = {
    [BattleAchievement.FIRST_BLOOD]: "First fish elimination in battle",
    [BattleAchievement.SURVIVAL_STREAK]: "Keep all fish alive for 2+ minutes",
    [BattleAchievement.UNDERDOG_VICTORY]: "Win when opponent had more fish",
    [BattleAchievement.PERFECT_VICTORY]: "Win without losing any attacker fish",
    [BattleAchievement.QUICK_VICTORY]: "Win in under 60 seconds",
    [BattleAchievement.DEFENDER_SUPREME]: "Win using only defender fish",
    [BattleAchievement.ATTACKER_ELITE]: "Win using only attacker fish"
};

/**
 * Battle Configuration Constants
 * Use this for importing configuration values
 */
export const BattleConfig = {
    // Victory Conditions
    ELIMINATION_THRESHOLD: 0.5,
    BATTLE_TIME_LIMIT: 300,

    // Deployment Rules
    DEPLOYMENT_TIME: 30,
    DEPLOYMENT_COOLDOWN: 2.0,
    MAX_DEPLOYMENTS: 15,
    DEPLOYMENT_ZONE_HEIGHT: 50,

    // Combat Mechanics
    COMBAT_UPDATE_INTERVAL: 1.0 / 30.0, // 30 FPS
    DAMAGE_TICK_RATE: 1.0,
    CHASE_DISTANCE: 120,
    ATTACK_DISTANCE: 30,
    RETREAT_DISTANCE: 80,
    // AI Behavior
    ATTACKER_SEEK_RANGE: 200,
    DEFENDER_PATROL_RANGE: 150,
    NEUTRAL_FLEE_RANGE: 100,
    DEFENDER_TERRITORY_RADIUS: 150,
    FLEE_DISTANCE: 100,
    VICTORY_FISH_ELIMINATION_THRESHOLD: 0.7,

    // Rewards
    VICTORY_LOTTERY_TICKETS: 5,
    DEFEAT_LOTTERY_TICKETS: 2,
    PERFECT_VICTORY_BONUS: 3,
    ACHIEVEMENT_BONUS: 1,

    // Performance
    MAX_FISH_PER_PLAYER: 20,
    UPDATE_FREQUENCY: 30,
    MAX_COMBAT_EVENTS: 100,
    // Reward Configuration
    REWARDS: {
        FORFEIT_TICKETS: 1,
        BASE_VICTORY_TICKETS: 5,
        BASE_DEFEAT_TICKETS: 2,
        WIN_TICKETS: 5, // Alias for BASE_VICTORY_TICKETS
        LOSS_TICKETS: 2, // Alias for BASE_DEFEAT_TICKETS
        KILL_BONUS_TICKETS: 1, // Tickets per kill
        DECISIVE_WIN_BONUS: 3, // Bonus for decisive victory
        FIRST_BLOOD_BONUS: 1,
        SURVIVAL_STREAK_BONUS: 2,
        UNDERDOG_VICTORY_BONUS: 3,
        QUICK_VICTORY_TIME_THRESHOLD: 60,
        QUICK_VICTORY_BONUS: 2,
        FISH_LOSS_PENALTY: 0
    },

    // Achievements configuration
    ACHIEVEMENTS: {
        QUICK_VICTORY_TIME: 60, // Seconds for quick victory
        FISH_SLAYER_KILLS: 10, // Kills needed for fish slayer
        DAMAGE_DEALER_THRESHOLD: 500 // Damage needed for damage dealer
    }
} as const;

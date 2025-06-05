import { _decorator, Vec3 } from 'cc';
import { Fish } from '../../FishData';

const { ccclass } = _decorator;

/**
 * Battle Fish State (Local Only)
 * Tracks fish state during battle without syncing to Firebase
 */
export interface IBattleFish {
    originalData: Fish;
    currentHP: number;           // Local HP tracking during battle
    role: 'attacker' | 'defender' | 'neutral';
    owner: 'player' | 'opponent';
    isAlive: boolean; position: Vec3;
    target?: IBattleFish;         // Current attack/chase target
    fishId: string;              // Unique instance ID for this battle
    nodeId?: string;             // Reference to the actual fish node
}

/**
 * Battle Result Data Structure
 */
export interface BattleResult {
    winner: 'player' | 'opponent';
    playerFishLost: string[];        // IDs of permanently lost attacker fish
    opponentFishLost: string[];      // Opponent's lost fish
    battleDuration: number;
    totalDamageDealt: number;
    achievementsEarned: string[];
    lotteryTicketsEarned: number;
}

/**
 * Match History Database Structure
 */
export interface MatchRecord {
    matchId: string;
    timestamp: number;
    players: {
        player1: PlayerMatchData;
        player2: PlayerMatchData;
    };
    result: BattleResult;
    replayData?: CompressedBattleData;  // Optional for replays
}

export interface PlayerMatchData {
    playerId: string;
    fishDeployed: DeployedFishRecord[];
    fishLost: string[];
    damageDealt: number;
    damageReceived: number;
    achievements: string[];
}

export interface DeployedFishRecord {
    fishType: string;
    deployTime: number;
    role: 'attacker' | 'defender';
    survived: boolean;
}

export interface CompressedBattleData {
    // Optional: Battle replay data for future replay system
    events: BattleEvent[];
}

export interface BattleEvent {
    timestamp: number;
    type: 'deploy' | 'attack' | 'death' | 'victory';
    data: any;
}

/**
 * Battle Fish Factory - Creates battle fish from regular fish data
 */
export class BattleFishFactory {
    static createBattleFish(
        fishData: Fish,
        owner: 'player' | 'opponent',
        position: Vec3,
        fishId: string
    ): IBattleFish {
        let role: 'attacker' | 'defender' | 'neutral' = 'neutral';
        let currentHP = fishData.health;

        // Determine role based on fish stats
        if (fishData.attackHP && fishData.attackHP > 0) {
            role = 'attacker';
            currentHP = fishData.attackHP;
        } else if (fishData.defenseHP && fishData.defenseHP > 0) {
            role = 'defender';
            currentHP = fishData.defenseHP;
        }

        return {
            originalData: fishData,
            currentHP,
            role,
            owner,
            isAlive: true,
            position: position.clone(),
            fishId,
            target: undefined
        };
    }

    static getBattleStats(fish: Fish): {
        hp: number;
        damage: number;
        speed: number;
        range: number;
        role: 'attacker' | 'defender' | 'neutral';
    } {
        if (fish.attackHP && fish.attackHP > 0) {
            return {
                hp: fish.attackHP,
                damage: fish.attackDamage || 20,
                speed: fish.attackSpeed || 60,
                range: fish.attackRange || 100,
                role: 'attacker'
            };
        } else if (fish.defenseHP && fish.defenseHP > 0) {
            return {
                hp: fish.defenseHP,
                damage: fish.attackDamage || 15,
                speed: fish.attackSpeed || 50,
                range: fish.attackRange || 90,
                role: 'defender'
            };
        }

        return {
            hp: fish.health,
            damage: 10,
            speed: 40,
            range: 60,
            role: 'neutral'
        };
    }
}

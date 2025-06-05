import { _decorator, Component, EventHandler } from 'cc';
import { CombatManager } from './CombatManager';
import { BattleResult } from '../data/BattleFishData';
import { BattleConfig } from '../data/BattleConfig';

const { ccclass } = _decorator;

export interface VictoryEvent {
    winner: 'player' | 'opponent';
    reason: 'fish_elimination' | 'time_limit' | 'forfeit';
    timestamp: number;
}

@ccclass('VictoryConditions')
export class VictoryConditions extends Component {
    private onVictoryCallback: ((result: BattleResult) => void) | null = null;

    private combatManager: CombatManager = null!;
    private battleStartTime: number = 0;
    private isTracking: boolean = false;
    private checkInterval: number = 1000; // Check every second

    public setOnVictoryCallback(callback: (result: BattleResult) => void): void {
        this.onVictoryCallback = callback;
    }

    public setCombatManager(combatManager: CombatManager): void {
        this.combatManager = combatManager;
    }

    public initializeBattle(): void {
        this.isTracking = false;
        this.battleStartTime = 0;
    }

    public startTracking(): void {
        this.isTracking = true;
        this.battleStartTime = Date.now();

        // Start checking victory conditions
        this.schedule(this.checkVictoryConditions, this.checkInterval / 1000);

        console.log('Victory condition tracking started');
    }

    public stopTracking(): void {
        this.isTracking = false;
        this.unschedule(this.checkVictoryConditions);

        console.log('Victory condition tracking stopped');
    }

    private checkVictoryConditions(): void {
        if (!this.isTracking || !this.combatManager) {
            return;
        }

        // Check time limit
        const battleDuration = Date.now() - this.battleStartTime;
        if (battleDuration >= BattleConfig.BATTLE_TIME_LIMIT) {
            this.handleTimeLimit();
            return;
        }

        // Check fish elimination victory
        const fishEliminationResult = this.checkFishEliminationVictory();
        if (fishEliminationResult) {
            this.handleVictory(fishEliminationResult);
            return;
        }

        // Check survival rate victory (alternative win condition)
        const survivalResult = this.checkSurvivalVictory();
        if (survivalResult) {
            this.handleVictory(survivalResult);
            return;
        }
    }

    private checkFishEliminationVictory(): BattleResult | null {
        const playerSurvivalRate = this.combatManager.getPlayerSurvivalRate();
        const opponentSurvivalRate = this.combatManager.getOpponentSurvivalRate();

        // Victory condition: eliminate over 50% of enemy fish
        const playerEliminationRate = 1 - opponentSurvivalRate;
        const opponentEliminationRate = 1 - playerSurvivalRate;

        if (playerEliminationRate > BattleConfig.VICTORY_FISH_ELIMINATION_THRESHOLD) {
            return this.createBattleResult('player', 'fish_elimination');
        }

        if (opponentEliminationRate > BattleConfig.VICTORY_FISH_ELIMINATION_THRESHOLD) {
            return this.createBattleResult('opponent', 'fish_elimination');
        }

        return null;
    }

    private checkSurvivalVictory(): BattleResult | null {
        const playerSurvivalRate = this.combatManager.getPlayerSurvivalRate();
        const opponentSurvivalRate = this.combatManager.getOpponentSurvivalRate();

        // Check if one side has been completely eliminated
        if (playerSurvivalRate === 0 && opponentSurvivalRate > 0) {
            return this.createBattleResult('opponent', 'fish_elimination');
        }

        if (opponentSurvivalRate === 0 && playerSurvivalRate > 0) {
            return this.createBattleResult('player', 'fish_elimination');
        }

        return null;
    }

    private handleTimeLimit(): void {
        // Determine winner based on survival rates and damage
        const playerSurvivalRate = this.combatManager.getPlayerSurvivalRate();
        const opponentSurvivalRate = this.combatManager.getOpponentSurvivalRate();
        const playerDamageDealt = this.combatManager.getPlayerDamageDealt();
        const opponentDamageDealt = this.combatManager.getOpponentDamageDealt();

        let winner: 'player' | 'opponent';

        // Primary tiebreaker: survival rate
        if (playerSurvivalRate > opponentSurvivalRate) {
            winner = 'player';
        } else if (opponentSurvivalRate > playerSurvivalRate) {
            winner = 'opponent';
        } else {
            // Secondary tiebreaker: damage dealt
            winner = playerDamageDealt > opponentDamageDealt ? 'player' : 'opponent';
        }

        const result = this.createBattleResult(winner, 'time_limit');
        this.handleVictory(result);
    }

    private handleVictory(battleResult: BattleResult): void {
        this.stopTracking();

        // Emit victory event
        const victoryEvent: VictoryEvent = {
            winner: battleResult.winner,
            reason: this.getVictoryReason(battleResult),
            timestamp: Date.now()
        }; console.log('Victory detected:', victoryEvent);

        // Trigger victory callbacks
        if (this.onVictoryCallback) {
            this.onVictoryCallback(battleResult);
        }
    }

    private createBattleResult(winner: 'player' | 'opponent', reason: string): BattleResult {
        const battleDuration = Date.now() - this.battleStartTime;
        const playerKills = this.combatManager.getPlayerKillCount();
        const opponentKills = this.combatManager.getOpponentKillCount();

        // Calculate fish losses
        const playerFishLost = this.getPlayerFishLost();
        const opponentFishLost = this.getOpponentFishLost();

        // Calculate lottery tickets based on performance
        const lotteryTickets = this.calculateLotteryTickets(winner, reason, playerKills, opponentKills);

        // Check for achievements
        const achievements = this.checkAchievements(winner, battleDuration, playerKills, opponentKills);

        return {
            winner: winner,
            playerFishLost: playerFishLost,
            opponentFishLost: opponentFishLost,
            battleDuration: battleDuration,
            totalDamageDealt: this.combatManager.getPlayerDamageDealt(),
            achievementsEarned: achievements,
            lotteryTicketsEarned: lotteryTickets
        };
    }

    private getPlayerFishLost(): string[] {
        // Get dead player fish IDs
        const allPlayerFish = this.combatManager.getPlayerDamageDealt(); // TODO: Get proper fish data
        // This would need to be implemented in CombatManager to track lost fish IDs
        return []; // Placeholder
    }

    private getOpponentFishLost(): string[] {
        // Get dead opponent fish IDs
        return []; // Placeholder
    }

    private calculateLotteryTickets(winner: 'player' | 'opponent', reason: string, playerKills: number, opponentKills: number): number {
        let baseTickets = winner === 'player' ? BattleConfig.REWARDS.WIN_TICKETS : BattleConfig.REWARDS.LOSS_TICKETS;

        // Bonus tickets for performance
        if (winner === 'player') {
            baseTickets += Math.floor(playerKills * BattleConfig.REWARDS.KILL_BONUS_TICKETS);

            // Bonus for decisive victory
            if (reason === 'fish_elimination') {
                baseTickets += BattleConfig.REWARDS.DECISIVE_WIN_BONUS;
            }
        }

        return Math.max(1, baseTickets); // Minimum 1 ticket
    }

    private checkAchievements(winner: 'player' | 'opponent', duration: number, playerKills: number, opponentKills: number): string[] {
        const achievements: string[] = [];

        if (winner !== 'player') {
            return achievements;
        }

        // Quick Victory achievement
        if (duration < BattleConfig.ACHIEVEMENTS.QUICK_VICTORY_TIME) {
            achievements.push('quick_victory');
        }

        // Perfect Victory achievement
        if (this.combatManager.getPlayerSurvivalRate() === 1.0) {
            achievements.push('perfect_victory');
        }

        // Fish Slayer achievement
        if (playerKills >= BattleConfig.ACHIEVEMENTS.FISH_SLAYER_KILLS) {
            achievements.push('fish_slayer');
        }

        // Damage Dealer achievement
        if (this.combatManager.getPlayerDamageDealt() >= BattleConfig.ACHIEVEMENTS.DAMAGE_DEALER_THRESHOLD) {
            achievements.push('damage_dealer');
        }

        // First Blood achievement
        const firstKill = this.combatManager.getCombatEvents().find(event =>
            event.type === 'death' && this.isPlayerAttacker(event.attacker!)
        );
        if (firstKill && this.combatManager.getCombatEvents().indexOf(firstKill) === 0) {
            achievements.push('first_blood');
        }

        return achievements;
    }

    private isPlayerAttacker(attacker: any): boolean {
        // TODO: Implement proper player fish detection
        return true; // Placeholder
    }

    private getVictoryReason(battleResult: BattleResult): 'fish_elimination' | 'time_limit' | 'forfeit' {
        // Determine reason based on battle conditions
        const battleDuration = battleResult.battleDuration;

        if (battleDuration >= BattleConfig.BATTLE_TIME_LIMIT) {
            return 'time_limit';
        }

        return 'fish_elimination';
    }

    public reset(): void {
        this.stopTracking();
        this.battleStartTime = 0;
    }

    // Utility methods for UI display
    public getBattleTimeRemaining(): number {
        if (!this.isTracking) {
            return BattleConfig.BATTLE_TIME_LIMIT;
        }

        const elapsed = Date.now() - this.battleStartTime;
        return Math.max(0, BattleConfig.BATTLE_TIME_LIMIT - elapsed);
    }

    public getBattleProgress(): number {
        if (!this.isTracking) {
            return 0;
        }

        const elapsed = Date.now() - this.battleStartTime;
        return Math.min(1, elapsed / BattleConfig.BATTLE_TIME_LIMIT);
    }

    public getPlayerEliminationProgress(): number {
        if (!this.combatManager) {
            return 0;
        }

        const opponentSurvivalRate = this.combatManager.getOpponentSurvivalRate();
        const eliminationRate = 1 - opponentSurvivalRate;

        return Math.min(1, eliminationRate / BattleConfig.VICTORY_FISH_ELIMINATION_THRESHOLD);
    }

    public getOpponentEliminationProgress(): number {
        if (!this.combatManager) {
            return 0;
        }

        const playerSurvivalRate = this.combatManager.getPlayerSurvivalRate();
        const eliminationRate = 1 - playerSurvivalRate;

        return Math.min(1, eliminationRate / BattleConfig.VICTORY_FISH_ELIMINATION_THRESHOLD);
    }

    public isVictoryClose(): boolean {
        const playerProgress = this.getPlayerEliminationProgress();
        const opponentProgress = this.getOpponentEliminationProgress();
        const timeProgress = this.getBattleProgress();

        return playerProgress > 0.8 || opponentProgress > 0.8 || timeProgress > 0.9;
    }
}

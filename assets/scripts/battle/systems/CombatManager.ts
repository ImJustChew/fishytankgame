import { _decorator, Component, Vec3 } from 'cc';
import { BattleTankManager } from '../managers/BattleTankManager';
import { BattleFish } from '../components/BattleFish';
import { BattleConfig } from '../data/BattleConfig';

const { ccclass } = _decorator;

export interface CombatEvent {
    type: 'attack' | 'death' | 'damage';
    attacker: BattleFish;
    target?: BattleFish;
    damage?: number;
    timestamp: number;
}

@ccclass('CombatManager')
export class CombatManager extends Component {
    private battleTankManager: BattleTankManager = null!;
    private combatActive: boolean = false;
    private combatEvents: CombatEvent[] = [];
    private playerDamageDealt: number = 0;
    private playerDamageReceived: number = 0;
    private opponentDamageDealt: number = 0;
    private opponentDamageReceived: number = 0;

    public setBattleTankManager(battleTank: BattleTankManager): void {
        this.battleTankManager = battleTank;
    }

    public initializeBattle(): void {
        this.combatActive = false;
        this.combatEvents = [];
        this.resetDamageCounters();
    } public startCombat(): void {
        this.combatActive = true;

        // Start battle for the tank
        this.battleTankManager.startBattle();

        // Begin combat updates
        this.schedule(this.updateCombat, BattleConfig.COMBAT_UPDATE_INTERVAL);

        console.log('Combat started');
    }

    public stopCombat(): void {
        this.combatActive = false;

        // Stop battle for the tank
        this.battleTankManager.stopBattle();

        // Stop combat updates
        this.unschedule(this.updateCombat);

        console.log('Combat stopped');
    } private updateCombat(): void {
        if (!this.combatActive) {
            return;
        }

        // Get all fish from the tank, separated by owner
        const allFish = this.battleTankManager.getAllBattleFish();
        const playerFish = allFish.filter(fish => fish.getOwner() === 'player');
        const opponentFish = allFish.filter(fish => fish.getOwner() === 'opponent');

        // Update each fish's enemy and ally lists
        this.updateFishTargetLists(playerFish, opponentFish);

        // Process player fish actions
        this.processFishActions(playerFish, opponentFish, true);

        // Process opponent fish actions
        this.processFishActions(opponentFish, playerFish, false);

        // Clean up dead fish
        this.cleanupDeadFish();
    }

    /**
     * Update each fish's list of allies and enemies
     * This ensures fish only target fish from the opposing player
     */
    private updateFishTargetLists(playerFish: BattleFish[], opponentFish: BattleFish[]): void {
        // For player fish, opponents are enemies and other player fish are allies
        playerFish.forEach(fish => {
            fish.setEnemyAndAllyFish(opponentFish, playerFish.filter(f => f !== fish));
        });

        // For opponent fish, player fish are enemies and other opponent fish are allies
        opponentFish.forEach(fish => {
            fish.setEnemyAndAllyFish(playerFish, opponentFish.filter(f => f !== fish));
        });
    }

    private processFishActions(allyFish: BattleFish[], enemyFish: BattleFish[], isPlayerFish: boolean): void {
        allyFish.forEach(fish => {
            if (!fish.isAlive()) {
                return;
            }            // Update fish AI and movement
            fish.updateBattleAI();

            // Check for attacks
            this.processAttacks(fish, enemyFish, isPlayerFish);
        });
    }

    private processAttacks(attacker: BattleFish, potentialTargets: BattleFish[], isPlayerAttacker: boolean): void {
        const target = this.findValidTarget(attacker, potentialTargets);

        if (!target) {
            return;
        }

        // Check if attack is possible
        if (!this.canAttack(attacker, target)) {
            return;
        }

        // Execute attack
        const damage = this.calculateDamage(attacker, target);
        const attackSuccess = this.executeAttack(attacker, target, damage);

        if (attackSuccess) {
            // Record combat event
            this.recordCombatEvent({
                type: 'attack',
                attacker: attacker,
                target: target,
                damage: damage,
                timestamp: Date.now()
            });

            // Update damage counters
            if (isPlayerAttacker) {
                this.playerDamageDealt += damage;
                this.opponentDamageReceived += damage;
            } else {
                this.opponentDamageDealt += damage;
                this.playerDamageReceived += damage;
            }

            // Check if target died
            if (!target.isAlive()) {
                this.recordCombatEvent({
                    type: 'death',
                    attacker: attacker,
                    target: target,
                    timestamp: Date.now()
                });
            }
        }
    } private findValidTarget(attacker: BattleFish, potentialTargets: BattleFish[]): BattleFish | null {
        const attackerPos = attacker.node.getPosition();
        const attackRange = attacker.getAttackRange();

        let closestTarget: BattleFish | null = null;
        let closestDistance = Infinity;

        potentialTargets.forEach(target => {
            if (!target.isAlive()) {
                return;
            }

            // First do a quick distance check to avoid unnecessary hitbox calculations
            const distance = Vec3.distance(attackerPos, target.node.getPosition());

            // Only consider targets within the attack range
            if (distance <= attackRange && distance < closestDistance) {
                // Use the new isTargetInAttackRange method for a more accurate check
                if (attacker.isTargetInAttackRange(target)) {
                    closestTarget = target;
                    closestDistance = distance;
                }
            }
        });

        return closestTarget;
    }

    private canAttack(attacker: BattleFish, target: BattleFish): boolean {
        // Check cooldown
        if (!attacker.canAttack()) {
            return false;
        }

        // Check if target is alive
        if (!target.isAlive()) {
            return false;
        }

        // Use the more accurate isTargetInAttackRange method instead of simple distance check
        return attacker.isTargetInAttackRange(target);
    }

    private calculateDamage(attacker: BattleFish, target: BattleFish): number {
        const baseDamage = attacker.getAttackDamage();
        const targetDefense = target.getDefenseValue();

        // Apply damage formula with some randomness
        const randomFactor = 0.8 + Math.random() * 0.4; // 80% - 120%
        const damage = Math.max(1, Math.floor((baseDamage - targetDefense * 0.5) * randomFactor));

        return damage;
    } private executeAttack(attacker: BattleFish, target: BattleFish, damage: number): boolean {
        // Trigger attack animation/effects
        attacker.performAttack(target);

        // Apply damage to target
        const fishDied = target.takeDamage(damage);

        // Record damage event
        this.recordCombatEvent({
            type: 'damage',
            attacker: attacker,
            target: target,
            damage: damage,
            timestamp: Date.now()
        });

        return damage > 0;
    } private cleanupDeadFish(): void {
        // Remove dead fish from the battle tank
        const allFish = this.battleTankManager.getAllBattleFish();
        const deadFish = allFish.filter(fish => !fish.isAlive());

        deadFish.forEach(fish => {
            this.battleTankManager.removeFish(fish.getInstanceId());
        });
    }

    private recordCombatEvent(event: CombatEvent): void {
        this.combatEvents.push(event);

        // Limit event history to prevent memory issues
        if (this.combatEvents.length > BattleConfig.MAX_COMBAT_EVENTS) {
            this.combatEvents.shift();
        }
    } public getPlayerFishInRange(position: Vec3, range: number): BattleFish[] {
        return this.battleTankManager.getFishInArea(position, range)
            .filter(fish => fish.getOwner() === 'player');
    }

    public getOpponentFishInRange(position: Vec3, range: number): BattleFish[] {
        return this.battleTankManager.getFishInArea(position, range)
            .filter(fish => fish.getOwner() === 'opponent');
    }

    public getPlayerDamageDealt(): number {
        return this.playerDamageDealt;
    }

    public getPlayerDamageReceived(): number {
        return this.playerDamageReceived;
    }

    public getOpponentDamageDealt(): number {
        return this.opponentDamageDealt;
    }

    public getOpponentDamageReceived(): number {
        return this.opponentDamageReceived;
    }

    public getCombatEvents(): CombatEvent[] {
        return [...this.combatEvents];
    }

    public getRecentEvents(timeWindow: number = 5000): CombatEvent[] {
        const cutoffTime = Date.now() - timeWindow;
        return this.combatEvents.filter(event => event.timestamp >= cutoffTime);
    }

    public reset(): void {
        this.stopCombat();
        this.combatEvents = [];
        this.resetDamageCounters();
    }

    private resetDamageCounters(): void {
        this.playerDamageDealt = 0;
        this.playerDamageReceived = 0;
        this.opponentDamageDealt = 0;
        this.opponentDamageReceived = 0;
    }

    public isCombatActive(): boolean {
        return this.combatActive;
    }

    // Utility methods for battle analysis
    public getPlayerKillCount(): number {
        return this.combatEvents.filter(event =>
            event.type === 'death' &&
            this.isPlayerFish(event.attacker!)
        ).length;
    }

    public getOpponentKillCount(): number {
        return this.combatEvents.filter(event =>
            event.type === 'death' &&
            !this.isPlayerFish(event.attacker!)
        ).length;
    } private isPlayerFish(fish: BattleFish): boolean {
        return fish.getOwner() === 'player';
    }

    public getPlayerSurvivalRate(): number {
        const playerRecords = this.battleTankManager.getPlayerMatchDeployedFishRecords();
        const alivePlayerFish = this.battleTankManager.getAllBattleFish()
            .filter(fish => fish.getOwner() === 'player' && fish.isAlive()).length;

        return playerRecords.length > 0 ? alivePlayerFish / playerRecords.length : 0;
    }

    public getOpponentSurvivalRate(): number {
        const opponentRecords = this.battleTankManager.getOpponentMatchDeployedFishRecords();
        const aliveOpponentFish = this.battleTankManager.getAllBattleFish()
            .filter(fish => fish.getOwner() === 'opponent' && fish.isAlive()).length;

        return opponentRecords.length > 0 ? aliveOpponentFish / opponentRecords.length : 0;
    }
}

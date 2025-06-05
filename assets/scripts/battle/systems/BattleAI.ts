import { _decorator, Component, Vec3 } from 'cc';
import { BattleFish } from '../components/BattleFish';
import { BattleConfig } from '../data/BattleConfig';

const { ccclass } = _decorator;

export enum AIState {
    IDLE = 'idle',
    PATROLLING = 'patrolling',
    CHASING = 'chasing',
    ATTACKING = 'attacking',
    FLEEING = 'fleeing',
    RETURNING = 'returning'
}

export interface AIDecision {
    action: 'move' | 'attack' | 'idle' | 'flee';
    target?: BattleFish;
    targetPosition?: Vec3;
    priority: number;
}

@ccclass('BattleAI')
export class BattleAI extends Component {
    private currentState: AIState = AIState.IDLE;
    private stateTimer: number = 0;
    private lastDecisionTime: number = 0;
    private decisionCooldown: number = 500; // ms between decisions

    public makeDecision(fish: BattleFish, enemies: BattleFish[], allies: BattleFish[]): AIDecision {
        const currentTime = Date.now();

        // Don't make decisions too frequently
        if (currentTime - this.lastDecisionTime < this.decisionCooldown) {
            return this.getIdleDecision();
        }

        this.lastDecisionTime = currentTime;
        this.stateTimer += currentTime - this.lastDecisionTime;

        // Get context information
        const context = this.analyzeContext(fish, enemies, allies);

        // Make role-based decision
        const decision = this.makeRoleBasedDecision(fish, context);

        // Update AI state based on decision
        this.updateState(decision);

        return decision;
    }

    private analyzeContext(fish: BattleFish, enemies: BattleFish[], allies: BattleFish[]): AIContext {
        const fishPos = fish.node.getPosition();
        const attackRange = fish.getAttackRange();
        const detectionRange = attackRange * 2;        // Find nearby enemies
        const nearbyEnemies = enemies.filter(enemy => {
            if (!enemy.isAlive()) return false;
            const distance = Vec3.distance(fishPos, enemy.node.getPosition());
            return distance <= detectionRange;
        });

        // Find enemies in attack range
        const enemiesInRange = nearbyEnemies.filter(enemy => {
            const distance = Vec3.distance(fishPos, enemy.node.getPosition());
            return distance <= attackRange;
        });

        // Find nearby allies
        const nearbyAllies = allies.filter(ally => {
            if (!ally.isAlive() || ally === fish) return false;
            const distance = Vec3.distance(fishPos, ally.node.getPosition());
            return distance <= detectionRange;
        });

        // Calculate threat level
        const threatLevel = this.calculateThreatLevel(fish, nearbyEnemies);

        // Calculate support level
        const supportLevel = this.calculateSupportLevel(fish, nearbyAllies);

        return {
            fish,
            nearbyEnemies,
            enemiesInRange,
            nearbyAllies,
            threatLevel,
            supportLevel,
            canAttack: fish.canAttack() && enemiesInRange.length > 0
        };
    }

    private calculateThreatLevel(fish: BattleFish, enemies: BattleFish[]): number {
        if (enemies.length === 0) return 0;

        let totalThreat = 0;
        const fishPos = fish.node.getPosition();

        enemies.forEach(enemy => {
            const distance = Vec3.distance(fishPos, enemy.node.getPosition());
            const enemyAttackPower = enemy.getAttackDamage();
            const proximityFactor = Math.max(0, 1 - distance / (enemy.getAttackRange() * 2));

            totalThreat += enemyAttackPower * proximityFactor;
        });

        return Math.min(1, totalThreat / (fish.getCurrentHP() * 2));
    }

    private calculateSupportLevel(fish: BattleFish, allies: BattleFish[]): number {
        if (allies.length === 0) return 0;

        let totalSupport = 0;
        const fishPos = fish.node.getPosition();

        allies.forEach(ally => {
            const distance = Vec3.distance(fishPos, ally.node.getPosition());
            const allyAttackPower = ally.getAttackDamage();
            const proximityFactor = Math.max(0, 1 - distance / 200); // Support range

            totalSupport += allyAttackPower * proximityFactor;
        });

        return Math.min(1, totalSupport / 100); // Normalize support level
    }

    private makeRoleBasedDecision(fish: BattleFish, context: AIContext): AIDecision {
        const role = fish.getBattleRole();

        switch (role) {
            case 'attacker':
                return this.makeAttackerDecision(fish, context);
            case 'defender':
                return this.makeDefenderDecision(fish, context);
            case 'neutral':
                return this.makeNeutralDecision(fish, context);
            default:
                return this.getIdleDecision();
        }
    }

    private makeAttackerDecision(fish: BattleFish, context: AIContext): AIDecision {
        // Attackers are aggressive and seek out enemies

        // If under heavy threat and no support, consider fleeing
        if (context.threatLevel > 0.7 && context.supportLevel < 0.3) {
            return this.makeFleeDecision(fish, context);
        }

        // If enemies in range and can attack, do it
        if (context.canAttack && context.enemiesInRange.length > 0) {
            const target = this.selectBestTarget(fish, context.enemiesInRange);
            return {
                action: 'attack',
                target: target,
                priority: 0.9
            };
        }

        // If enemies nearby but not in range, chase
        if (context.nearbyEnemies.length > 0) {
            const target = this.selectBestTarget(fish, context.nearbyEnemies);
            return {
                action: 'move',
                target: target,
                targetPosition: target.node.getPosition(),
                priority: 0.8
            };
        }

        // No enemies nearby, patrol for enemies
        return this.makePatrolDecision(fish);
    }

    private makeDefenderDecision(fish: BattleFish, context: AIContext): AIDecision {
        // Defenders protect territory and react to threats

        const homePosition = fish.getHomePosition();
        const currentPos = fish.node.getPosition();
        const distanceFromHome = Vec3.distance(currentPos, homePosition);

        // If enemies are attacking our territory, engage
        if (context.enemiesInRange.length > 0) {
            const target = this.selectBestTarget(fish, context.enemiesInRange);
            return {
                action: 'attack',
                target: target,
                priority: 0.9
            };
        }

        // If enemies nearby our territory, chase them away
        if (context.nearbyEnemies.length > 0) {
            const closestEnemy = this.findClosestFish(fish, context.nearbyEnemies);
            const enemyDistance = Vec3.distance(currentPos, closestEnemy.node.getPosition());
            const homeDistance = Vec3.distance(homePosition, closestEnemy.node.getPosition());

            // Only chase if enemy is close to our territory
            if (homeDistance <= BattleConfig.DEFENDER_TERRITORY_RADIUS) {
                return {
                    action: 'move',
                    target: closestEnemy,
                    targetPosition: closestEnemy.node.getPosition(),
                    priority: 0.7
                };
            }
        }

        // If too far from home, return
        if (distanceFromHome > BattleConfig.DEFENDER_TERRITORY_RADIUS) {
            return {
                action: 'move',
                targetPosition: homePosition,
                priority: 0.6
            };
        }

        // Patrol around home territory
        return this.makeTerritoryPatrolDecision(fish, homePosition);
    }

    private makeNeutralDecision(fish: BattleFish, context: AIContext): AIDecision {
        // Neutral fish avoid combat and flee from threats

        // If any enemies nearby, flee
        if (context.nearbyEnemies.length > 0) {
            return this.makeFleeDecision(fish, context);
        }

        // If threat level is high, find safer position
        if (context.threatLevel > 0.3) {
            return this.makeSafetySeekDecision(fish, context);
        }

        // Otherwise, wander peacefully
        return this.makeWanderDecision(fish);
    }

    private makeFleeDecision(fish: BattleFish, context: AIContext): AIDecision {
        const fishPos = fish.node.getPosition();
        const fleeDirection = this.calculateFleeDirection(fish, context.nearbyEnemies);
        const fleeDistance = BattleConfig.FLEE_DISTANCE;

        const fleePosition = fishPos.clone().add(fleeDirection.multiplyScalar(fleeDistance));

        return {
            action: 'move',
            targetPosition: fleePosition,
            priority: 1.0 // Highest priority
        };
    }

    private calculateFleeDirection(fish: BattleFish, enemies: BattleFish[]): Vec3 {
        const fishPos = fish.node.getPosition();
        let fleeDirection = new Vec3(0, 0, 0);

        // Calculate average enemy position
        enemies.forEach(enemy => {
            const enemyPos = enemy.node.getPosition();
            const directionFromEnemy = fishPos.clone().subtract(enemyPos).normalize();
            fleeDirection.add(directionFromEnemy);
        });

        return fleeDirection.normalize();
    }

    private selectBestTarget(fish: BattleFish, enemies: BattleFish[]): BattleFish {
        // Priority: weakest enemy first, then closest
        let bestTarget = enemies[0];
        let bestScore = this.calculateTargetScore(fish, bestTarget);

        enemies.forEach(enemy => {
            const score = this.calculateTargetScore(fish, enemy);
            if (score > bestScore) {
                bestScore = score;
                bestTarget = enemy;
            }
        });

        return bestTarget;
    }

    private calculateTargetScore(attacker: BattleFish, target: BattleFish): number {
        const distance = Vec3.distance(attacker.node.getPosition(), target.node.getPosition());
        const targetHP = target.getCurrentHP();
        const maxHP = target.getMaxHP();

        // Prefer closer, weaker targets
        const proximityScore = 1 - (distance / attacker.getAttackRange());
        const weaknessScore = 1 - (targetHP / maxHP);

        return proximityScore * 0.6 + weaknessScore * 0.4;
    }

    private findClosestFish(fish: BattleFish, targets: BattleFish[]): BattleFish {
        const fishPos = fish.node.getPosition();
        let closest = targets[0];
        let closestDistance = Vec3.distance(fishPos, closest.node.getPosition());

        targets.forEach(target => {
            const distance = Vec3.distance(fishPos, target.node.getPosition());
            if (distance < closestDistance) {
                closestDistance = distance;
                closest = target;
            }
        });

        return closest;
    }

    private makePatrolDecision(fish: BattleFish): AIDecision {
        const patrolPosition = this.generatePatrolPosition(fish);
        return {
            action: 'move',
            targetPosition: patrolPosition,
            priority: 0.3
        };
    }

    private makeTerritoryPatrolDecision(fish: BattleFish, homePosition: Vec3): AIDecision {
        const angle = Math.random() * Math.PI * 2;
        const radius = BattleConfig.DEFENDER_TERRITORY_RADIUS * 0.7;
        const patrolPos = new Vec3(
            homePosition.x + Math.cos(angle) * radius,
            homePosition.y + Math.sin(angle) * radius,
            0
        );

        return {
            action: 'move',
            targetPosition: patrolPos,
            priority: 0.4
        };
    }

    private makeSafetySeekDecision(fish: BattleFish, context: AIContext): AIDecision {
        // Find safest position (away from enemies, near allies)
        const safePosition = this.findSafestPosition(fish, context);
        return {
            action: 'move',
            targetPosition: safePosition,
            priority: 0.7
        };
    }

    private makeWanderDecision(fish: BattleFish): AIDecision {
        const wanderPosition = this.generateWanderPosition(fish);
        return {
            action: 'move',
            targetPosition: wanderPosition,
            priority: 0.2
        };
    }

    private generatePatrolPosition(fish: BattleFish): Vec3 {
        const currentPos = fish.node.getPosition();
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 100;

        return new Vec3(
            currentPos.x + Math.cos(angle) * distance,
            currentPos.y + Math.sin(angle) * distance,
            0
        );
    }

    private generateWanderPosition(fish: BattleFish): Vec3 {
        const currentPos = fish.node.getPosition();
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 50;

        return new Vec3(
            currentPos.x + Math.cos(angle) * distance,
            currentPos.y + Math.sin(angle) * distance,
            0
        );
    }

    private findSafestPosition(fish: BattleFish, context: AIContext): Vec3 {
        // Simple implementation - move away from enemies toward allies
        const fishPos = fish.node.getPosition();
        let safeDirection = new Vec3(0, 0, 0);

        // Move away from enemies
        context.nearbyEnemies.forEach(enemy => {
            const directionFromEnemy = fishPos.clone().subtract(enemy.node.getPosition()).normalize();
            safeDirection.add(directionFromEnemy);
        });

        // Move toward allies
        context.nearbyAllies.forEach(ally => {
            const directionToAlly = ally.node.getPosition().clone().subtract(fishPos).normalize();
            safeDirection.add(directionToAlly.multiplyScalar(0.5));
        });

        const safeDistance = 150;
        return fishPos.clone().add(safeDirection.normalize().multiplyScalar(safeDistance));
    }

    private getIdleDecision(): AIDecision {
        return {
            action: 'idle',
            priority: 0.1
        };
    }

    private updateState(decision: AIDecision): void {
        let newState = this.currentState;

        switch (decision.action) {
            case 'attack':
                newState = AIState.ATTACKING;
                break;
            case 'move':
                if (decision.target) {
                    newState = AIState.CHASING;
                } else {
                    newState = AIState.PATROLLING;
                }
                break;
            case 'flee':
                newState = AIState.FLEEING;
                break;
            case 'idle':
                newState = AIState.IDLE;
                break;
        }

        if (newState !== this.currentState) {
            this.currentState = newState;
            this.stateTimer = 0;
        }
    }

    public getCurrentState(): AIState {
        return this.currentState;
    }

    public getStateTimer(): number {
        return this.stateTimer;
    }
}

interface AIContext {
    fish: BattleFish;
    nearbyEnemies: BattleFish[];
    enemiesInRange: BattleFish[];
    nearbyAllies: BattleFish[];
    threatLevel: number;
    supportLevel: number;
    canAttack: boolean;
}

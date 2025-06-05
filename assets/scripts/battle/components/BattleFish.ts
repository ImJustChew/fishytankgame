import { _decorator, Component, Node, Vec3, tween, Tween, math, Sprite, Color, Graphics, AudioClip, AudioSource, UITransform } from 'cc';
import { Fish } from '../../Fish';
import { IBattleFish, BattleFishFactory } from '../data/BattleFishData';
import { BattleConfig } from '../data/BattleConfig';
import { Fish as FishData } from '../../FishData';
import { SavedFishType } from '../../firebase/database-service';

const { ccclass, property } = _decorator;

/**
 * BattleFish Component
 * Extends the regular Fish component with enhanced combat behaviors:
 * - Fish actively seek out their nearest enemies
 * - After attacking, fish retreat to set up for another attack
 * - Attack and death sounds provide audio feedback
 * - HP bars show current health status
 * - Enemy fish are marked with red dots
 */
@ccclass('BattleFish')
export class BattleFish extends Fish {

    @property
    battleHP: number = 100;

    @property
    battleDamage: number = 20;

    @property
    battleSpeed: number = 60;

    @property
    battleRange: number = 100;

    @property(AudioClip)
    attackSound: AudioClip | null = null;

    @property(AudioClip)
    deathSound: AudioClip | null = null;

    @property
    retreatDistance: number = 50; // Distance to retreat after attacking

    private battleData: IBattleFish | null = null;
    private battleTarget: BattleFish | null = null;
    private lastDamageTime: number = 0;
    private aiUpdateTimer: number = 0;
    private isInCombat: boolean = false;
    private deploymentTime: number = 0;
    private enemyFish: BattleFish[] = []; private allyFish: BattleFish[] = [];
    private audioSource: AudioSource | null = null;
    private isRetreating: boolean = false;

    // Battle-specific movement
    private combatTween: Tween<Node> | null = null;

    start() {
        super.start();
        this.deploymentTime = Date.now();

        // Initialize audio source component
        this.audioSource = this.getComponent(AudioSource) || this.addComponent(AudioSource);
    }    // Debug flag for hitbox visualization
    static showHitboxes: boolean = false;

    update(deltaTime: number) {
        if (!this.battleData) {
            super.update(deltaTime);
            return;
        }

        // Update AI behavior
        this.aiUpdateTimer += deltaTime;
        if (this.aiUpdateTimer >= 1.0 / BattleConfig.UPDATE_FREQUENCY && !this.isRetreating) {
            this.updateBattleAI();
            this.aiUpdateTimer = 0;
        }

        // Update combat - but only if not retreating
        if (!this.isRetreating) {
            this.updateCombat(deltaTime);
        }

        // Update HP bar visuals
        if (this.node['hpFillNode']) {
            this.updateHpBar();
        }

        // Draw hitbox for debugging if enabled
        if (BattleFish.showHitboxes) {
            this.debugDrawHitbox();
        }

        // Allow normal fish behavior when not actively in combat or moving
        // This ensures fish still swim naturally when idle
        if (!this.isInCombat && !this.combatTween && !this.isRetreating) {
            super.update(deltaTime);
        }
    }/**
     * Initialize fish for battle mode
     */    public initializeBattleFish(
        fishData: FishData,
        owner: 'player' | 'opponent',
        tankBounds: { min: Vec3, max: Vec3 },
        position: Vec3,
        fishId: string
    ) {
        console.log(`Initializing battle fish: ${fishData.id} (${owner}) at position ${position.toString()}`);

        // Set up battle data
        this.battleData = BattleFishFactory.createBattleFish(fishData, owner, position, fishId);

        // Set battle stats
        const stats = BattleFishFactory.getBattleStats(fishData);
        this.battleHP = stats.hp;
        this.battleDamage = stats.damage;
        this.battleSpeed = stats.speed;
        this.battleRange = stats.range;

        // Initialize base fish
        const savedFishData: SavedFishType = {
            id: fishId,
            ownerId: owner,
            type: fishData.id,
            health: fishData.health,
            lastFedTime: Date.now()
        };

        this.initializeFish(savedFishData, tankBounds);

        // Set position and ensure visibility
        this.node.setPosition(position);
        this.battleData.position = position.clone();

        // Store the fish ID as a property on the node for easier debugging
        this.node['_fishType'] = fishData.id;
        this.node['_fishId'] = fishId;
        this.node['_owner'] = owner;

        // Make sure the fish is visible and sized correctly
        const spriteComp = this.getComponent(Sprite);
        if (spriteComp) {
            spriteComp.color = new Color(255, 255, 255, 255); // Full opacity
        }

        // Ensure the fish is active
        this.node.active = true;

        console.log(`Initialized battle fish: ${fishData.name} (${this.battleData.role}) for ${owner}`);
    }

    /**
     * Update AI behavior based on fish role
     */
    public updateBattleAI() {
        if (!this.battleData || !this.battleData.isAlive) return;

        switch (this.battleData.role) {
            case 'attacker':
                this.updateAttackerAI();
                break;
            case 'defender':
                this.updateDefenderAI();
                break;
            case 'neutral':
                this.updateNeutralAI();
                break;
        }
    }

    /**
     * Set enemy and ally fish lists for AI
     */
    public setEnemyAndAllyFish(enemies: BattleFish[], allies: BattleFish[]) {
        this.enemyFish = enemies;
        this.allyFish = allies;
    }

    /**
     * Attacker AI: Seek and destroy enemy fish
     */
    private updateAttackerAI() {
        if (!this.battleData) return;

        // Find nearest enemy target
        const enemies = this.enemyFish.filter(fish => fish.isAlive());
        if (enemies.length === 0) return;

        // Select target (prefer weakest enemy)
        let target = enemies[0];
        let minHP = target.getCurrentHP();

        for (const enemy of enemies) {
            if (enemy.getCurrentHP() < minHP) {
                minHP = enemy.getCurrentHP();
                target = enemy;
            }
        }

        this.setBattleTarget(target);
    }

    /**
     * Defender AI: Protect territory and chase attackers
     */
    private updateDefenderAI() {
        if (!this.battleData) return;

        const currentPos = this.node.getPosition();

        // Find enemy attackers in our territory
        const enemyAttackers = this.enemyFish.filter(enemy =>
            enemy.getRole() === 'attacker' &&
            enemy.isAlive() &&
            Vec3.distance(currentPos, enemy.node.getPosition()) <= BattleConfig.DEFENDER_PATROL_RANGE
        );

        if (enemyAttackers.length > 0) {
            // Chase the nearest attacker
            let nearest = enemyAttackers[0];
            let minDistance = Vec3.distance(currentPos, nearest.node.getPosition());

            for (const attacker of enemyAttackers) {
                const distance = Vec3.distance(currentPos, attacker.node.getPosition());
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = attacker;
                }
            }

            this.setBattleTarget(nearest);
        } else {
            // Patrol behavior - move around spawn area
            this.patrolArea();
        }
    }    /**
     * Neutral AI: Flee from combat
     */
    private updateNeutralAI() {
        if (!this.battleData) return;

        const currentPos = this.node.getPosition();
        const nearbyEnemies = this.enemyFish.filter(enemy =>
            enemy.isAlive() &&
            Vec3.distance(currentPos, enemy.node.getPosition()) <= BattleConfig.NEUTRAL_FLEE_RANGE
        );

        if (nearbyEnemies.length > 0) {
            // Flee from nearest enemy
            const nearest = nearbyEnemies[0];
            const fleeDirection = new Vec3();
            Vec3.subtract(fleeDirection, currentPos, nearest.node.getPosition());
            fleeDirection.normalize();

            const fleeTarget = new Vec3();
            Vec3.scaleAndAdd(fleeTarget, currentPos, fleeDirection, 100);

            this.moveToPosition(fleeTarget);
        } else {
            // Clear combat state when safe - let normal movement take over
            if (this.combatTween) {
                this.combatTween.stop();
                this.combatTween = null;
            }
            this.isInCombat = false;
            // Normal movement will be handled by the main update() method calling super.update()
        }
    }

    /**
     * Update combat interactions
     */
    private updateCombat(deltaTime: number) {
        if (!this.battleData || !this.battleTarget) return;

        const currentPos = this.node.getPosition();
        const targetDistance = Vec3.distance(currentPos, this.battleTarget.node.getPosition());

        // Check if in attack range
        if (targetDistance <= BattleConfig.ATTACK_DISTANCE) {
            this.attackTarget(deltaTime);
        } else if (targetDistance <= this.battleRange) {
            // Move towards target
            this.moveTowardsTarget();
        } else {
            // Target out of range
            this.clearBattleTarget();
        }
    }    /**
     * Attack the current target
     */
    private attackTarget(deltaTime: number) {
        if (!this.battleTarget || !this.battleData || this.isRetreating) return;

        const currentTime = Date.now();
        if (currentTime - this.lastDamageTime >= 1000 / BattleConfig.DAMAGE_TICK_RATE) {
            // Deal damage
            this.dealDamage(this.battleTarget, this.battleDamage);
            this.lastDamageTime = currentTime;

            // Play attack sound
            this.playAttackSound();

            console.log(`${this.battleData.fishId} attacks ${this.battleTarget.getInstanceId()} for ${this.battleDamage} damage!`);

            // Retreat after attacking
            this.startRetreat();
        }
    }

    /**
     * Play attack sound effect
     */
    private playAttackSound(): void {
        if (this.audioSource && this.attackSound) {
            this.audioSource.playOneShot(this.attackSound);
        }
    }

    /**
     * Deal damage to target fish
     */
    private dealDamage(target: BattleFish, damage: number) {
        const died = target.takeDamage(damage);

        if (died) {
            this.onFishDeath(target);
        }
    }    /**
     * Handle fish death
     */
    private onFishDeath(deadFish: BattleFish) {
        console.log(`Fish ${deadFish.getInstanceId()} has died in battle!`);

        // Play death sound if it's this fish that died
        if (deadFish === this) {
            this.playDeathSound();
        }

        // Notify battle manager
        this.node.emit('fish-death', deadFish);

        // Clear as target if we were targeting this fish
        if (this.battleTarget === deadFish) {
            this.clearBattleTarget();
        }
    }

    /**
     * Play death sound effect
     */
    private playDeathSound(): void {
        if (this.audioSource && this.deathSound) {
            this.audioSource.playOneShot(this.deathSound);
        }
    }/**
     * Set battle target
     */
    public setBattleTarget(target: BattleFish) {
        this.battleTarget = target;
        this.isInCombat = true;

        // Stop any normal movement when entering combat
        if (this.combatTween) {
            this.combatTween.stop();
            this.combatTween = null;
        }
    }    /**
     * Clear battle target
     */
    public clearBattleTarget() {
        this.battleTarget = null;
        this.isInCombat = false;
        this.isRetreating = false;

        if (this.combatTween) {
            this.combatTween.stop();
            this.combatTween = null;
        }
    }/**
     * Move towards current target
     */
    private moveTowardsTarget() {
        if (!this.battleTarget) {
            // Find the nearest enemy if we don't have a target
            this.findAndSetNearestTarget();
            if (!this.battleTarget) return;
        }

        this.moveToPosition(this.battleTarget.node.getPosition());
    }

    /**
     * Find and set the nearest enemy as target
     */
    private findAndSetNearestTarget(): void {
        if (this.enemyFish.length === 0 || this.isRetreating) return;

        const currentPos = this.node.getPosition();
        let nearestDistance = Number.MAX_VALUE;
        let nearestEnemy: BattleFish | null = null;

        // Find nearest living enemy
        for (const enemy of this.enemyFish) {
            if (enemy.isAlive()) {
                const distance = Vec3.distance(currentPos, enemy.node.getPosition());
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestEnemy = enemy;
                }
            }
        }

        // Set as target if found and within range
        if (nearestEnemy && nearestDistance <= this.battleRange) {
            this.setBattleTarget(nearestEnemy);
        }
    }/**
     * Move to specific position with battle speed
     */    private moveToPosition(targetPos: Vec3) {
        if (this.combatTween) {
            this.combatTween.stop();
        }

        const currentPos = this.node.getPosition();
        const distance = Vec3.distance(currentPos, targetPos);

        // Don't move if already at target
        if (distance < 5) {
            this.isInCombat = false;
            return;
        }

        const duration = distance / this.battleSpeed;

        // Set combat state while moving
        this.isInCombat = true;

        // Update sprite direction using parent's flipSpriteHorizontally property
        const direction = new Vec3();
        Vec3.subtract(direction, targetPos, currentPos);

        // Access sprite through the parent class's getComponent method
        const sprite = this.getComponent('Sprite');
        if (sprite) {
            const shouldFlip = this.flipSpriteHorizontally ?
                direction.x > 0 : direction.x < 0;
            this.node.setScale(shouldFlip ? -1 : 1, 1, 1);
        }

        this.combatTween = tween(this.node)
            .to(duration, { position: targetPos })
            .call(() => {
                if (this.battleData) {
                    this.battleData.position = targetPos.clone();
                }
                // Clear combat state when movement is complete
                this.isInCombat = false;
                this.combatTween = null;
            })
            .start();
    }    /**
     * Patrol around area (for defenders)
     */
    private patrolArea() {
        if (this.combatTween) return; // Already moving

        const currentPos = this.node.getPosition();

        // Generate random patrol point within range
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * BattleConfig.DEFENDER_PATROL_RANGE * 0.5;

        const patrolTarget = new Vec3(
            currentPos.x + Math.cos(angle) * distance,
            currentPos.y + Math.sin(angle) * distance,
            0
        );

        // Get tank bounds from parent (we'll need to make this accessible)
        const tankBounds = this.getTankBounds();
        if (tankBounds) {
            patrolTarget.x = math.clamp(patrolTarget.x, tankBounds.min.x, tankBounds.max.x);
            patrolTarget.y = math.clamp(patrolTarget.y, tankBounds.min.y, tankBounds.max.y);
        }

        // Use moveToPosition which will properly manage combat state
        this.moveToPosition(patrolTarget);
    }

    /**
     * Get tank bounds (accessor for private parent property)
     */
    private getTankBounds(): { min: Vec3, max: Vec3 } | null {
        // This is a workaround - in production you'd make tankBounds protected in Fish class
        return (this as any).tankBounds || null;
    }

    /**
     * Get battle data
     */
    public getBattleData(): IBattleFish | null {
        return this.battleData;
    }    /**
     * Take damage from external source
     */
    public takeDamage(damage: number): boolean {
        if (!this.battleData || !this.battleData.isAlive) return false;

        this.battleData.currentHP = Math.max(0, this.battleData.currentHP - damage);

        // Update the visual HP bar if it exists
        this.updateHpBar();

        if (this.battleData.currentHP <= 0) {
            this.battleData.isAlive = false;

            // Play death sound
            this.playDeathSound();

            // Notify about death
            this.onFishDeath(this);

            return true; // Fish died
        }

        // Create flash effect on damage
        this.flashDamageEffect();

        return false; // Fish survived
    }/**
     * Update the HP bar visual to match current health
     */
    private updateHpBar(): void {
        // Find the HP fill node that was stored on the fish
        const hpFillNode = this.node['hpFillNode'];
        if (!hpFillNode) return;
        // Get max HP from battle data or use our battleHP property
        const maxHP = this.battleData?.originalData?.health || this.battleHP || 100;

        // Get the current HP percentage
        const currentHP = this.battleData?.currentHP || this.battleHP;
        const hpPercent = Math.max(0, Math.min(1, currentHP / maxHP));

        const maxWidth = hpFillNode['maxWidth'] || 50;
        const currentBarWidth = maxWidth * hpPercent;

        // Clear and redraw the HP fill
        const hpFillGraphics = hpFillNode.getComponent(Graphics);
        if (hpFillGraphics) {
            hpFillGraphics.clear();

            // Choose color based on HP percentage
            if (hpPercent > 0.6) {
                hpFillGraphics.fillColor = new Color(50, 220, 50, 255); // Green
            } else if (hpPercent > 0.3) {
                hpFillGraphics.fillColor = new Color(220, 220, 50, 255); // Yellow
            } else {
                hpFillGraphics.fillColor = new Color(220, 50, 50, 255); // Red
            }

            const barHeight = 5;
            // Draw the current HP fill
            hpFillGraphics.roundRect(-maxWidth / 2, -barHeight / 2, currentBarWidth, barHeight, 2);
            hpFillGraphics.fill();
        }
    }
    /**
     * Updates AI based on battle data
     */
    private updateAI(dt: number) {
        if (!this.battleData || !this.battleData.isAlive) return;

        switch (this.battleData.role) {
            case 'attacker':
                this.updateAttackerAI();
                break;
            case 'defender':
                this.updateDefenderAI();
                break;
            case 'neutral':
                this.updateNeutralAI();
                break;
        }
    }

    /**
     * Check if fish is alive
     */
    public isAlive(): boolean {
        return this.battleData ? this.battleData.isAlive : false;
    }

    /**
     * Get current HP
     */
    public getCurrentHP(): number {
        return this.battleData ? this.battleData.currentHP : 0;
    }
    /**
   * Get fish role
   */
    public getRole(): 'attacker' | 'defender' | 'neutral' {
        return this.battleData ? this.battleData.role : 'neutral';
    }

    /**
     * Get battle role (alias for getRole)
     */
    public getBattleRole(): 'attacker' | 'defender' | 'neutral' {
        return this.getRole();
    }

    /**
     * Get home position for AI
     */
    public getHomePosition(): Vec3 {
        return this.battleData ? this.battleData.position.clone() : new Vec3(0, 0, 0);
    }

    /**
     * Get maximum HP
     */
    public getMaxHP(): number {
        return this.battleHP;
    }

    /**
     * Get owner
     */
    public getOwner(): 'player' | 'opponent' {
        return this.battleData ? this.battleData.owner : 'player';
    }

    /**
     * Get instance ID
     */
    public getInstanceId(): string {
        return this.battleData ? this.battleData.fishId : '';
    }

    /**
     * Get attack range
     */
    public getAttackRange(): number {
        return this.battleRange;
    }

    /**
     * Get attack damage
     */
    public getAttackDamage(): number {
        return this.battleDamage;
    }

    /**
     * Get defense value (for damage calculation)
     */
    public getDefenseValue(): number {
        // Simple defense calculation - could be enhanced
        return Math.max(1, this.battleHP * 0.1);
    }

    // HITBOX FUNCTIONS
    /**
     * Get the hitbox of this fish for collision detection
     * @returns An object with position and size of the hitbox
     */
    public getHitbox(): { position: Vec3, width: number, height: number } {
        const position = this.node.getPosition();
        let width = 40;  // Default size
        let height = 20;
        
        // Get actual size from UITransform if available
        const transform = this.node.getComponent(UITransform);
        if (transform) {
            width = transform.width;
            height = transform.height;
        }

        // Apply node scale
        const scale = this.node.getScale();
        width *= Math.abs(scale.x);
        height *= Math.abs(scale.y);
        
        // Scale down the actual hitbox to be more precise (75% of visual size)
        width *= 0.75;
        height *= 0.75;
        
        return { position, width, height };
    }
    
    /**
     * Check if this fish's hitbox collides with another fish's hitbox
     * @param otherFish The fish to check collision with
     * @returns True if hitboxes collide
     */
    public collidesWithFish(otherFish: BattleFish): boolean {
        const myHitbox = this.getHitbox();
        const otherHitbox = otherFish.getHitbox();
        
        // Calculate hitbox boundaries
        const myLeft = myHitbox.position.x - myHitbox.width / 2;
        const myRight = myHitbox.position.x + myHitbox.width / 2;
        const myTop = myHitbox.position.y + myHitbox.height / 2;
        const myBottom = myHitbox.position.y - myHitbox.height / 2;
        
        const otherLeft = otherHitbox.position.x - otherHitbox.width / 2;
        const otherRight = otherHitbox.position.x + otherHitbox.width / 2;
        const otherTop = otherHitbox.position.y + otherHitbox.height / 2;
        const otherBottom = otherHitbox.position.y - otherHitbox.height / 2;
        
        // Check for overlap
        return !(
            myRight < otherLeft ||
            myLeft > otherRight ||
            myBottom > otherTop ||
            myTop < otherBottom
        );
    }
    
    /**
     * Check if this fish is within attack range of another fish,
     * considering both distance and direction
     * @param otherFish The target fish
     * @returns True if the target is in attack range
     */
    public isTargetInAttackRange(otherFish: BattleFish): boolean {
        // First do a quick distance check to avoid unnecessary calculations
        const myPos = this.node.getPosition();
        const targetPos = otherFish.node.getPosition();
        const distance = Vec3.distance(myPos, targetPos);
        
        // If not even in the maximum range, return false quickly
        if (distance > this.battleRange * 1.5) {
            return false;
        }
        
        // For very close fish, they're definitely in range
        if (distance < this.battleRange * 0.5) {
            return true;
        }
        
        // For fish that are in the borderline range, do a more precise check
        // Direction matters - fish need to be facing their target to attack
        const direction = new Vec3();
        Vec3.subtract(direction, targetPos, myPos);
        direction.normalize();
        
        // Check if the fish is generally facing the target
        const isFacingRight = this.node.scale.x > 0;
        const targetIsToRight = direction.x > 0;
        
        // If the fish isn't even facing the target, they're not in attack range
        if (isFacingRight !== targetIsToRight) {
            return false;
        }
        
        // If within range and facing the target, they're in attack range
        return distance <= this.battleRange;
    }
    
    // Attack cooldown tracking
    private attackCooldown: number = 0;
    private attackCooldownTime: number = 1000; // 1 second between attacks by default
    
    /**
     * Check if the fish can attack (cooldown expired)
     */
    public canAttack(): boolean {
        return Date.now() - this.attackCooldown >= this.attackCooldownTime;
    }
    
    /**
     * Reset attack cooldown after an attack
     */
    public resetAttackCooldown(): void {
        this.attackCooldown = Date.now();
    }
    
    /**
     * Perform an attack on the target
     * This should set up animations and effects, but damage is applied separately
     */
    public performAttack(target: BattleFish): void {
        // Reset attack cooldown
        this.resetAttackCooldown();
        
        // Add attack animation or effects here
        this.flashAttackEffect();
    }
    
    /**
     * Create a quick flash effect for attacking
     */
    private flashAttackEffect(): void {
        const sprite = this.getComponent(Sprite);
        if (!sprite) return;
        
        // Store original color
        const originalColor = sprite.color.clone();
        
        // Flash yellow
        sprite.color = new Color(255, 255, 150, 255);
        
        // Reset after a short time
        this.scheduleOnce(() => {
            if (sprite.isValid) {
                sprite.color = originalColor;
            }
        }, 0.1);
    }
    
    /**
     * Create a quick flash effect when taking damage
     */
    private flashDamageEffect(): void {
        const sprite = this.getComponent(Sprite);
        if (!sprite) return;
        
        // Store original color
        const originalColor = sprite.color.clone();
        
        // Flash red
        sprite.color = new Color(255, 100, 100, 255);
        
        // Reset after a short time
        this.scheduleOnce(() => {
            if (sprite.isValid) {
                sprite.color = originalColor;
            }
        }, 0.1);
    }

    /**
     * Start retreat behavior after attacking
     */
    private startRetreat(): void {
        if (!this.battleTarget || !this.battleData) return;
        
        // Mark as retreating
        this.isRetreating = true;
        
        // Calculate retreat direction (away from target)
        const myPos = this.node.getPosition();
        const targetPos = this.battleTarget.node.getPosition();
        
        const retreatDirection = new Vec3();
        Vec3.subtract(retreatDirection, myPos, targetPos);
        retreatDirection.normalize();
        
        // Calculate retreat target position
        const retreatTarget = new Vec3();
        Vec3.scaleAndAdd(retreatTarget, myPos, retreatDirection, this.retreatDistance);
        
        // Get tank bounds and clamp retreat position
        const tankBounds = this.getTankBounds();
        if (tankBounds) {
            retreatTarget.x = math.clamp(retreatTarget.x, tankBounds.min.x, tankBounds.max.x);
            retreatTarget.y = math.clamp(retreatTarget.y, tankBounds.min.y, tankBounds.max.y);
        }
        
        // Move to retreat position
        this.moveToRetreatPosition(retreatTarget);
    }
    
    /**
     * Move to retreat position
     */
    private moveToRetreatPosition(targetPos: Vec3): void {
        if (this.combatTween) {
            this.combatTween.stop();
        }
        
        const currentPos = this.node.getPosition();
        const distance = Vec3.distance(currentPos, targetPos);
        
        // Use faster speed for retreating
        const retreatSpeed = this.battleSpeed * 1.5;
        const duration = Math.max(0.3, distance / retreatSpeed);
        
        // Update sprite direction
        const direction = new Vec3();
        Vec3.subtract(direction, targetPos, currentPos);
        
        // Access sprite through the parent class's getComponent method
        const sprite = this.getComponent(Sprite);
        if (sprite) {
            const shouldFlip = this.flipSpriteHorizontally ?
                direction.x > 0 : direction.x < 0;
            this.node.setScale(shouldFlip ? -1 : 1, 1, 1);
        }
        
        this.combatTween = tween(this.node)
            .to(duration, { position: targetPos })
            .call(() => {
                if (this.battleData) {
                    this.battleData.position = targetPos.clone();
                }
                // End retreat state
                this.isRetreating = false;
                this.combatTween = null;
            })
            .start();
    }    onDestroy() {
        if (this.combatTween) {
            this.combatTween.stop();
        }
        super.onDestroy();
    }

    /**
     * Debug-draw the hitbox (visualization)
     * Call this in update if you want to see the hitbox
     */
    public debugDrawHitbox(): void {
        // Get or create a graphics node for debugging
        let debugNode = this.node.getChildByName('DebugHitbox');
        if (!debugNode) {
            debugNode = new Node('DebugHitbox');
            this.node.addChild(debugNode);
            debugNode.addComponent(Graphics);
        }
        
        const hitbox = this.getHitbox();
        const graphics = debugNode.getComponent(Graphics);
        
        if (!graphics) return;
        
        // Clear previous drawing
        graphics.clear();
        
        // Set outline style
        const isPlayer = this.getOwner() === 'player';
        graphics.strokeColor = isPlayer ? new Color(0, 255, 0, 255) : new Color(255, 0, 0, 255);
        graphics.lineWidth = 2;
        
        // Calculate rect position relative to the fish node
        const width = hitbox.width;
        const height = hitbox.height;
        
        // Draw rectangle outline (centered on the fish)
        graphics.rect(-width/2, -height/2, width, height);
        graphics.stroke();
        
        // If we have a target, draw a line to it
        if (this.battleTarget && this.battleTarget.isAlive()) {
            const targetPos = this.battleTarget.node.getPosition();
            const myPos = this.node.getPosition();
            
            // Calculate relative position
            const relativeX = targetPos.x - myPos.x;
            const relativeY = targetPos.y - myPos.y;
            
            // Draw line to target
            graphics.moveTo(0, 0);
            graphics.lineTo(relativeX, relativeY);
            graphics.stroke();
        }
    }/**
     * Debug utility to test if any fish are colliding with this one
     * Returns an array of colliding fish for debugging
     */
    public getCollidingFish(): BattleFish[] {
        const collidingFish: BattleFish[] = [];
        
        // Check collisions with enemy fish
        this.enemyFish.forEach(enemy => {
            if (this.collidesWithFish(enemy)) {
                collidingFish.push(enemy);
            }
        });
        
        // Also check collisions with ally fish
        this.allyFish.forEach(ally => {
            if (this.collidesWithFish(ally)) {
                collidingFish.push(ally);
            }
        });
        
        return collidingFish;
    }
    
    /**
     * Run a debug test to log all colliding fish
     * Call this function from the console for debugging
     */
    public testCollisions(): void {
        const collisions = this.getCollidingFish();
        if (collisions.length > 0) {
            console.log(`Fish ${this.getInstanceId()} is colliding with ${collisions.length} other fish:`);
            collisions.forEach((fish, index) => {
                console.log(`  ${index + 1}. ${fish.getInstanceId()} (${fish.getOwner()} ${fish.getRole()})`);
            });
        } else {
            console.log(`Fish ${this.getInstanceId()} is not colliding with any fish`);
        }
    }
}

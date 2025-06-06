import { _decorator, Component, Node, Vec3, Sprite, math, tween, Tween } from 'cc';
import { SavedFishType } from './firebase/database-service';
import databaseService from './firebase/database-service';
import { FISH_FOOD_LIST, FishFoodType } from './FishFoodData';
import { FISH_LIST } from './FishData';

const { ccclass, property } = _decorator;

@ccclass('Fish')
export class Fish extends Component {
    @property
    moveSpeed: number = 100;

    @property
    changeDirectionInterval: number = 3;

    @property
    hungerDecayRate: number = 2;

    @property
    hungerDecayInterval: number = 3600;

    flipSpriteHorizontally: boolean = false;

    private fishData: SavedFishType | null = null;
    private tankBounds: { min: Vec3, max: Vec3 } | null = null;
    private currentDirection: Vec3 = new Vec3();
    private moveTween: Tween<Node> | null = null;
    private directionTimer: number = 0;
    private sprite: Sprite | null = null;
    private targetPos: Vec3 | null = null;

    // Anti-stuck mechanism
    private lastBoundaryHitTime: number = 0;
    private boundaryHitCooldown: number = 1.0; // 1 second cooldown between boundary reactions
    private consecutiveBoundaryHits: number = 0;
    private lastPosition: Vec3 = new Vec3();
    private positionChangeThreshold: number = 5; // Minimum movement required to reset stuck detection

    // New properties for right-to-left movement
    private isGameFish: boolean = false; // Flag to distinguish game fish from tank fish
    private spawnTime: number = 0;
    private maxLifeTime: number = 20;
    private spawnX: number = 0;

    start() {
        this.sprite = this.getComponent(Sprite);
        if (!this.isGameFish) {
            this.initializeMovement();
        }
    }

    update(deltaTime: number) {
        if (this.isGameFish) {
            // Game fish: move from right to left
            this.updateGameFishMovement(deltaTime);
        } else {
            // Tank fish: normal random movement
            this.updateTankFishMovement(deltaTime);
        }
    }

    /**
     * Initialize fish for game mode (right-to-left movement)
     */
    public initializeGameFish(spawnX: number, spawnY: number, speed: number, maxLifeTime: number) {
        this.isGameFish = true;
        this.spawnTime = Date.now();
        this.spawnX = spawnX;
        this.maxLifeTime = maxLifeTime;
        this.moveSpeed = speed;

        // Set initial position
        this.node.setPosition(spawnX, spawnY, 0);

        // Face left (moving leftward)
        if (this.sprite) {
            this.node.setScale(-1, 1, 1); // Flip horizontally to face left
        }

        console.log(`Game fish spawned at (${spawnX}, ${spawnY}) with speed ${speed}`);
    }

    /**
     * Update movement for game fish (right-to-left)
     */
    private updateGameFishMovement(deltaTime: number) {
        const now = Date.now();
        const elapsedTime = (now - this.spawnTime) / 1000; // Convert to seconds
        const distance = this.moveSpeed * elapsedTime;
        const currentX = this.spawnX - distance; // Move leftward
        const position = this.node.position;

        this.node.setPosition(currentX, position.y, position.z);

        // Check if fish should be destroyed
        if (currentX <= -this.spawnX || elapsedTime > this.maxLifeTime) {
            console.log(`Game fish destroyed: currentX=${currentX}, elapsedTime=${elapsedTime}`);
            this.destroyFish();
        }
    }

    /**
     * Update movement for tank fish (normal behavior)
     */
    private updateTankFishMovement(deltaTime: number) {
        const variation = this.changeDirectionInterval * 0.5;
        const randomInterval = this.changeDirectionInterval + (Math.random() - 0.5) * 2 * variation;

        if (this.targetPos) {
            const currentPos = this.node.getPosition();
            const direction = new Vec3();
            Vec3.subtract(direction, this.targetPos, currentPos);

            if (this.sprite) {
                const shouldFlip = this.flipSpriteHorizontally
                    ? direction.x > 0
                    : direction.x < 0;
                this.node.setScale(shouldFlip ? -1 : 1, 1, 1);
            }

            if (direction.length() > 1) {
                direction.normalize();
                const movement = direction.multiplyScalar(this.moveSpeed * 3 * deltaTime);
                this.node.setPosition(currentPos.add(movement));
            }
        } else {
            if (this.moveTween == null) {
                this.startMovement();
            }
        }

        this.directionTimer += deltaTime;

        // Only check boundaries if enough time has passed since last direction change
        // This prevents rapid direction changes when fish is near boundaries
        const shouldCheckBoundary = !this.targetPos &&
            (this.directionTimer >= randomInterval ||
                (this.directionTimer >= 0.5 && this.isHittingBounds()));

        if (shouldCheckBoundary) {
            this.changeDirection();
            this.directionTimer = 0;
        }

        this.checkHealthDecay(deltaTime);
    }

    /**
     * Handle bullet hit (for game fish)
     */
    public onBulletHit() {
        if (this.isGameFish) {
            console.log('Game fish hit by bullet');
            // Add hit effects here (animation, sound, etc.)
            this.destroyFish();
            return true; // Return true if hit was successful
        }
        return false;
    }

    /**
     * Destroy the fish
     */
    private destroyFish() {
        // Stop any tweens
        if (this.moveTween) {
            this.moveTween.stop();
        }

        // Emit destroy event for FishManager to handle
        this.node.emit('fish-destroyed', this);

        // Destroy the node
        this.node.destroy();
    }

    public initializeFish(fishData: SavedFishType, tankBounds: { min: Vec3, max: Vec3 }) {
        console.log('Initializing fish with data:', fishData.id);
        this.fishData = fishData;
        this.tankBounds = tankBounds;
        this.isGameFish = false; // This is a tank fish

        if (!this.fishData.lastFedTime) {
            this.fishData.lastFedTime = Date.now();
            if (this.fishData.id) {
                databaseService.updateFish(this.fishData.id, { lastFedTime: this.fishData.lastFedTime });
            }
        }

        this.setRandomPosition();

        // Initialize anti-stuck tracking
        this.lastPosition.set(this.node.getPosition());
        this.consecutiveBoundaryHits = 0;
        this.lastBoundaryHitTime = 0;

        this.initializeMovement();
    }

    private setRandomPosition() {
        if (!this.tankBounds) return;

        // Add some padding so fish don't spawn right at the edges
        const padding = 20;
        const minX = this.tankBounds.min.x + padding;
        const maxX = this.tankBounds.max.x - padding;
        const minY = this.tankBounds.min.y + padding;
        const maxY = this.tankBounds.max.y - padding;

        const randomX = math.lerp(minX, maxX, Math.random());
        const randomY = math.lerp(minY, maxY, Math.random());

        this.node.setPosition(randomX, randomY, 0);
    }

    private initializeMovement() {
        this.changeDirection();
    }

    private changeDirection() {
        if (!this.tankBounds) return;

        const currentPos = this.node.getPosition();

        // Check which boundaries we're close to and bias direction away from them
        const margin = 30; // Larger margin for direction planning
        const isNearLeft = currentPos.x <= this.tankBounds.min.x + margin;
        const isNearRight = currentPos.x >= this.tankBounds.max.x - margin;
        const isNearTop = currentPos.y >= this.tankBounds.max.y - margin;
        const isNearBottom = currentPos.y <= this.tankBounds.min.y + margin;

        let angle: number;

        if (isNearLeft || isNearRight || isNearTop || isNearBottom) {
            // If near any boundary, generate direction that points away from boundaries
            const centerX = (this.tankBounds.min.x + this.tankBounds.max.x) / 2;
            const centerY = (this.tankBounds.min.y + this.tankBounds.max.y) / 2;

            // Calculate direction toward center
            const toCenterX = centerX - currentPos.x;
            const toCenterY = centerY - currentPos.y;
            const centerAngle = Math.atan2(toCenterY, toCenterX);

            // Add controlled randomness (smaller range when near boundaries)
            const randomOffset = (Math.random() - 0.5) * Math.PI * 0.4; // ±36 degrees
            angle = centerAngle + randomOffset;

            console.log(`Fish near boundary, directing toward center. Position: (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)})`);
        } else {
            // If not near boundaries, use normal random direction
            angle = Math.random() * Math.PI * 2;
        }

        this.currentDirection.set(
            Math.cos(angle),
            Math.sin(angle),
            0
        );

        // Flip sprite based on direction and flip option
        if (this.sprite) {
            const shouldFlip = this.flipSpriteHorizontally ?
                this.currentDirection.x > 0 : // Flip when moving right if flipSpriteHorizontally is true
                this.currentDirection.x < 0;  // Flip when moving left if flipSpriteHorizontally is false
            this.node.setScale(shouldFlip ? -1 : 1, 1, 1);
        }

        // Stop current movement
        if (this.moveTween) {
            this.moveTween.stop();
        }

        // Start new movement
        this.startMovement();
    }

    private startMovement() {
        if (!this.tankBounds) return;

        const currentPos = this.node.getPosition();

        // Calculate a distant target position for continuous movement
        const movementDistance = 200; // Larger distance for smoother movement
        let targetPos = new Vec3(
            currentPos.x + this.currentDirection.x * movementDistance,
            currentPos.y + this.currentDirection.y * movementDistance,
            0
        );

        // Use more generous padding to keep fish away from edges
        const safePadding = 25; // Increased padding
        const safeMinX = this.tankBounds.min.x + safePadding;
        const safeMaxX = this.tankBounds.max.x - safePadding;
        const safeMinY = this.tankBounds.min.y + safePadding;
        const safeMaxY = this.tankBounds.max.y - safePadding;

        // Check if target would be outside safe bounds and adjust direction if needed
        const wouldHitBounds = (
            targetPos.x < safeMinX || targetPos.x > safeMaxX ||
            targetPos.y < safeMinY || targetPos.y > safeMaxY
        );

        if (wouldHitBounds) {
            // Generate a new direction that points more toward the center
            const centerX = (this.tankBounds.min.x + this.tankBounds.max.x) / 2;
            const centerY = (this.tankBounds.min.y + this.tankBounds.max.y) / 2;

            // Calculate direction toward center with some randomness
            const toCenterX = centerX - currentPos.x;
            const toCenterY = centerY - currentPos.y;
            const centerAngle = Math.atan2(toCenterY, toCenterX);

            // Add some randomness to avoid straight-line movement to center
            const randomOffset = (Math.random() - 0.5) * Math.PI * 0.4; // Reduced randomness for better control
            const newAngle = centerAngle + randomOffset;

            this.currentDirection.set(
                Math.cos(newAngle),
                Math.sin(newAngle),
                0
            );

            // Update sprite flip based on new direction
            if (this.sprite) {
                const shouldFlip = this.flipSpriteHorizontally ?
                    this.currentDirection.x > 0 :
                    this.currentDirection.x < 0;
                this.node.setScale(shouldFlip ? -1 : 1, 1, 1);
            }

            // Recalculate target with new direction
            targetPos = new Vec3(
                currentPos.x + this.currentDirection.x * movementDistance,
                currentPos.y + this.currentDirection.y * movementDistance,
                0
            );
        }

        // Clamp target position to safe bounds (not tank bounds)
        targetPos.x = math.clamp(targetPos.x, safeMinX, safeMaxX);
        targetPos.y = math.clamp(targetPos.y, safeMinY, safeMaxY);

        // Calculate movement duration based on speed (pixels per second)
        const distance = Vec3.distance(currentPos, targetPos);
        const duration = distance / this.moveSpeed; // moveSpeed is now pixels per second

        // Create smooth movement tween
        this.moveTween = tween(this.node)
            .to(duration, { position: targetPos })
            .start();
    }

    /**
     * Check if fish health should decay due to hunger
     * Fish lose health over time when they haven't been fed
     */
    private checkHealthDecay(deltaTime: number) {
        if (!this.fishData || !this.fishData.lastFedTime) return;

        const currentTime = Date.now();
        const timeSinceLastFed = (currentTime - this.fishData.lastFedTime) / 1000; // Convert to seconds

        // Only start decaying health after the hunger interval has passed
        if (timeSinceLastFed > this.hungerDecayInterval) {
            // Calculate how much health to decay based on time passed
            const timeOverHungerLimit = timeSinceLastFed - this.hungerDecayInterval;
            const minutesOverLimit = timeOverHungerLimit / 1; // Convert to minutes (/60)

            // Decay health gradually - only lose health every hour, not every frame
            const healthDecayAmount = Math.floor(minutesOverLimit * this.hungerDecayRate);
            const expectedHealth = Math.max(0.0, this.getMaxHealth() - healthDecayAmount);

            // Only update if the expected health is different from current health
            // This prevents constant database updates
            if (this.fishData.health > expectedHealth) {
                const healthLoss = this.fishData.health - expectedHealth;
                //console.log(expectedHealth);
                console.log(`Fish ${this.fishData.id} losing ${healthLoss} health due to hunger (${Math.floor(timeSinceLastFed / 60)} mins since last fed)`);
                this.updateHealth(-healthLoss); // Use negative value to decrease health
            }
        }
    }

    public eatFood(foodType: FishFoodType | null) {
        if (!foodType) return;

        // Update hunger or health or whatever logic you want
        this.updateHealth(foodType.health);
        this.updateLastFedTime(Date.now()) // get delta time
        console.log(`Fish ${this.fishData?.id} ate ${foodType.name} and gained ${foodType.health} health`);
    }

    private isHittingBounds(): boolean {
        if (!this.tankBounds) return false;

        const pos = this.node.getPosition();
        const margin = 15; // Slightly increased margin for better detection

        const isNearBoundary = (
            pos.x <= this.tankBounds.min.x + margin ||
            pos.x >= this.tankBounds.max.x - margin ||
            pos.y <= this.tankBounds.min.y + margin ||
            pos.y >= this.tankBounds.max.y - margin
        );

        if (isNearBoundary) {
            const currentTime = Date.now() / 1000; // Convert to seconds

            // Check if enough time has passed since last boundary reaction
            if (currentTime - this.lastBoundaryHitTime < this.boundaryHitCooldown) {
                return false; // Ignore boundary hit if still in cooldown
            }

            // Check if fish has moved significantly since last position check
            const hasMovedSignificantly = Vec3.distance(pos, this.lastPosition) > this.positionChangeThreshold;
            if (!hasMovedSignificantly) {
                this.consecutiveBoundaryHits++;

                // If fish seems truly stuck, force a random teleport to center area
                if (this.consecutiveBoundaryHits >= 3) {
                    this.unstuckFish();
                    return false;
                }
            } else {
                this.consecutiveBoundaryHits = 0; // Reset counter if fish is moving
            }

            this.lastBoundaryHitTime = currentTime;
            this.lastPosition.set(pos);
            return true;
        }

        this.consecutiveBoundaryHits = 0; // Reset if not near boundary
        return false;
    }

    /**
     * Unstuck a fish that appears to be trapped at boundaries
     * Moves the fish to a safe position away from edges
     */
    private unstuckFish(): void {
        if (!this.tankBounds) return;

        console.log(`Unsticking fish ${this.fishData?.id || 'unknown'} that was stuck at boundaries`);

        // Calculate a safe position in the center area of the tank
        const safeMargin = 50; // Stay away from edges
        const safeMinX = this.tankBounds.min.x + safeMargin;
        const safeMaxX = this.tankBounds.max.x - safeMargin;
        const safeMinY = this.tankBounds.min.y + safeMargin;
        const safeMaxY = this.tankBounds.max.y - safeMargin;

        // Generate random position in safe area
        const newX = math.lerp(safeMinX, safeMaxX, Math.random());
        const newY = math.lerp(safeMinY, safeMaxY, Math.random());

        // Move fish to new position
        this.node.setPosition(newX, newY, 0);

        // Generate new random direction
        const angle = Math.random() * Math.PI * 2;
        this.currentDirection.set(Math.cos(angle), Math.sin(angle), 0);

        // Update sprite direction
        if (this.sprite) {
            const shouldFlip = this.flipSpriteHorizontally ?
                this.currentDirection.x > 0 :
                this.currentDirection.x < 0;
            this.node.setScale(shouldFlip ? -1 : 1, 1, 1);
        }

        // Stop any current movement
        if (this.moveTween) {
            this.moveTween.stop();
            this.moveTween = null;
        }

        // Reset stuck detection
        this.consecutiveBoundaryHits = 0;
        this.lastBoundaryHitTime = Date.now() / 1000;
        this.lastPosition.set(this.node.getPosition());

        // Start new movement
        this.startMovement();
    }

    public getFishData(): SavedFishType | null {
        return this.fishData;
    }

    /**
     * Get the maximum health for this fish type from FISH_LIST
     */
    public getMaxHealth(): number {
        if (!this.fishData) return 100; // Default fallback

        const fishDefinition = FISH_LIST.find(fish => fish.id === this.fishData!.type);
        return fishDefinition ? fishDefinition.health : 100; // Default fallback if fish type not found
    }

    public setFishType(type: string) {
        if (this.fishData) {
            this.fishData.type = type;

            // Update the database with new fish type
            if (this.fishData.id) {
                databaseService.updateFish(this.fishData.id, { type: type });
            }
        }
    }

    public updateHealth(health: number) {
        if (this.fishData) {
            // Update health first
            this.fishData.health = this.fishData.health + health;

            // Clamp health between 0 and maxHealth
            const maxHealth = this.getMaxHealth();
            this.fishData.health = Math.max(0, Math.min(this.fishData.health, maxHealth));

            // Update the database with new health value
            if (this.fishData.id) {
                databaseService.updateFish(this.fishData.id, { health: this.fishData.health });
            }

            // Destroy fish if health reaches 0
            /*if (this.fishData.health <= 0) {
                console.log(`Fish ${this.fishData.id} died from low health`);
                this.node.destroy();
            }*/
        }
    }

    public updateLastFedTime(time: number) {
        if (this.fishData) {
            this.fishData.lastFedTime = time;
            console.log(`Fish ${this.fishData.id} is goin to update last fed time to ${new Date(time).toLocaleString()}`);
            // Update the database with new lastFedTime
            if (this.fishData.id) {
                console.log('=======');
                databaseService.updateFish(this.fishData.id, { lastFedTime: time });
            }
        }
    }

    /**
     * Update fish data without losing position or movement state
     */
    public updateFishData(newFishData: SavedFishType) {
        if (this.fishData && newFishData.id === this.fishData.id) {
            // Only update the data, preserve position and movement state
            this.fishData.health = newFishData.health;
            this.fishData.lastFedTime = newFishData.lastFedTime;
            this.fishData.type = newFishData.type;
            this.fishData.ownerId = newFishData.ownerId;

            //console.log(`Updated fish data for fish ${this.fishData.id} without losing state`);
        }
    }

    setTarget(pos: Vec3) {
        // Stop any current movement tween to allow immediate response to food
        if (this.moveTween) {
            this.moveTween.stop();
            this.moveTween = null;
        }

        this.targetPos = pos;
    }

    clearTarget() {
        this.targetPos = null;
    }

    onDestroy() {
        if (this.moveTween) {
            this.moveTween.stop();
        }
    }
}

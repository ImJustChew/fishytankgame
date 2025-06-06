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

        if (!this.targetPos && (this.directionTimer >= randomInterval || this.isHittingBounds())) {
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
        // Generate random direction
        const angle = Math.random() * Math.PI * 2;
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

        // Check if target would be outside bounds and adjust direction if needed
        const wouldHitBounds = (
            targetPos.x < this.tankBounds.min.x || targetPos.x > this.tankBounds.max.x ||
            targetPos.y < this.tankBounds.min.y || targetPos.y > this.tankBounds.max.y
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
            const randomOffset = (Math.random() - 0.5) * Math.PI * 0.5; // ±45 degrees
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

        // Clamp target position to tank bounds as final safety measure
        targetPos.x = math.clamp(targetPos.x, this.tankBounds.min.x, this.tankBounds.max.x);
        targetPos.y = math.clamp(targetPos.y, this.tankBounds.min.y, this.tankBounds.max.y);

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
        const margin = 10; // Small margin to detect near-boundary

        return (
            pos.x <= this.tankBounds.min.x + margin ||
            pos.x >= this.tankBounds.max.x - margin ||
            pos.y <= this.tankBounds.min.y + margin ||
            pos.y >= this.tankBounds.max.y - margin
        );
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

import { _decorator, Component, Node, Vec3, Sprite, math, tween, Tween } from 'cc';
import { SavedFishType } from './firebase/database-service';

const { ccclass, property } = _decorator;

@ccclass('Fish')
export class Fish extends Component {
    @property
    moveSpeed: number = 50;

    @property
    changeDirectionInterval: number = 3; // Increased from 2 to 3 seconds for longer swimming segments

    @property
    flipSpriteHorizontally: boolean = false; // Option to flip sprite orientation if needed

    private fishData: SavedFishType | null = null;
    private tankBounds: { min: Vec3, max: Vec3 } | null = null;
    private currentDirection: Vec3 = new Vec3();
    private moveTween: Tween<Node> | null = null;
    private directionTimer: number = 0;

    private sprite: Sprite | null = null;

    start() {
        // Get the sprite component from the same node
        this.sprite = this.getComponent(Sprite);
        this.initializeMovement();
    } update(deltaTime: number) {
        this.directionTimer += deltaTime;

        // Add random variation to direction change interval (±50% of base interval)
        const variation = this.changeDirectionInterval * 0.5; // 50% variation
        const randomInterval = this.changeDirectionInterval + (Math.random() - 0.5) * 2 * variation;

        // Change direction randomly or when hitting bounds
        if (this.directionTimer >= randomInterval || this.isHittingBounds()) {
            this.changeDirection();
            this.directionTimer = 0;
        }
    }

    public initializeFish(fishData: SavedFishType, tankBounds: { min: Vec3, max: Vec3 }) {
        this.fishData = fishData;
        this.tankBounds = tankBounds;

        // Set initial random position within tank bounds
        this.setRandomPosition();

        // Initialize movement
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
    } private changeDirection() {
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
    } private startMovement() {
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

    public setFishType(type: string) {
        if (this.fishData) {
            this.fishData.type = type;
        }
    }

    public updateHealth(health: number) {
        if (this.fishData) {
            this.fishData.health = health;
        }
    }

    public updateLastFedTime(time: number) {
        if (this.fishData) {
            this.fishData.lastFedTime = time;
        }
    }

    onDestroy() {
        if (this.moveTween) {
            this.moveTween.stop();
        }
    }
}

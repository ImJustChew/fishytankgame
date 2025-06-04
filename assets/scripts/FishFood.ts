import { _decorator, Component, Node, Vec3, Sprite, math, tween, Tween } from 'cc';
import { FishFoodType } from './FishFoodData';
const { ccclass, property } = _decorator;

@ccclass('FishFood')
export class FishFood extends Component {
    @property
    fallSpeed: number = 80; // Pixels per second

    private foodType: FishFoodType | null = null;
    private tankBounds: { min: Vec3, max: Vec3 } | null = null;
    private fallTween: Tween<Node> | null = null;

    private sprite: Sprite | null = null;

    start() {
        this.sprite = this.getComponent(Sprite);
        // for testing
        // this.startFalling();
    }

    /**
     * Initializes the food object with its data and tank bounds
     */
    public initializeFishFood(foodData: FishFoodType, spawnLocation: Vec3, tankBounds: { min: Vec3, max: Vec3 }) {
        this.foodType = foodData;
        this.tankBounds = tankBounds;

        // Optionally set sprite frame here if not already set by prefab
        // if (this.sprite && foodData.sprite) {
        //     this.sprite.spriteFrame = foodData.sprite;
        // }
        this.node.setPosition(spawnLocation);

        this.startFalling();
    }

    /**
     * Starts the falling animation using a tween
     */
    private startFalling() {
        if (!this.tankBounds) return;

        const currentPos = this.node.getPosition();

        // Target is the bottom of the tank
        const targetY = this.tankBounds.min.y;
        const targetPos = new Vec3(currentPos.x, targetY, currentPos.z);

        // Clamp in case food is already outside
        targetPos.y = math.clamp(targetPos.y, this.tankBounds.min.y, this.tankBounds.max.y);

        const distance = currentPos.y - targetPos.y;
        const duration = distance / this.fallSpeed;

        this.fallTween = tween(this.node)
            .to(duration, { position: targetPos })
            .call(() => this.destroyFood())
            .start();
    }

    public destroyFood() {
        this.node.destroy(); // Destroys the node when it hits the bottom
    }

    onDestroy() {
        if (this.fallTween) {
            this.fallTween.stop();
        }
    }

    public getFoodType(): FishFoodType | null {
        return this.foodType;
    }
}
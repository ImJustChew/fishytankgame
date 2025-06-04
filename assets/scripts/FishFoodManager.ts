import { _decorator, Component, SpriteFrame } from 'cc';
import { FishFoodType, FISH_FOOD_LIST } from './FishFoodData';

const { ccclass, property } = _decorator;

/**
 * FishFoodManager
 * 
 * This class manages food sprites and provides a way to access them by string keys.
 * It also provides methods to access food data.
 */
@ccclass('FishFoodManager')
export class FishFoodManager extends Component {
    @property({
        type: [SpriteFrame],
        tooltip: 'List of food sprite frames to be managed'
    })
    private spriteFrames: SpriteFrame[] = [];

    private currentActiveFishFood: FishFoodType | null = null;
    // Internal map for quick lookups
    private spriteMap: Map<string, SpriteFrame> = new Map();

    start() {
        this.initializeSpriteMap();
        // always set default food when starting 
        this.setCurrentActiveFishFoodByIdx(0);
    }

    /**
     * Initialize the internal map for fast lookups
     */
    private initializeSpriteMap() {
        this.spriteMap.clear();
        const spriteKeys: string[] = FISH_FOOD_LIST.map(food => food.id);

        if (this.spriteFrames.length !== spriteKeys.length) {
            console.error('[FishFoodManager] Number of sprite frames does not match number of food keys');
            return;
        }

        for (let i = 0; i < this.spriteFrames.length; i++) {
            if (this.spriteFrames[i] && spriteKeys[i]) {
                this.spriteMap.set(spriteKeys[i], this.spriteFrames[i]);
            }
        }

        console.log(`[FishFoodManager] Initialized with ${this.spriteMap.size} food sprites`);
    }

    /**
     * Get Current active food list 
     * @param idx 
     * @returns 
     */
    public getCurrentActiveFishFood() : FishFoodType | null {
        return this.currentActiveFishFood;
    }

    /**
     * Set the current Active fish food maybe by idx in an array, 
     * for example from UI manager by passing an index 
     * @param index 
     */
    public setCurrentActiveFishFoodByIdx(index) {
        this.currentActiveFishFood = FISH_FOOD_LIST[index];
    }

    /**
     * Get the sprite frame for a food by its ID
     * @param id The unique identifier of the food
     * @returns The sprite frame or null if not found
     */
    public getFishFoodSpriteById(id: string): SpriteFrame | null {
        const spriteFrame = this.spriteMap.get(id);
        return spriteFrame || null;
    }

    /**
     * Get a list of all available food with associated sprites
     * @returns Array of all food data
     */
    public getAllFood(): FishFoodType[] {
        return [...FISH_FOOD_LIST.map(food => ({
            ...food,
            sprite: this.getFishFoodSpriteById(food.id) || null
        }))];
    }
}
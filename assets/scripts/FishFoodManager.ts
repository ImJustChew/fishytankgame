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
    // Internal map for quick lookups
    private spriteMap: Map<string, SpriteFrame> = new Map();

    start() {
        this.initializeSpriteMap();
        // 默认选择第一种鱼食
        this.selectDefaultFoodType();
    }

    /**
     * 选择默认的鱼食类型（第一种）
     */
    private selectDefaultFoodType() {
        if (FISH_FOOD_LIST.length > 0) {
            this.selectedFoodType = FISH_FOOD_LIST[0];
            console.log(`[FishFoodManager] Default food type selected: ${this.selectedFoodType.name}`);
        } else {
            console.warn('[FishFoodManager] No food types available');
        }
    }

    /**
     * 获取当前选择的鱼食类型
     * @returns 当前选择的鱼食类型，如果没有选择则返回null
     */
    public getSelectedFoodType(): FishFoodType | null {
        // 如果没有选择，返回默认的第一种鱼食
        if (!this.selectedFoodType && FISH_FOOD_LIST.length > 0) {
            this.selectDefaultFoodType();
        }
        return this.selectedFoodType;
    }

    /**
     * 设置当前选择的鱼食类型
     * @param foodTypeId 鱼食类型ID
     * @returns 是否成功设置
     */
    public selectFoodType(foodTypeId: string): boolean {
        const foodType = FISH_FOOD_LIST.find(food => food.id === foodTypeId);
        if (foodType) {
            this.selectedFoodType = foodType;
            console.log(`[FishFoodManager] Food type selected: ${foodType.name}`);
            return true;
        }
        console.warn(`[FishFoodManager] Food type not found: ${foodTypeId}`);
        return false;
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

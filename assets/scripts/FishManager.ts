import { _decorator, Component, SpriteFrame } from 'cc';
import { Fish, FISH_LIST } from './FishData';
const { ccclass, property } = _decorator;

/**
 * FishManager
 * 
 * This class manages fish sprites and provides a way to access them by string keys.
 * It also provides methods to access fish data.
 */
@ccclass('FishManager')
export class FishManager extends Component {
    /**
     * Map of string keys to sprite frames
     */
    @property({
        type: [SpriteFrame],
        tooltip: 'List of sprite frames to be managed'
    })
    private spriteFrames: SpriteFrame[] = [];

    // Internal map for quick lookups
    private spriteMap: Map<string, SpriteFrame> = new Map();

    start() {
        this.initializeSpriteMap();
    }

    /**
     * Initialize the internal map for fast lookups
     */
    public initializeSpriteMap() {
        this.spriteMap.clear();
        const spriteKeys: string[] = FISH_LIST.map(fish => fish.id);

        if (this.spriteFrames.length !== spriteKeys.length) {
            console.error('[FishManager] Number of sprite frames does not match number of sprite keys');
            return;
        }

        for (let i = 0; i < this.spriteFrames.length; i++) {
            if (this.spriteFrames[i] && spriteKeys[i]) {
                this.spriteMap.set(spriteKeys[i], this.spriteFrames[i]);
            }
        }

        console.log(`[FishManager] Initialized with ${this.spriteMap.size} sprites`);
    }

    /**
     * Get the sprite frame for a fish by its ID
     * @param id The unique identifier of the fish
     * @returns The sprite frame or null if not found
     */
    public getFishSpriteById(id: string): SpriteFrame | null {
        // find from the spriteMap and FISH_LIST
        const spriteFrame = this.spriteMap.get(id);
        if (spriteFrame) {
            return spriteFrame;
        }
        return null;
    }

    /**
     * Get a list of all available fish
     * @returns Array of all fish data
     */
    public getAllFish(): Fish[] {
        return [...FISH_LIST.map(fish => ({
            ...fish,
            sprite: this.getFishSpriteById(fish.id) || null
        }))];
    }
    
}

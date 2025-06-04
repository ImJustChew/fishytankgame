import { _decorator, Component, SpriteFrame } from 'cc';
import { AvatarData, AvatarDatabase } from './AvatarData';
const { ccclass, property } = _decorator;

/**
 * AvatarManager
 * 
 * This class manages avatar sprites and provides a way to access them by string keys.
 * It also provides methods to access avatar data.
 */
@ccclass('AvatarManager')
export class AvatarManager extends Component {
    /**
     * Map of string keys to sprite frames
     */
    @property({
        type: [SpriteFrame],
        tooltip: 'List of avatar sprite frames to be managed (must match order of AvatarDatabase.getAllAvatars())'
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
        const avatarList = AvatarDatabase.getAllAvatars();

        if (this.spriteFrames.length !== avatarList.length) {
            console.error(`[AvatarManager] Number of sprite frames (${this.spriteFrames.length}) does not match number of avatars (${avatarList.length})`);
            console.error('[AvatarManager] Please ensure sprite frames are added in the same order as avatars in AvatarDatabase');
            return;
        }

        for (let i = 0; i < this.spriteFrames.length; i++) {
            if (this.spriteFrames[i] && avatarList[i]) {
                this.spriteMap.set(avatarList[i].id, this.spriteFrames[i]);
            }
        }

        console.log(`[AvatarManager] Initialized with ${this.spriteMap.size} avatar sprites`);
        console.log('[AvatarManager] Avatar mappings:');
        avatarList.forEach((avatar, index) => {
            const hasSprite = this.spriteMap.has(avatar.id);
            console.log(`  [${index}] ${avatar.id} (${avatar.name}): ${hasSprite ? 'OK' : 'MISSING'}`);
        });
    }

    /**
     * Get the sprite frame for an avatar by its ID
     * @param id The unique identifier of the avatar
     * @returns The sprite frame or null if not found
     */
    public getAvatarSpriteById(id: string): SpriteFrame | null {
        const spriteFrame = this.spriteMap.get(id);
        if (spriteFrame) {
            return spriteFrame;
        }

        console.warn(`[AvatarManager] Sprite not found for avatar ID: ${id}`);
        return null;
    }

    /**
     * Get avatar data with sprite frame by ID
     * @param id The unique identifier of the avatar
     * @returns Avatar data with sprite frame or null if not found
     */
    public getAvatarWithSpriteById(id: string): (AvatarData & { sprite: SpriteFrame | null }) | null {
        const avatarData = AvatarDatabase.getAvatarById(id);
        if (!avatarData) {
            return null;
        }

        return {
            ...avatarData,
            sprite: this.getAvatarSpriteById(id)
        };
    }

    /**
     * Get a list of all available avatars with their sprite frames
     * @returns Array of all avatar data with sprite frames
     */
    public getAllAvatarsWithSprites(): (AvatarData & { sprite: SpriteFrame | null })[] {
        return AvatarDatabase.getAllAvatars().map(avatar => ({
            ...avatar,
            sprite: this.getAvatarSpriteById(avatar.id)
        }));
    }

    /**
     * Check if all avatars have corresponding sprite frames
     * @returns True if all avatars have sprites, false otherwise
     */
    public validateSpriteMapping(): boolean {
        const avatarList = AvatarDatabase.getAllAvatars();
        let allValid = true;

        for (const avatar of avatarList) {
            if (!this.spriteMap.has(avatar.id)) {
                console.error(`[AvatarManager] Missing sprite for avatar: ${avatar.id} (${avatar.name})`);
                allValid = false;
            }
        }

        return allValid;
    }

    /**
     * Get a random avatar with its sprite frame
     * @returns Random avatar data with sprite frame
     */
    public getRandomAvatarWithSprite(): (AvatarData & { sprite: SpriteFrame | null }) {
        const randomAvatar = AvatarDatabase.getRandomAvatar();
        return {
            ...randomAvatar,
            sprite: this.getAvatarSpriteById(randomAvatar.id)
        };
    }

    /**
     * Get the number of available sprite frames
     * @returns Number of sprite frames loaded
     */
    public getSpriteCount(): number {
        return this.spriteMap.size;
    }

    /**
     * Get a list of avatar IDs that have missing sprites
     * @returns Array of avatar IDs without sprite frames
     */
    public getMissingSprites(): string[] {
        const avatarList = AvatarDatabase.getAllAvatars();
        return avatarList
            .filter(avatar => !this.spriteMap.has(avatar.id))
            .map(avatar => avatar.id);
    }
}

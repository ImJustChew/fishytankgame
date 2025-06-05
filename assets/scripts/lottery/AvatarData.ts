import { _decorator, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Rarity levels for avatars
 */
export enum AvatarRarity {
    COMMON = 'common',
    RARE = 'rare',
    EPIC = 'epic',
    LEGENDARY = 'legendary'
}

/**
 * Avatar data structure
 */
export interface AvatarData {
    id: string;
    name: string;
    description: string;
    rarity: AvatarRarity;
    spritePath: string; // Path to the sprite asset
    dropRate: number; // Probability of getting this avatar (0-1)
}

/**
 * Static avatar database containing all available avatars
 */
export class AvatarDatabase {
    private static avatars: AvatarData[] = [
        // Common Avatars (70% total drop rate)
        {
            id: 'miku',
            name: 'Miku',
            description: 'A cheerful girl with twin-tails and bright energy.',
            rarity: AvatarRarity.COMMON,
            spritePath: 'player/gay',
            dropRate: 0.25
        },
        {
            id: 'sakura',
            name: 'Sakura',
            description: 'A sweet girl who loves cherry blossoms and spring.',
            rarity: AvatarRarity.COMMON,
            spritePath: 'player/may',
            dropRate: 0.25
        },
        {
            id: 'yuki',
            name: 'Yuki',
            description: 'A gentle soul with a love for winter and snow.',
            rarity: AvatarRarity.COMMON,
            spritePath: 'player/say',
            dropRate: 0.20
        },

        // Rare Avatars (20% total drop rate)
        {
            id: 'luna',
            name: 'Luna',
            description: 'A mysterious girl who shines under moonlight.',
            rarity: AvatarRarity.RARE,
            spritePath: 'player/day',
            dropRate: 0.10
        },
        {
            id: 'rin',
            name: 'Rin',
            description: 'An athletic girl with boundless determination.',
            rarity: AvatarRarity.RARE,
            spritePath: 'player/way',
            dropRate: 0.10
        },

        // Epic Avatars (8% total drop rate) 
        {
            id: 'aurora',
            name: 'Aurora',
            description: 'A magical girl with rainbow powers and sparkling aura.',
            rarity: AvatarRarity.EPIC,
            spritePath: 'player/pay',
            dropRate: 0.05
        }
    ];

    /**
     * Get all available avatars
     */
    public static getAllAvatars(): AvatarData[] {
        return [...this.avatars];
    }

    /**
     * Get avatar by ID
     */
    public static getAvatarById(id: string): AvatarData | null {
        return this.avatars.find(avatar => avatar.id === id) || null;
    }

    /**
     * Get avatars by rarity
     */
    public static getAvatarsByRarity(rarity: AvatarRarity): AvatarData[] {
        return this.avatars.filter(avatar => avatar.rarity === rarity);
    }

    /**
     * Get a random avatar based on drop rates
     */
    public static getRandomAvatar(): AvatarData {
        const random = Math.random();
        let cumulativeProbability = 0;

        for (const avatar of this.avatars) {
            cumulativeProbability += avatar.dropRate;
            if (random <= cumulativeProbability) {
                return avatar;
            }
        }

        // Fallback to first avatar if something goes wrong
        return this.avatars[0];
    }

    /**
     * Get rarity color for UI display
     */
    public static getRarityColor(rarity: AvatarRarity): string {
        switch (rarity) {
            case AvatarRarity.COMMON:
                return '#FFFFFF'; // White
            case AvatarRarity.RARE:
                return '#0088FF'; // Blue
            case AvatarRarity.EPIC:
                return '#AA00FF'; // Purple
            case AvatarRarity.LEGENDARY:
                return '#FFAA00'; // Gold
            default:
                return '#FFFFFF';
        }
    }

    /**
     * Get rarity display name
     */
    public static getRarityDisplayName(rarity: AvatarRarity): string {
        switch (rarity) {
            case AvatarRarity.COMMON:
                return 'Common';
            case AvatarRarity.RARE:
                return 'Rare';
            case AvatarRarity.EPIC:
                return 'Epic';
            case AvatarRarity.LEGENDARY:
                return 'Legendary';
            default:
                return 'Unknown';
        }
    }
}

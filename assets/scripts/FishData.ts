import { _decorator, SpriteFrame } from 'cc';

/**
 * Fish data structure
 * Represents the properties of a fish in the game
 */
export interface Fish {
    id: string;       // Unique identifier for the fish
    name: string;     // Name of the fish
    description: string; // Description of the fish
    price: number;    // Price of the fish
}

/**
 * Sample fish list
 * Contains predefined fish data
 */
export const FISH_LIST: Fish[] = [
    {
        id: "fish_001",
        name: "Clownfish",
        description: "A colorful reef fish with distinctive black stripes.",
        price: 50,
    },
    {
        id: "fish_002",
        name: "Blue Tang",
        description: "A vibrant blue fish known for its bright color.",
        price: 75,
    },
    {
        id: "fish_003",
        name: "Goldfish",
        description: "A common freshwater fish with a golden-orange color.",
        price: 30,
    },
    // Add more fish as needed
];

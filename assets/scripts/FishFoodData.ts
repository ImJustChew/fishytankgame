import { SpriteFrame } from 'cc';

/**
 * Fish food data structure
 * Represents the properties of a fish food item
 */
export interface FishFoodType {
    id: string;           // Unique identifier for the food
    name: string;         // Display name
    description: string;  // Description of the food
    fallSpeed: number;    // Fall speed in units per second
    health: number;
}

/**
 * Sample fish food list
 * Contains predefined fish food data
 */
export const FISH_FOOD_LIST: FishFoodType[] = [
    {
        id: "food_001",
        name: "Basic Pellets",
        description: "Standard food pellets suitable for most fish.",
        fallSpeed: 30,
        health: 10
    },
    {
        id: "food_002",
        name: "Sinking Granules",
        description: "Slow-sinking granules ideal for bottom feeders.",
        fallSpeed: 20,
        health: 20
    },
    {
        id: "food_003",
        name: "Floating Flakes",
        description: "Lightweight flakes that stay at the surface longer.",
        fallSpeed: 10,
        health: 10
    },
    // Add more food types as needed
];
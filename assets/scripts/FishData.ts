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
    health: number;
}

/**
 * Sample fish list
 * Contains predefined fish data
 */
export const FISH_LIST: Fish[] = [
    {
        id: "fish_001",
        name: "Ruby Brem",
        description: "A fiery red swimmer, known for its bold energy and school-loving nature.",
        price: 50,
        health: 100
    },
    {
        id: "fish_002",
        name: "Abyssal Pike",
        description: "Dwelling in the dark, this stealthy predator strikes from the shadows.",
        price: 75,
        health: 200
    },
    {
        id: "fish_003",
        name: "Nimlet",
        description: "Small but swift, Nimlets dart around with unmatched speed and curiosity.",
        price: 30,
        health: 50
    },
    {
        id: "fish_004",
        name: "Azure Snapper",
        description: "Calm and calculated, it prefers clean waters and peaceful tankmates.",
        price: 30,
        health: 70
    },
    {
        id: "fish_005",
        name: "Shiny Jack",
        description: "A rare, radiant fish that gleams under tank lights — a true collector's gem.",
        price: 30,
        health: 90
    },
    {
        id: "fish_006",
        name: "Crimson Koi",
        description: "A calm and noble swimmer, revered for its ruby-red scales and graceful glides through the tank.",
        price: 50,
        health: 300
    },
    {
        id: "fish_007",
        name: "Clownie Pop",
        description: "Bubbly and playful, Clownie Pop brings color and laughter to any underwater scene.",
        price: 40,
        health: 500
    }, 
    {
        id: "fish_008",
        name: "Regal Banner",
        description: "This royal-striped beauty glides with pride and elegance, often stealing the spotlight.",
        price: 70, 
        health: 900
    },
    {
        id: "fish_0009",
        name: "Verdant Darter",
        description: "Quick and curious, this green dart zips through currents like a leaf in the wind.",
        price: 35, 
        health: 10000
    }
    // Add more fish as needed
];

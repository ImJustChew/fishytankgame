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
    // NEW BATTLE PROPERTIES
    attackHP?: number;    // Combat health for attacking (0 = non-combatant)
    defenseHP?: number;   // Combat health for defending (0 = non-defender)
    attackDamage?: number;// Damage dealt per attack
    attackSpeed?: number; // Movement speed when attacking
    attackRange?: number; // Detection range for enemies
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
        price: 30,
        health: 30,
        defenseHP: 80,
        attackDamage: 15,
        attackSpeed: 60,
        attackRange: 100
    },
    {
        id: "fish_002",
        name: "Abyssal Pike",
        description: "Dwelling in the dark, this stealthy predator strikes from the shadows.",
        price: 30,
        health: 30,
        attackHP: 150,
        attackDamage: 35,
        attackSpeed: 80,
        attackRange: 120
    },
    {
        id: "fish_003",
        name: "Azure Snapper",
        description: "Calm and calculated, it prefers clean waters and peaceful tankmates.",
        price: 35,
        health: 40,
        defenseHP: 90,
        attackDamage: 12,
        attackSpeed: 50,
        attackRange: 90
    },
    {
        id: "fish_004",
        name: "Crimson Koi",
        description: "A calm and noble swimmer, revered for its ruby-red scales and graceful glides through the tank.",
        price: 50,
        health: 40,
        defenseHP: 250,
        attackDamage: 25,
        attackSpeed: 40,
        attackRange: 110
    },
    {
        id: "fish_005",
        name: "Shiny Jack",
        description: "A rare, radiant fish that gleams under tank lights — a true collector's gem.",
        price: 70,
        health: 50
        // Neutral fish - no battle stats
    },
    {
        id: "fish_006",
        name: "Nimlet",
        description: "Small but swift, Nimlets dart around with unmatched speed and curiosity.",
        price: 100,
        health: 50,
        attackHP: 40,
        attackDamage: 20,
        attackSpeed: 100,
        attackRange: 80
    },
    {
        id: "fish_007",
        name: "Clownie Pop",
        description: "Bubbly and playful, Clownie Pop brings color and laughter to any underwater scene.",
        price: 150,
        health: 50,
        defenseHP: 300,
        attackDamage: 18,
        attackSpeed: 55,
        attackRange: 95
    },
    {
        id: "fish_008",
        name: "Regal Banner",
        description: "This royal-striped beauty glides with pride and elegance, often stealing the spotlight.",
        price: 150,
        health: 40,
        attackHP: 600,
        defenseHP: 700,
        attackDamage: 40,
        attackSpeed: 70,
        attackRange: 130
    },
    {
        id: "fish_009",
        name: "Verdant Darter",
        description: "Quick and curious, this green dart zips through currents like a leaf in the wind.",
        price: 500,
        health: 70,
        attackHP: 8000,
        attackDamage: 100,
        attackSpeed: 120,
        attackRange: 150
    }
    // Add more fish as needed
];

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
    moneyPerSecond: number; // Money earned per second
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
        name: "Ruby",
        description: "A fiery red swimmer, known for its bold energy and school-loving nature. Perfect starter fish. Generates 1 coin per second.",
        price: 10,
        health: 30,
        moneyPerSecond: 0.1,
        defenseHP: 80,
        attackDamage: 15,
        attackSpeed: 60,
        attackRange: 100
    },
    {
        id: "fish_002",
        name: "Shadow",
        description: "Dwelling in the dark, this stealthy predator strikes from the shadows. Generates 2.5 coins per second.",
        price: 25,
        health: 35,
        moneyPerSecond: 0.25,
        attackHP: 150,
        attackDamage: 35,
        attackSpeed: 80,
        attackRange: 120
    },
    {
        id: "fish_003",
        name: "Azure",
        description: "Calm and calculated, it prefers clean waters and peaceful tankmates. Generates 6 coins per second.",
        price: 60,
        health: 40,
        moneyPerSecond: 0.6,
        defenseHP: 90,
        attackDamage: 12,
        attackSpeed: 50,
        attackRange: 90
    },
    {
        id: "fish_004",
        name: "Koi",
        description: "A calm and noble swimmer, revered for its ruby-red scales and graceful glides through the tank. Generates 15 coins per second.",
        price: 150,
        health: 45,
        moneyPerSecond: 1.5,
        defenseHP: 250,
        attackDamage: 25,
        attackSpeed: 40,
        attackRange: 110
    },
    {
        id: "fish_005",
        name: "Sparkle",
        description: "A rare, radiant fish that gleams under tank lights — a true collector's gem. Generates 40 coins per second.",
        price: 400,
        health: 50,
        moneyPerSecond: 4
        // Neutral fish - no battle stats
    },
    {
        id: "fish_006",
        name: "Dash",
        description: "Small but swift, Dash darts around with unmatched speed and curiosity. Generates 100 coins per second.",
        price: 1000,
        health: 55,
        moneyPerSecond: 10,
        attackHP: 40,
        attackDamage: 20,
        attackSpeed: 100,
        attackRange: 80
    },
    {
        id: "fish_007",
        name: "Bubbles",
        description: "Bubbly and playful, Bubbles brings color and laughter to any underwater scene. Generates 250 coins per second.",
        price: 2500,
        health: 60,
        moneyPerSecond: 25,
        defenseHP: 300,
        attackDamage: 18,
        attackSpeed: 55,
        attackRange: 95
    },
    {
        id: "fish_008",
        name: "Majesty",
        description: "This royal-striped beauty glides with pride and elegance, often stealing the spotlight. Generates 600 coins per second.",
        price: 6000,
        health: 65,
        moneyPerSecond: 60,
        attackHP: 600,
        defenseHP: 700,
        attackDamage: 40,
        attackSpeed: 70,
        attackRange: 130
    },
    {
        id: "fish_009",
        name: "Emerald",
        description: "Quick and curious, this green dart zips through currents like a leaf in the wind. The ultimate fish! Generates 1500 coins per second.",
        price: 15000,
        health: 70,
        moneyPerSecond: 150,
        attackHP: 8000,
        attackDamage: 100,
        attackSpeed: 120,
        attackRange: 150
    }
    // Add more fish as needed
];

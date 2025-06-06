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
        description: "A vibrant red starter fish bursting with energy! Ruby loves to swim in schools and brings good fortune to your tank. Earns 1 coin per second.",
        price: 10,
        health: 30,
        moneyPerSecond: 1.0, // Increased from 0.1
        defenseHP: 80,
        attackDamage: 15,
        attackSpeed: 60,
        attackRange: 100
    },
    {
        id: "fish_002",
        name: "Shadow",
        description: "This mysterious dark swimmer strikes from the depths! Shadow is a stealthy predator with a knack for finding hidden treasures. Earns 3 coins per second.",
        price: 25,
        health: 35,
        moneyPerSecond: 3.0, // Increased from 0.25
        attackHP: 150,
        attackDamage: 35,
        attackSpeed: 80,
        attackRange: 120
    },
    {
        id: "fish_003",
        name: "Azure",
        description: "A serene blue beauty that brings peace and prosperity to any tank. Azure's calm demeanor masks incredible earning potential. Earns 8 coins per second.",
        price: 60,
        health: 40,
        moneyPerSecond: 8.0, // Increased from 0.6
        defenseHP: 90,
        attackDamage: 12,
        attackSpeed: 50,
        attackRange: 90
    },
    {
        id: "fish_004",
        name: "Koi",
        description: "The legendary fortune fish! This majestic koi with ruby-red scales is said to bring wealth and wisdom to its owner. Earns 20 coins per second.",
        price: 150,
        health: 45,
        moneyPerSecond: 20.0, // Increased from 1.5
        defenseHP: 250,
        attackDamage: 25,
        attackSpeed: 40,
        attackRange: 110
    },
    {
        id: "fish_005",
        name: "Sparkle",
        description: "A dazzling gem of the aquatic world! Sparkle's radiant scales catch every ray of light, creating a mesmerizing light show while generating wealth. Earns 60 coins per second.",
        price: 400,
        health: 50,
        moneyPerSecond: 60.0 // Increased from 4
        // Neutral fish - no battle stats
    },
    {
        id: "fish_006",
        name: "Dash",
        description: "Lightning in fish form! Dash zips around at incredible speeds, collecting coins faster than the eye can see. A true speed demon! Earns 150 coins per second.",
        price: 1000,
        health: 55,
        moneyPerSecond: 150.0, // Increased from 10
        attackHP: 40,
        attackDamage: 20,
        attackSpeed: 100,
        attackRange: 80
    },
    {
        id: "fish_007",
        name: "Bubbles",
        description: "Pure joy in aquatic form! Bubbles creates magical streams of treasure-filled bubbles that burst with coins. Happiness has never been so profitable! Earns 400 coins per second.",
        price: 2500,
        health: 60,
        moneyPerSecond: 400.0, // Increased from 25
        defenseHP: 300,
        attackDamage: 18,
        attackSpeed: 55,
        attackRange: 95
    },
    {
        id: "fish_008",
        name: "Majesty",
        description: "Royalty personified! This regal fish commands respect and generates imperial wealth. Majesty's presence alone elevates your entire tank to nobility. Earns 1,000 coins per second.",
        price: 6000,
        health: 65,
        moneyPerSecond: 1000.0, // Increased from 60
        attackHP: 600,
        defenseHP: 700,
        attackDamage: 40,
        attackSpeed: 70,
        attackRange: 130
    },
    {
        id: "fish_009",
        name: "Emerald",
        description: "The ultimate aquatic treasure! This legendary emerald fish is said to possess ancient powers of prosperity. Owning one guarantees a fortune beyond imagination! Earns 2,500 coins per second.",
        price: 15000,
        health: 70,
        moneyPerSecond: 2500.0, // Increased from 150
        attackHP: 8000,
        attackDamage: 100,
        attackSpeed: 120,
        attackRange: 150
    }
    // Add more fish as needed
];

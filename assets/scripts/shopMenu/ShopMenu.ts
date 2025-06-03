import { _decorator, Component, Node, Label, Button, Prefab, instantiate, ScrollView, UITransform } from 'cc';
import databaseService, { SavedFishType } from '../firebase/database-service';
import authService from '../firebase/auth-service';
import { ShopItemUI } from './ShopItemUI';

const { ccclass, property } = _decorator;

// Define a shop item structure
interface ShopItem {
    type: string;
    name: string;
    price: number;
    description: string;
}

@ccclass('ShopMenu')
export class ShopMenu extends Component {
    @property(ScrollView)
    itemScrollView: ScrollView | null = null;

    @property(Node)
    itemContainer: Node | null = null;
    
    @property(Prefab)
    shopItemPrefab: Prefab | null = null;
    
    @property(Label)
    playerMoneyLabel: Label | null = null;
    
    private shopItems: ShopItem[] = [
        { type: 'goldfish', name: 'Goldfish', price: 50, description: 'A common but beautiful fish' },
        { type: 'clownfish', name: 'Clownfish', price: 100, description: 'A colorful reef fish' },
        { type: 'angelfish', name: 'Angelfish', price: 150, description: 'An elegant freshwater fish' },
        { type: 'guppy', name: 'Guppy', price: 30, description: 'A small, colorful fish' },
        { type: 'tetra', name: 'Tetra', price: 40, description: 'A small, schooling fish' },
    ];
    
    private playerMoney: number = 0;
    
    start() {
        this.loadPlayerMoney();
        this.populateShopItems();
    }
    
    async loadPlayerMoney() {
        const userData = await databaseService.getUserData();
        if (userData) {
            this.playerMoney = userData.money || 0;
            this.updateMoneyDisplay();
        }
    }
    
    updateMoneyDisplay() {
        if (this.playerMoneyLabel) {
            this.playerMoneyLabel.string = `Money: ${this.playerMoney}`;
        }
    }
    
    populateShopItems() {
        if (!this.itemContainer || !this.shopItemPrefab) {
            console.error('Shop item container or prefab not assigned');
            return;
        }
        
        // Clear existing items
        this.itemContainer.removeAllChildren();
        
        // Add shop items
        this.shopItems.forEach((item, index) => {
            const itemNode = instantiate(this.shopItemPrefab);
            this.itemContainer.addChild(itemNode);
            
            // Get the ShopItemUI component
            const shopItemUI = itemNode.getComponent(ShopItemUI);
            if (shopItemUI) {
                // Set item data
                shopItemUI.setItemData(item.name, item.price, item.description);
                
                // Set up buy button
                const buyButton = shopItemUI.buyButton || itemNode.getChildByName('BuyButton')?.getComponent(Button);
                if (buyButton) {
                    buyButton.node.on(Node.EventType.TOUCH_END, () => {
                        this.buyItem(item);
                    });
                }
            }
        });
    }
    
    async buyItem(item: ShopItem) {
        if (this.playerMoney < item.price) {
            console.log('Not enough money to buy this fish');
            // Show notification to player
            return;
        }
        
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot buy fish: No user is signed in');
            return;
        }
        
        try {
            // Create new fish data
            const newFish: SavedFishType = {
                ownerId: user.uid,
                type: item.type,
                health: 100,
                lastFedTime: Date.now()
            };
            
            // Add fish to database
            await databaseService.addFish(newFish);
            
            // Update player money
            this.playerMoney -= item.price;
            await databaseService.updateUserMoney(this.playerMoney);
            this.updateMoneyDisplay();
            
            console.log(`Successfully purchased ${item.name}`);
            // Show success notification
        } catch (error) {
            console.error('Error purchasing fish:', error);
            // Show error notification
        }
    }
    
    show() {
        this.node.active = true;
        this.loadPlayerMoney();
    }
    
    hide() {
        this.node.active = false;
    }
}


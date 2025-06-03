import { _decorator, Component, Node, Label, Sprite, Button } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ShopItemUI')
export class ShopItemUI extends Component {
    @property(Label)
    nameLabel: Label | null = null;
    
    @property(Label)
    priceLabel: Label | null = null;
    
    @property(Label)
    descriptionLabel: Label | null = null;
    
    @property(Sprite)
    fishSprite: Sprite | null = null;
    
    @property(Button)
    buyButton: Button | null = null;
    
    private itemPrice: number = 0;
    
    setItemData(name: string, price: number, description: string) {
        if (this.nameLabel) this.nameLabel.string = name;
        if (this.priceLabel) this.priceLabel.string = `Price: ${price}`;
        if (this.descriptionLabel) this.descriptionLabel.string = description;
        this.itemPrice = price;
    }
    
    getPrice(): number {
        return this.itemPrice;
    }
}


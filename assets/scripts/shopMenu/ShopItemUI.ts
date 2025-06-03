import { _decorator, Component, Node, Label, Sprite } from 'cc';
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
}
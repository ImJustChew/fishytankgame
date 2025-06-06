// Assets/scripts/shop/FishItem.ts
import { _decorator, Component, Label, Button, Sprite, SpriteFrame } from 'cc';
import { AudioManager } from '../AudioManager';
const { ccclass, property } = _decorator;

/**
 * FishItem：單筆魚條目的 Prefab 腳本
 * 透過 init() 填入：id / name / description / price / 以及對應的 SpriteFrame
 */
@ccclass('FishItem')
export class FishItem extends Component {
    @property(Sprite)  fishSprite: Sprite   = null!;   // 新增：用來顯示魚圖
    @property(Label)   nameLabel: Label     = null!;   // 顯示魚名稱
    @property(Label)   descLabel: Label     = null!;   // 顯示魚描述
    @property(Label)   priceLabel: Label    = null!;   // 顯示價格
    @property(Button)  buyButton: Button    = null!;   // 購買按鈕

    private fishId: string    = "";
    private unitPrice: number = 0;

    /**
     * 初始化：把資料填入所有 UI 元件
     * @param id    - 魚的唯一識別字串 (對應 FishData.id)
     * @param name  - 魚的名稱
     * @param desc  - 魚的描述
     * @param price - 魚的單價
     * @param sprite - 從 FishManager 拿到的 SpriteFrame
     */
    public init(
        id: string,
        name: string,
        desc: string,
        price: number,
        sprite: SpriteFrame | null
    ) {
        this.fishId     = id;
        this.nameLabel.string   = name;
        this.descLabel.string   = desc;
        this.priceLabel.string  = `$${price}`;
        this.unitPrice  = price;

        // 如果外部有給 SpriteFrame，動態設置給 fishSprite
        if (sprite) {
            this.fishSprite.spriteFrame = sprite;
        } else {
            // 若沒對應圖，可選擇設一張預設空白圖或什麼都不做
            this.fishSprite.spriteFrame = null;
        }

        // 綁定 BUY 按鈕
        this.buyButton.node.off(Button.EventType.CLICK, this.onBuyClicked, this);
        this.buyButton.node.on(Button.EventType.CLICK, this.onBuyClicked, this);
    }

    private onBuyClicked() {
        // Play purchase sound effect
        const audioManager = AudioManager.getInstance();
        if (audioManager) {
            audioManager.playSFX('button_click');
        }

        // 點擊 BUY 後發射事件，父層 (ShopManager) 會處理扣款/生成魚
        this.node.emit('buy-fish', {
            detail: {  // Add detail property to match expected structure
                id: this.fishId,
                price: this.unitPrice,
            }
        });
    }
    public getBuyButton(): Button {
        return this.buyButton;
    }
}

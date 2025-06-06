// Assets/Scripts/shop/ShopManager.ts
import { _decorator, Component, Prefab, instantiate, ScrollView, Label, Node, UITransform, Color, Button, director } from 'cc';
import { FishItem } from './FishItem';
import { FISH_LIST, Fish } from '../FishData';
import { FishManager } from '../FishManager';
import { purchaseFish } from './purchaseFish';
import databaseService, { UserData } from '../firebase/database-service';
import { AudioManager } from '../AudioManager';

const { ccclass, property } = _decorator;

@ccclass('ShopManager')
export class ShopManager extends Component {
  @property(Prefab)
  public fishItemPrefab: Prefab = null!;

  @property(ScrollView)
  public scrollView: ScrollView = null!;

  @property(FishManager)
  public fishManager: FishManager = null!;

  @property
  public defaultMoney = 100;

  @property(Label)
  public warningLabel: Label = null!;

  @property(Button)
  public exitButton: Button = null!; 

  @property
  public warningDuration = 3; // 警告显示时间（秒）

  @property(Label)
  public balanceLabel: Label = null!;

  private money = 0;

  /*onload() {
    // bind exit button click event
    
  }*/

  async start() {
    await this.fetchOrInitMoney();
    this.populateFishList();
    this.updateBalanceDisplay();

    // 初始化警告标签
    if (this.warningLabel) {
      this.warningLabel.node.active = false;
    }
    if (this.exitButton) {
      this.exitButton.node.on(Button.EventType.CLICK, () => {
        console.log('Exit button clicked, returning to main menu');
        director.loadScene('aquarium');
      });
    }
  }

  private async fetchOrInitMoney() {
    const userData: UserData | null = await databaseService.getUserData();
    if (!userData) {
      console.warn('ShopManager: 用户未登录或无法读取数据，使用默认金钱');
      this.money = this.defaultMoney;
      this.updateBalanceDisplay();
      return;
    }
    if (typeof userData.money !== 'number') {
      this.money = this.defaultMoney;
      await databaseService.updateUserMoney(this.money);
    } else {
      this.money = userData.money;
    }
    this.updateBalanceDisplay();
  }

  private populateFishList() {
    const contentNode: Node = this.scrollView.content!;
    contentNode.removeAllChildren();

    // 这里不再调用 getAllFish（包含 sprite）的方式，
    // 而是分别从 FISH_LIST 拿数据 + 从 FishManager 拿 spriteFrame
    for (const fishData of FISH_LIST) {
      const fishNode = instantiate(this.fishItemPrefab);
      const fishComp = fishNode.getComponent(FishItem)!;

      // 1. 拿到这条 fishData.id 对应的 SpriteFrame
      const spriteFrame = this.fishManager.getFishSpriteById(fishData.id);

      // 2. 调用 init：传 id/name/description/price + 刚取到的 spriteFrame
      fishComp.init(
        fishData.id,
        fishData.name,
        fishData.description,
        fishData.price,
        spriteFrame // 可能是 null
      );

      // 3. 监听 buy-fish 事件
      fishNode.on('buy-fish', this.onFishBought, this);

      contentNode.addChild(fishNode);
    }
  }

  private async onFishBought(event: any) {
    // Add more detailed logging to debug the event
    console.log('onFishBought event:', event);
    console.log('Event target:', event.target);
    console.log('Event type:', event.type);

    // Check if event itself has id and price properties
    const detail = (event && event.detail) ?
      event.detail as { id: string; price: number } :
      (event && event.id && event.price) ?
        { id: event.id, price: event.price } :
        undefined;

    if (!detail) {
      // Event triggered without proper detail
      console.warn('onFishBought: Received event without detail, ignoring');
      return;
    }
    const { id: typeId, price } = detail;
    if (this.money < price) {
      console.log(`Not enough money to buy ${typeId}`);
      this.showWarning(`Insufficient funds! Need $${price}, current balance: $${this.money}`);
      return;
    }

    try {
      await purchaseFish(typeId);
      this.money -= price;
      this.updateBalanceDisplay();
      
      // Find the fish name from FISH_LIST
      const fishData = FISH_LIST.find(fish => fish.id === typeId);
      const fishName = fishData ? fishData.name : typeId;
      
      console.log(`Fish purchased: ${fishName}, remaining balance: $${this.money}`);

      // Play success sound
      const audioManager = AudioManager.getInstance();
      if (audioManager) {
        // Try to play purchase_success, fallback to a generic sound if not found
        try {
          audioManager.playSFX('purchase_success');
        } catch (e) {
          console.log('purchase_success sound not found, using fallback sound');
          // Try to use button_click or another existing sound as fallback
          audioManager.playSFX('button_click');
        }
      }

      // Show success message in warning label with green color
      this.showWarning(`Successfully purchased ${fishName}!`, new Color(50, 200, 50, 255));

      // Only update the buy button state if event.target exists
      if (event && event.target) {
        const fishItem = event.target.getComponent(FishItem);
        if (fishItem) {
          const buyButton = fishItem.getBuyButton();
          if (buyButton) {
            buyButton.interactable = false;
            
            // Update button label directly
            buyButton.getComponent(Label).string = 'Purchased';
          }
        }
      } else {
        console.warn('Purchase successful but event.target is undefined');
      }
    } catch (err: any) {
      console.error(`Purchase failed: ${err.message}`);
      
      // Play error sound
      const audioManager = AudioManager.getInstance();
      if (audioManager) {
        audioManager.playSFX('purchase_failed');
      }
      
      // Show error message in warning label (default red color)
      if (err.message === 'INSUFFICIENT_FUNDS') {
        this.showWarning('Purchase failed: Insufficient funds');
      } else if (err.message === 'USER_NOT_LOGGED_IN') {
        this.showWarning('Purchase failed: User not logged in');
      } else {
        this.showWarning(`Purchase failed: ${err.message}`);
      }
    }
  }

  /**
   * 显示警告信息
   * @param message 警告信息
   */
  private showWarning(message: string, color: Color = new Color(255, 100, 100, 255)) {
    if (!this.warningLabel) return;

    // 设置警告文本
    this.warningLabel.string = message;

    // 设置警告颜色
    this.warningLabel.color = color;

    // 显示警告
    this.warningLabel.node.active = true;

    // 设置定时器，几秒后自动隐藏
    this.scheduleOnce(() => {
      if (this.warningLabel) {
        this.warningLabel.node.active = false;
      }
    }, this.warningDuration);
  }

  private updateBalanceDisplay() {
    if (this.balanceLabel) {
      this.balanceLabel.string = `Balance: $${this.money}`;
      
      // Change color based on balance amount
      if (this.money > 500) {
        // Rich - green color
        this.balanceLabel.color = new Color(50, 200, 50, 255);
      } else if (this.money > 100) {
        // Moderate - blue color
        this.balanceLabel.color = new Color(50, 150, 255, 255);
      } else if (this.money > 50) {
        // Low - yellow color
        this.balanceLabel.color = new Color(255, 200, 50, 255);
      } else {
        // Very low - red color
        this.balanceLabel.color = new Color(255, 100, 100, 255);
      }
    }
  }
}

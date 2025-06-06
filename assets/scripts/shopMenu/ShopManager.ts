// Assets/Scripts/shop/ShopManager.ts
import { _decorator, Component, Prefab, instantiate, ScrollView, Label, Node, UITransform, Color, Button, director } from 'cc';
import { FishItem } from './FishItem';
import { FISH_LIST, Fish } from '../FishData';
import { FishManager } from '../FishManager';

// 下面两行假设你已经在 Assets/Scripts/shop/ 目录里
import { purchaseFish } from './purchaseFish';
import databaseService, { UserData } from '../firebase/database-service';

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

  private money = 0;

  /*onload() {
    // bind exit button click event
    
  }*/

  async start() {
    await this.fetchOrInitMoney();
    this.populateFishList();

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
      return;
    }
    if (typeof userData.money !== 'number') {
      this.money = this.defaultMoney;
      await databaseService.updateUserMoney(this.money);
    } else {
      this.money = userData.money;
    }
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
      console.log(`Fish purchased: ${typeId}, remaining balance: $${this.money}`);

      const fishNode = event.target as Node;
      const fishButtonLabel = fishNode.getComponentInChildren(Label);
      if (fishButtonLabel) {
        fishButtonLabel.string = 'Purchased';
      }
      const buyBtnComp = fishNode.getComponent(FishItem)?.getBuyButton();
      if (buyBtnComp) {
        buyBtnComp.interactable = false;
      }
    } catch (err: any) {
      console.error(`Purchase failed: ${err.message}`);
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
  private showWarning(message: string) {
    if (!this.warningLabel) return;

    // 设置警告文本
    this.warningLabel.string = message;

    // 设置警告颜色（红色）
    this.warningLabel.color = new Color(255, 100, 100, 255);

    // 显示警告
    this.warningLabel.node.active = true;

    // 设置定时器，几秒后自动隐藏
    this.scheduleOnce(() => {
      if (this.warningLabel) {
        this.warningLabel.node.active = false;
      }
    }, this.warningDuration);
  }
}

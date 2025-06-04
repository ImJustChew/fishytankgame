// Assets/Scripts/shop/ShopManager.ts
import { _decorator, Component, Prefab, instantiate, ScrollView, Label, Node } from 'cc';
import { FishItem }        from './FishItem';
import { FISH_LIST, Fish } from '../FishData';
import { FishManager }      from '../FishManager';

// 下面两行假设你已经在 Assets/Scripts/shop/ 目录里
import { purchaseFish }     from './purchaseFish';
import databaseService, { UserData } from '../firebase/database-service';

const { ccclass, property } = _decorator;

@ccclass('ShopManager')
export class ShopManager extends Component {
  @property(Prefab)
  public fishItemPrefab: Prefab = null!;

  @property(ScrollView)
  public scrollView: ScrollView = null!;

  @property(Label)
  public moneyLabel: Label = null!;

  @property(FishManager)
  public fishManager: FishManager = null!;

  @property
  public defaultMoney = 100;

  private money = 0;

  async start() {
    await this.fetchOrInitMoney();
    this.populateFishList();
  }

  private async fetchOrInitMoney() {
    const userData: UserData | null = await databaseService.getUserData();
    if (!userData) {
      console.warn('ShopManager: 用户未登录或无法读取数据，使用默认金钱');
      this.money = this.defaultMoney;
      this.moneyLabel.string = `Money: $${this.money}`;
      return;
    }
    if (typeof userData.money !== 'number') {
      this.money = this.defaultMoney;
      await databaseService.updateUserMoney(this.money);
    } else {
      this.money = userData.money;
    }
    this.moneyLabel.string = `Money: $${this.money}`;
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
        // 说明这个回调被意外地触发了一个没有 detail 的事件
        console.warn('onFishBought: 收到一个没有 detail 的事件，直接忽略');
        return;
    }
    const { id: typeId, price } = detail;
    if (this.money < price) {
      console.log(`钱不够，买不了 ${typeId}`);
      return;
    }

    try {
      await purchaseFish(typeId);
      this.money -= price;
      this.moneyLabel.string = `Money: $${this.money}`;
      console.log(`已购买鱼 ${typeId}，剩余 $${this.money}`);

      const fishNode = event.target as Node;
      const fishButtonLabel = fishNode.getComponentInChildren(Label);
      if (fishButtonLabel) {
        fishButtonLabel.string = '已购买';
      }
      const buyBtnComp = fishNode.getComponent(FishItem)?.getBuyButton();
      if (buyBtnComp) {
        buyBtnComp.interactable = false;
      }
    } catch (err: any) {
      console.error(`购买失败: ${err.message}`);
      if (err.message === 'INSUFFICIENT_FUNDS') {
        console.warn('购买失败：金钱不足');
      } else if (err.message === 'USER_NOT_LOGGED_IN') {
        console.warn('购买失败：用户未登录');
      } else {
        console.error('购买时发生其他错误：', err);
      }
    }
  }
}

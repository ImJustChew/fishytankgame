import {
  _decorator,
  Animation,
  AnimationState,
  CCString,
  Collider2D,
  Color,
  Component,
  Contact2DType,
  Enum,
  Node,
  Sprite
} from 'cc';
import { FishConfig, FishType } from './types/index.d';
import { EventManager } from './EventManager';
import { Bullet } from './Bullet';
const { ccclass, property } = _decorator;

Enum(FishType);

@ccclass('MiniGameFish')
export class Fish extends Component {
  // 魚隻類型
  @property({ type: FishType })
  public fishType: FishType = FishType.Fish_01;
  
  // 魚隻血量 (based on fish type)
  @property
  public maxHealth: number = 100;
  
  @property
  public currentHealth: number = 100;
  
  // 圖片 Node
  @property(Node)
  public bodyNode: Node = null;
  // 圖片 Animation
  @property(Animation)
  public bodyAnimation: Animation = null;
  // 倍率 Node
  @property(Node)
  public multiplierNode: Node = null;
  // X Node
  @property(Node)
  public closeNode: Node = null;

  // 可以被攻擊的狀態
  public isHittable: boolean = true;

  private _speed: number = 200;
  private _collider: Collider2D = null;
  private _uuid: string = '';
  private _fishId: string = '';
  private _spawnX: number = 0;
  private _spawnTime: number = 0;
  private _maxLifeTime: number = 0;
  private _color: Color = new Color(255, 255, 255, 255);
  private _stopUpdating: boolean = false;

  protected onLoad(): void {
    // 設定動畫事件
    if (this.bodyAnimation) {
      this.bodyAnimation.on(
        Animation.EventType.FINISHED,
        this.onAnimationFinished,
        this
      );
    }

    // 設定碰撞元件
    this._collider = this.getComponent(Collider2D);
    if (this._collider) {
      this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    }
  }

  protected onEnable(): void {
    this.reset();
  }

  update(deltaTime: number) {
    if (this._stopUpdating) return;
    
    const now = Date.now();
    // 單位(秒)
    const elapsedTime = (now - this._spawnTime) / 1000;
    // 魚隻在這段時間應該要移動的距離
    const distance = this._speed * elapsedTime;
    const currentX = this._spawnX - distance;
    const position = this.node.position;
    this.node.setPosition(currentX, position.y, position.z);

    // 如果魚隻超出邊界，就回收魚隻
    if (currentX <= -this._spawnX || elapsedTime > this._maxLifeTime) {
      this.stopAction();
    }
  }

  protected onDestroy(): void {
    // 註銷動畫事件
    if (this.bodyAnimation) {
      this.bodyAnimation.off(
        Animation.EventType.FINISHED,
        this.onAnimationFinished,
        this
      );
    }

    // 註銷碰撞事件
    if (this._collider) {
      this._collider.off(
        Contact2DType.BEGIN_CONTACT,
        this.onBeginContact,
        this
      );
    }
  }

  // 重置魚隻狀態
  reset() {
    // 重置魚隻狀態
    this.isHittable = true;
    this._stopUpdating = false;
    
    // Reset health based on fish type
    this.resetHealthByType();
    this.currentHealth = this.maxHealth;
    
    // 重置倍率,x Node
    this.multiplierNode.active = false;
    this.closeNode.active = false;
    // 重置圖片 Node
    this.bodyNode.active = true;
    this.bodyNode.setScale(1, 1, 1);
    this.bodyNode.getComponent(Sprite).color = this._color;
    this.bodyAnimation.play('FishSwim');
  }

  // Set health based on fish type
  resetHealthByType() {
    switch (this.fishType) {
      case FishType.Fish_01: // 小丑魚 - low health
        this.maxHealth = 50;
        break;
      case FishType.Fish_02: // 熱帶魚 - medium health
        this.maxHealth = 100;
        break;
      case FishType.Fish_03: // 河豚 - medium-high health
        this.maxHealth = 150;
        break;
      case FishType.Fish_04: // 章魚 - high health
        this.maxHealth = 250;
        break;
      case FishType.Fish_05: // 鯊魚 - very high health
        this.maxHealth = 400;
        break;
      default:
        this.maxHealth = 100;
        break;
    }
  }

  // Take damage from bullet
  takeDamage(damage: number): boolean {
    // 确保伤害至少为1
    const actualDamage = Math.max(1, damage);
    this.currentHealth -= actualDamage;
    console.log(`Fish ${this._fishId} took ${actualDamage} damage. Health: ${this.currentHealth}/${this.maxHealth}`);
    
    if (this.currentHealth <= 0) {
      // Fish is killed - award points and destroy immediately
      this.currentHealth = 0;
      this.awardPointsAndDestroy();
      return true; // Fish died
    }
    return false; // Fish still alive
  }

  // Award points and destroy fish immediately
  awardPointsAndDestroy() {
    const points = this.calculatePoints();
    console.log(`Fish ${this._fishId} killed! Awarding ${points} points`);
    
    // Emit fish killed event with points
    console.log('Emitting fish-killed event with points:', points);
    EventManager.eventTarget.emit('fish-killed', {
      fishId: this._fishId,
      uuid: this._uuid,
      points: points,
      fishType: this.fishType,
      position: this.node.position
    });
    
    // Destroy fish immediately
    this.stopAction();
  }

  // Calculate points based on fish type
  private calculatePoints(): number {
    let points = 100; // 默认值
    
    switch (this.fishType) {
      case FishType.Fish_01: points = 100; break;  // 小丑魚
      case FishType.Fish_02: points = 200; break;  // 熱帶魚
      case FishType.Fish_03: points = 300; break;  // 河豚
      case FishType.Fish_04: points = 500; break;  // 章魚
      case FishType.Fish_05: points = 1000; break; // 鯊魚
      default: points = 100; break;
    }
    
    console.log(`Fish type ${this.fishType} awards ${points} points`);
    return points;
  }

  // 終止魚隻行為
  stopAction() {
    // 停止可被攻擊狀態
    this.isHittable = false;
    // 發布事件(FishManager.ts 訂閱)
    EventManager.eventTarget.emit('stop-fish', this.node, this);
  }

  // 更新魚隻狀態，並回傳{ uuid, this }，方便 FishManager.ts 使用
  updateFishData(fish: FishConfig) {
    this._uuid = fish.uuid;
    this._speed = fish.speed;
    this._fishId = fish.id;
    this._spawnX = fish.spawnX;
    this._spawnTime = fish.spawnTime;
    this._maxLifeTime = fish.maxLifeTime;
    
    // 根据鱼的类型设置初始生命值
    switch (this.fishType) {
      case FishType.Fish_01: 
        this.maxHealth = 50;
        break;
      case FishType.Fish_02: 
        this.maxHealth = 100;
        break;
      case FishType.Fish_03: 
        this.maxHealth = 150;
        break;
      case FishType.Fish_04: 
        this.maxHealth = 200;
        break;
      case FishType.Fish_05: 
        this.maxHealth = 300;
        break;
      default: 
        this.maxHealth = 100;
        break;
    }
    
    // 重置当前生命值为最大生命值
    this.currentHealth = this.maxHealth;
    console.log(`Fish ${this._fishId} initialized with health: ${this.currentHealth}/${this.maxHealth}`);
    
    return { uuid: this._uuid, fishInstance: this };
  }

  // 還原可攻擊狀態
  resetHittable() {
    this.isHittable = true;
    this.playHitAnimation();
  }

  // 中獎處理
  freezeAction() {
    // 魚隻停止移動
    this._stopUpdating = true;
    this.playZoomOutAnimation();
  }

  playHitAnimation() {
    this.bodyAnimation.stop();
    this.bodyAnimation.play('FishHit');
  }

  // 播放 ZoomOut 動畫
  playZoomOutAnimation() {
    this.bodyAnimation.stop();
    this.bodyAnimation.play('FishZoomOut');
  }

  // 動畫播放結束
  onAnimationFinished(type: Animation.EventType, state: AnimationState) {
    if (state.name === 'FishHit') {
      // 恢復游泳動畫
      this.bodyAnimation.play('FishSwim');
    }
  }

  // 碰撞開始
  onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D) {
    // 確保魚是可以被擊中的狀態
    if (!this.isHittable) {
      console.log('Fish not hittable at this time');
      return;
    }
    
    const bullet = otherCollider.getComponent(Bullet);
    // 如果是子彈才處理
    if (!bullet) {
      console.log('Collision with non-bullet object');
      return;
    }
    
    // 魚隻被擊中
    this.isHittable = false;
    console.log('Hit Fish: ', this._fishId, 'with bullet damage:', bullet.damage);
    
    // Get bullet damage
    const bulletDamage = bullet.damage;
    
    // Apply damage
    console.log('Before damage - Fish health:', this.currentHealth, '/', this.maxHealth);
    const fishDied = this.takeDamage(bulletDamage);
    console.log('After damage - Fish health:', this.currentHealth, '/', this.maxHealth, 'Fish died:', fishDied);
    
    // 停用「子彈」的碰撞元件（停止檢測碰撞）
    bullet.closeCollider();
    // 停用子彈行為
    bullet.stopAction();
    
    // 重置可擊中狀態（延遲一段時間後）
    this.scheduleOnce(() => {
      this.isHittable = true;
    }, 0.5);
  }
}

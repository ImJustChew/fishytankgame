import { 
  _decorator, 
  CCInteger, 
  Collider2D, 
  Component, 
  Contact2DType,
  Enum, 
  RigidBody2D,  // ✅ ADD IMPORT
  Vec3 
} from 'cc';
import { EventManager } from './EventManager';
import { BulletPoolName } from './types/index.d';
const { ccclass, property } = _decorator;

Enum(BulletPoolName);
@ccclass('Bullet')
export class Bullet extends Component {
  // 速度
  @property(CCInteger)
  public speed: number = 1000;
  
  // 子彈傷害 (based on bullet level)
  @property(CCInteger)
  public damage: number = 50;

  private _collider: Collider2D = null;
  private _rigidBody: RigidBody2D = null;  // ✅ ADD RIGIDBODY REFERENCE
  private _limit: number = 700;
  private _directionVec3: Vec3 = new Vec3(0, 0, 0);
  private _tempVec3: Vec3 = new Vec3(0, 0, 0);

  protected onLoad(): void {
    console.log(`🔫 Bullet onLoad - Setting up collision`);
    
    // ✅ GET RIGIDBODY COMPONENT
    this._rigidBody = this.getComponent(RigidBody2D);
    if (this._rigidBody) {
      console.log(`✅ Bullet RigidBody2D found:`, this._rigidBody);
      console.log(`- Type: ${this._rigidBody.type}`);
      console.log(`- Contact Listener: ${this._rigidBody.enabledContactListener}`);
    } else {
      console.error(`❌ No RigidBody2D found on bullet!`);
    }
    
    this._collider = this.getComponent(Collider2D);
    if (this._collider) {
      console.log(`✅ Bullet collider found:`, this._collider);
      console.log(`- Group: ${this._collider.group}`);
      console.log(`- IsSensor: ${this._collider.sensor}`);
    } else {
      console.error(`❌ No Collider2D found on bullet!`);
    }
  }

  protected onEnable(): void {
    this.reset();
  }

  protected update(dt: number): void {
    // 根據方向移動子彈
    this._tempVec3.set(
      this.node.position.x + this._directionVec3.x * this.speed * dt,
      this.node.position.y + this._directionVec3.y * this.speed * dt,
      this.node.position.z
    );
    this.node.setPosition(this._tempVec3);

    // 檢查子彈是否超出邊界
    if (
      Math.abs(this._tempVec3.x) > this._limit ||
      Math.abs(this._tempVec3.y) > this._limit
    ) {
      this.stopAction();
    }
  }

  // Set bullet damage based on bullet level
  setBulletDamage(bulletLevel: number) {
    switch (bulletLevel) {
      case 1: this.damage = 30; break;
      case 2: this.damage = 50; break;
      case 3: this.damage = 80; break;
      case 4: this.damage = 120; break;
      case 5: this.damage = 180; break;
      case 6: this.damage = 250; break;
      case 7: this.damage = 350; break;
      default: this.damage = 50; break;
    }
    console.log(`🎯 Bullet damage set to: ${this.damage} (level ${bulletLevel})`);
  }

  // 停止子彈行為
  stopAction() {
    console.log(`🛑 Bullet stopAction called`);
    // 發布事件給 BulletManager.ts
    EventManager.eventTarget.emit('stop-bullet', this.node);
  }

  // 重置子彈狀態
  reset() {
    // 啟用碰撞偵測
    if (this._collider) {
      this._collider.enabled = true;
    }
    // ✅ ENSURE RIGIDBODY IS ACTIVE
    if (this._rigidBody) {
      this._rigidBody.enabledContactListener = true;
    }
  }

  // ✅ ADD closeCollider METHOD
  closeCollider() {
    console.log(`🔒 Bullet collision disabled`);
    if (this._collider) {
      this._collider.enabled = false;
    }
  }

  // 初始化子彈方向
  initDirection(angle: number) {
    // 將角度轉換為方向向量
    const radian = (angle * Math.PI) / 180;
    this._directionVec3.x = Math.cos(radian);
    this._directionVec3.y = Math.sin(radian);
    this._directionVec3.z = 0;
    console.log(`🎯 Bullet direction set: angle=${angle}°, vector=(${this._directionVec3.x.toFixed(2)}, ${this._directionVec3.y.toFixed(2)})`);
  }
}

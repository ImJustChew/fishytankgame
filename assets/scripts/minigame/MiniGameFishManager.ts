import { _decorator, Component, Node, Prefab, Vec3 } from 'cc';
import { FishPool } from './FishPool';
import { EventManager } from './EventManager';
import { Fish } from './MiniGameFish';
import {
  FishConfig,
  FishType,
  SoundClipType
} from './types/index.d';
import { AudioManager } from './AudioManager';
const { ccclass, property } = _decorator;

@ccclass('MiniGameFishManager')
export class FishManager extends Component {
  private static _instance: FishManager = null;
  public static get instance(): FishManager {
    return FishManager._instance;
  }

  // 魚的預製體
  // 1. 小丑魚
  @property(Prefab)
  public fish_01_prefab: Prefab = null;
  // 2. 熱帶魚
  @property(Prefab)
  public fish_02_prefab: Prefab = null;
  // 3. 河豚
  @property(Prefab)
  public fish_03_prefab: Prefab = null;
  // 4. 章魚
  @property(Prefab)
  public fish_04_prefab: Prefab = null;
  // 5. 鯊魚
  @property(Prefab)
  public fish_05_prefab: Prefab = null;

  // 魚池
  public fish_01_pool: FishPool = null;
  public fish_02_pool: FishPool = null;
  public fish_03_pool: FishPool = null;
  public fish_04_pool: FishPool = null;
  public fish_05_pool: FishPool = null;

  // 搜尋用魚隻快取空間
  private _fishCached: { [key: string]: Fish } = {};

  protected onLoad(): void {
    if (!FishManager._instance) {
      FishManager._instance = this;
    } else {
      this.destroy();
    }
    // 註冊事件 (singleplayer events only)
    EventManager.eventTarget.on('stop-fish', this.stopFish, this); // Fish.ts 發布
    EventManager.eventTarget.on('spawn-fishes', this.spawnFishes, this);
    EventManager.eventTarget.on('fish-killed', this.onFishKilled, this); // Handle fish kills
  }

  protected start(): void {
    // Initialize all fish pools with their prefabs
    this.fish_01_pool = new FishPool(this.fish_01_prefab);
    this.fish_02_pool = new FishPool(this.fish_02_prefab);
    this.fish_03_pool = new FishPool(this.fish_03_prefab);
    this.fish_04_pool = new FishPool(this.fish_04_prefab);
    this.fish_05_pool = new FishPool(this.fish_05_prefab);
    
    console.log('✅ Fish pools initialized:');
    console.log('- fish_01_pool:', this.fish_01_pool);
    console.log('- fish_02_pool:', this.fish_02_pool);
    console.log('- fish_03_pool:', this.fish_03_pool);
    console.log('- fish_04_pool:', this.fish_04_pool);
    console.log('- fish_05_pool:', this.fish_05_pool);
  }

  protected onDestroy(): void {
    if (FishManager._instance === this) {
      FishManager._instance = null;
    }
    // 註銷事件
    EventManager.eventTarget.off('spawn-fishes', this.spawnFishes, this);
    EventManager.eventTarget.off('stop-fish', this.stopFish, this);
    EventManager.eventTarget.off('fish-killed', this.onFishKilled, this);
  }

  // Handle fish killed (immediate death)
  onFishKilled(data: { 
    fishId: string, 
    uuid: string, 
    points: number,
    fishType: FishType,
    position: Vec3
  }) {
    console.log(`Fish ${data.fishId} killed! Points: ${data.points}`);
    
    // Play win sound
    AudioManager.instance.playSound(SoundClipType.Win);
    
    // Spawn coin animation
    EventManager.eventTarget.emit('spawn-coins', {
      fishType: data.fishType,
      startPosition: data.position
    });
    
    // ✅ EMIT BOTH EVENTS SEPARATELY (restored to original)
    //EventManager.eventTarget.emit('add-score', data.points);
    EventManager.eventTarget.emit('add-points', data.points);
  }

  spawnFishes(fishes: FishConfig[]) {
    console.log('🐟 spawnFishes called with:', fishes.length, 'fish');

    for (let i = 0; i < fishes.length; i++) {
      const curFish = fishes[i];
      console.log('🔍 Looking for pool:', `${curFish.id}_pool`);

      const currentFishPool: FishPool = this[`${curFish.id}_pool`];
      console.log('🏊 Found pool:', currentFishPool);

      if (currentFishPool) {
        const fish = currentFishPool.getFish();
        console.log('🐠 Got fish node:', fish);

        if (fish) {
          // Check if Fish component exists
          const fishComponent = fish.getComponent(Fish);
          console.log('🎯 Fish component:', fishComponent);

          if (fishComponent) {
            const { uuid, fishInstance } = fishComponent.updateFishData(curFish);
            this._fishCached[uuid] = fishInstance;
            fish.setPosition(curFish.spawnX, curFish.spawnY, 0);
            fish.setParent(this.node);
            console.log('✅ Fish spawned at:', curFish.spawnX, curFish.spawnY);
          } else {
            console.error('❌ Fish component not found on prefab!');
          }
        } else {
          console.error('❌ FishPool.getFish() returned null!');
        }
      } else {
        console.error('❌ Pool not found for:', curFish.id);
        console.log('Available pools:', Object.keys(this).filter(key => key.includes('_pool')));
      }
    }
  }

  stopFish(fish: Node, fishInstance: Fish) {
    // 將魚隻從魚隻快取空間中移除
    if (this._fishCached[fishInstance.uuid]) {
      delete this._fishCached[fishInstance.uuid];
    }
    
    // Return fish to appropriate pool
    switch (fishInstance.fishType) {
      case FishType.Fish_01:
        this.fish_01_pool.recycleFish(fish);
        break;
      case FishType.Fish_02:
        this.fish_02_pool.recycleFish(fish);
        break;
      case FishType.Fish_03:
        this.fish_03_pool.recycleFish(fish);
        break;
      case FishType.Fish_04:
        this.fish_04_pool.recycleFish(fish);
        break;
      case FishType.Fish_05:
        this.fish_05_pool.recycleFish(fish);
        break;
      default:
        fish.destroy();
        break;
    }
  }

  stopAllFish() {
    console.log('🛑 Stopping all fish - Time is up!');
    
    // Stop all active fish
    Object.keys(this._fishCached).forEach(uuid => {
      const fishInstance = this._fishCached[uuid];
      if (fishInstance && fishInstance.node) {
        // Set stop updating flag
        fishInstance['_stopUpdating'] = true;
        fishInstance.isHittable = false;
        
        /*
        // Stop animation
        const animation = fishInstance.node.getComponent(Animation);
        if (animation) {
          animation.stop();
        }
          */
      }
    });
  }
}

import { Node, Prefab, instantiate } from 'cc';

export class FishPool {
  // 這個 pool 只收已經停用的魚隻 Node
  public inactivePool: Set<Node> = new Set();
  private _prefab: Prefab;

  // 會在 FishManager 中使用
  constructor(prefab: Prefab) {
    this._prefab = prefab;
  }

  // 取得一個魚隻
  getFish(): Node {
    console.log('FishPool getFish: inactive count =', this.inactivePool.size);
    
    let fish: Node;
    
    if (this.inactivePool.size > 0) {
      fish = Array.from(this.inactivePool)[0];
      this.markAsActive(fish);
      console.log('Reused fish from pool');
    } else {
      fish = instantiate(this._prefab);
      console.log('Created new fish, prefab =', this._prefab);
    }
    
    console.log('Returning fish:', fish);
    return fish;
  }

  // 回收一個魚隻
  recycleFish(fish: Node) {
    // 停用這個魚隻
    this.markAsInactive(fish);
  }

  // 啟用一個魚隻
  markAsActive(fish: Node) {
    fish.active = true;
    this.inactivePool.delete(fish);
  }

  // 停用一個魚隻
  markAsInactive(fish: Node) {
    fish.active = false;
    this.inactivePool.add(fish);
  }
}

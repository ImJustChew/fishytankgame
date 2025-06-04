// Assets/Scripts/shop/userFishManager.ts

import databaseService from '../firebase/database-service';
import firebase from '../firebase/firebase-compat.js';
import { FISH_LIST, Fish } from '../FishData';
import { SavedFishType } from '../firebase/database-service'; // 复用你在 database-service.ts 里定义的类型

/**
 * 把一条新鱼加入到当前用户的鱼池：/users/{uid}/fishes/{autoKey}
 * @param typeId  要加入鱼池的鱼类型 ID （对应 FISH_LIST 中的 fish.id）
 * @throws 如果用户未登录或 typeId 不存在，将抛出异常
 */
export async function addFishToUserPool(typeId: string): Promise<void> {
  // 1. 先尝试读取当前用户数据，目的是确保用户已登录并拿到 uid
  const userData = await databaseService.getUserData();
  if (!userData) {
    throw new Error('USER_NOT_LOGGED_IN');
  }

  // 2. 从 FISH_LIST 找到对应鱼的初始 health
  const fishMeta: Fish | undefined = FISH_LIST.find(f => f.id === typeId);
  if (!fishMeta) {
    throw new Error(`Fish type not found: ${typeId}`);
  }

  // 3. 拼装要写入数据库的对象（不包含 id，push 后数据库会自动生成 key）
  const newFish: SavedFishType = {
    ownerId: /* 这里直接用当前登录用户的 UID */
      // data-service 里 getUserData 返回的对象并不携带 uid 字段，
      // 但 databaseService 中内部是按当前用户 uid 存在路径下，因此此处只要把 ownerId 设为一个 placeholder，后续读取时可以把路径当做 ownerId。
      // 如果你需要 ownerId 显式存到每条鱼里，也可以让 getUserData 返回 { uid, ... }，或在此处改用 authService.getCurrentUser().uid。
      (firebase.auth().currentUser?.uid ?? ''), 
    type: fishMeta.id,
    health: fishMeta.health,
    // 兼容版里使用 ServerValue.TIMESTAMP 来获取服务器时间戳
    lastFedTime: firebase.database.ServerValue.TIMESTAMP as unknown as number
  };

  // 4. 调用 databaseService.addFish，将 newFish push 到 /users/{uid}/fishes
  await databaseService.addFish(newFish);
}

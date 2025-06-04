// Assets/Scripts/shop/purchaseFish.ts

import databaseService, { UserData } from '../firebase/database-service';
import { FISH_LIST, Fish }          from '../FishData';
import { addFishToUserPool }        from './userFishManager';

/**
 * 购买一条鱼的完整流程：
 *  1. 检查当前用户是否已登录
 *  2. 从数据库读取当前余额
 *  3. 如果余额不足，抛出 "INSUFFICIENT_FUNDS"
 *  4. 扣钱：调用 updateUserMoney(newAmount)
 *  5. 调用 addFishToUserPool(typeId)，将鱼写入 /users/{uid}/fishes
 *
 * @param typeId  要购买的鱼类型 ID，例如 "fish_003"
 * @throws "USER_NOT_LOGGED_IN" | "Fish type not found: {typeId}" | "INSUFFICIENT_FUNDS"
 */
export async function purchaseFish(typeId: string): Promise<void> {
  // 1. 先通过 databaseService.getUserData() 确保用户已登录并拿到 userData
  const userData: UserData | null = await databaseService.getUserData();
  if (!userData) {
    throw new Error('USER_NOT_LOGGED_IN');
  }

  // 2. 在本地 FISH_LIST 中查找要买的鱼
  const fishMeta: Fish | undefined = FISH_LIST.find(f => f.id === typeId);
  if (!fishMeta) {
    throw new Error(`Fish type not found: ${typeId}`);
  }
  const price = fishMeta.price;

  // 3. 从 userData 里读取当前余额
  const currentMoney = userData.money;
  if (currentMoney < price) {
    throw new Error('INSUFFICIENT_FUNDS');
  }

  // 4. 扣钱：调用 databaseService.updateUserMoney(newAmount)
  const newMoney = currentMoney - price;
  await databaseService.updateUserMoney(newMoney);

  // 5. 把鱼加入用户鱼池
  await addFishToUserPool(typeId);
}

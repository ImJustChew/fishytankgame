# 魚缸遊戲好友系統使用指南

## 概述

好友系統允許玩家添加好友、訪問好友的魚缸、查看好友的魚類收藏，以及與好友的魚缸互動（如偷魚）。本文檔詳細說明了好友系統的架構、功能和使用方法。

## 核心功能

- **好友管理**：添加、刪除和接受好友請求
- **好友列表**：顯示所有好友及其狀態
- **魚缸訪問**：查看好友的魚缸和魚類
- **互動功能**：偷取好友的魚
- **實時更新**：好友魚缸數據的實時同步

## 組件架構

### 1. FriendItem.ts

負責顯示單個好友項目的 UI 組件。

**功能**：
- 顯示好友用戶名、上次登錄時間和金錢
- 提供訪問、刪除和接受按鈕
- 處理好友互動事件

**屬性**：
- `usernameLabel`: 顯示好友用戶名
- `lastLoginLabel`: 顯示上次登錄時間
- `moneyLabel`: 顯示好友金錢數量
- `statusLabel`: 顯示互動狀態（如已偷取）
- `visitButton`: 訪問好友魚缸按鈕
- `removeButton`: 刪除好友按鈕

### 2. FriendsList.ts

管理好友列表的顯示和互動。

**功能**：
- 加載和顯示所有好友
- 處理好友請求
- 管理好友項目的創建和銷毀

**屬性**：
- `friendItemPrefab`: 好友項目預製體
- `friendsContainer`: 好友列表容器
- `pendingContainer`: 待處理好友請求容器
- `addFriendInput`: 添加好友輸入框
- `addFriendButton`: 添加好友按鈕

### 3. FriendTankManager.ts

管理訪問好友魚缸的場景。

**功能**：
- 加載和顯示好友的魚缸
- 提供返回主場景的功能
- 處理偷魚等互動功能

**屬性**：
- `friendsFishTankManager`: 好友魚缸管理器引用
- `friendNameLabel`: 顯示好友名稱
- `fishCountLabel`: 顯示魚的數量
- `backButton`: 返回按鈕
- `stealButton`: 偷魚按鈕
- `friendAvatarSprite`: 好友頭像

### 4. FriendsFishTankManager.ts

處理好友魚缸的數據加載和顯示。

**功能**：
- 從數據庫加載好友的魚數據
- 在魚缸中顯示好友的魚
- 處理魚的實時更新
- 管理偷魚等互動邏輯

**屬性**：
- `fishTank`: 魚缸組件引用
- `fishManager`: 魚管理器引用
- `tankBackgroundSprite`: 魚缸背景圖片
- `tankLevelSprites`: 不同等級魚缸的圖片

## 數據結構

### 好友數據 (FriendData)

```typescript
interface FriendData {
    uid: string;          // 好友的唯一ID
    username: string;     // 好友的用戶名
    lastOnline: number;   // 上次在線時間戳
    money: number;        // 好友的金錢數量
    tankLevel?: number;   // 好友的魚缸等級
}
```

### 好友關係數據

在 Firebase 數據庫中存儲為：

```
users/{uid}/friends/{friendUid}: true
```

### 偷魚記錄

在 Firebase 數據庫中存儲為：

```
users/{uid}/stolenFish/{friendUid}: {timestamp}
```

## 使用流程

### 1. 添加好友

1. 在好友列表界面輸入好友的用戶名或 UID
2. 點擊「添加好友」按鈕
3. 系統發送好友請求
4. 對方接受後，雙方成為好友

### 2. 訪問好友魚缸

1. 在好友列表中點擊好友項目上的「訪問」按鈕
2. 系統切換到好友魚缸場景
3. 加載並顯示好友的魚缸和魚類
4. 可以查看好友的魚缸等級、魚的數量等信息

### 3. 偷取好友的魚

1. 在訪問好友魚缸時，點擊「偷魚」按鈕
2. 系統隨機選擇一條好友的魚
3. 嘗試偷取該魚（有成功和失敗的可能）
4. 成功時，魚會被添加到自己的收藏中
5. 每24小時只能從同一個好友那裡偷取一次魚

### 4. 返回主場景

在訪問好友魚缸時，點擊「返回」按鈕返回主場景。

## 場景設置

### 主場景 (aquarium.scene)

包含好友列表 UI，通常位於側邊欄或專門的好友標籤頁。

### 好友魚缸場景 (FriendTank.scene)

專門用於顯示好友魚缸的場景，包含以下元素：

1. **魚缸顯示區域**：顯示好友的魚和魚缸
2. **好友信息區域**：顯示好友名稱、頭像等
3. **控制按鈕**：返回按鈕、偷魚按鈕等
4. **魚信息顯示**：顯示魚的數量等統計信息

## 實現細節

### 場景切換機制

使用全局變量傳遞好友 UID：

```typescript
// 在 FriendItem 中設置
window['visitingFriendUid'] = friendUid;
window['visitingFriendData'] = this.friendData;

// 在 FriendTankManager 中獲取
this.friendUid = window['visitingFriendUid'] || '';
this.friendData = window['visitingFriendData'] || null;
```

### 實時數據更新

使用 Firebase 實時數據庫監聽好友魚缸變化：

```typescript
// 設置監聽器
this.fishDataListener = socialService.onFriendsFishChanged(
    this.currentFriendUid,
    (fishData) => this.handleFishDataUpdate(fishData)
);

// 清理監聽器
if (this.fishDataListener) {
    this.fishDataListener();
    this.fishDataListener = null;
}
```

### 偷魚機制

偷魚功能實現邏輯：

1. 檢查是否可以與好友的魚互動（是否為好友、24小時冷卻時間）
2. 獲取好友的魚數據
3. 隨機選擇一條魚
4. 嘗試偷取該魚（有成功率）
5. 成功時將魚添加到自己的收藏，並在數據庫中記錄偷魚時間

## 安全考慮

- 所有好友互動都需要雙向確認（雙方都是好友）
- 偷魚操作有時間限制，防止濫用
- 服務器端驗證所有操作，防止客戶端作弊
- 數據庫規則限制只能讀取好友的數據

## 擴展功能

可以考慮添加以下功能來豐富好友系統：

1. **好友聊天**：允許好友之間發送消息
2. **禮物系統**：允許好友之間贈送魚或物品
3. **競賽系統**：好友之間的魚缸比賽
4. **合作養魚**：共同完成特定任務獲得獎勵
5. **好友排行榜**：顯示好友中魚缸等級、魚數量等排名

## 故障排除

### 常見問題

1. **無法加載好友魚缸**
   - 檢查網絡連接
   - 確認好友關係是否有效
   - 檢查數據庫權限

2. **無法偷魚**
   - 檢查是否已經在24小時內偷過該好友的魚
   - 確認好友有可偷的魚
   - 檢查數據庫連接

3. **好友列表不顯示**
   - 檢查用戶是否已登錄
   - 確認好友數據是否正確加載
   - 檢查 UI 組件引用是否正確

## 技術注意事項

- 確保在場景切換和組件銷毀時正確清理資源和監聽器
- 使用節流技術限制數據庫操作頻率
- 實現錯誤處理和重試機制
- 考慮離線操作和數據同步策略

---

本文檔提供了魚缸遊戲好友系統的完整概述。開發者可以根據此指南實現和擴展好友功能，為玩家提供豐富的社交體驗。
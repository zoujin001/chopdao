// 游戏核心数据结构
let gameData = {
    // 基础属性
    realm: { stage: "凡人", level: 1, exp: 0, maxExp: 100 },
    lifespan: { current: 100, max: 100 },
    resources: { wood: 0, stone: 0, totalWood: 0,强化石: 0,灵木: 0,神木: 0 },
    stats: { attack: 1, speed: 1, crit: 0.05, luck: 0 },
    
    // 装备系统
    equipment: {
        weapon: { id: 1, name: "生锈斧头", quality: "凡品", level: 1, stats: { atk: 5 } },
        armor: null,
        ring: null,
        amulet: null
    },
    inventory: [], // 背包装备列表
    
    // 自动化
    servants: { // 道童
        unlocked: [],
        active: null
    },
    
    // 灵宠系统
    pets: {
        unlocked: [],
        active: null,
        levels: {}
    },
    
    // 洞府系统
    buildings: {
        woodField: 0,
        stoneMine: 0,
        trainingRoom: 0,
       炼器室: 0
    },
    lastOfflineTime: Date.now(), // 计算离线收益
    
    // 神通系统
    skills: {
        active: [null, null, null, null], // 4个主动槽
        passive: [], // 已学习的被动
        mana: 100, // 当前灵气
        maxMana: 1000
    },
    
    // 挑战进度
    bossesDefeated: [],
    
    // 多周目
    rebirthCount: 0,
    permanentBonus: { wood: 0, stone: 0, exp: 0 },
    
    // 游戏状态
    combo: 0,
    treeHealth: 100,
    autoSave: true,
    
    // 装备掉落系统
    dropSystem: {
        todayDrops: {
            chop: 0,
            boss: 0,
            craft: 0,
            shop: 0
        },
        totalDrops: {
            chop: 0,
            boss: 0,
            craft: 0,
            shop: 0
        },
        bestQuality: {
            chop: "凡品",
            boss: "凡品",
            craft: "凡品",
            shop: "凡品",
            total: "凡品"
        }
    },
    
    // 商店系统
    shop: {
        items: [],
        lastRefreshTime: Date.now(),
        refreshCost: 100
    },
    
    // 混沌装备
    chaosEquipment: [],
    
    // 临时状态
    buffs: []
};

// 树木数据
const treeData = {
    maxHealth: 100,
    baseWood: 1,
    maxWood: 3,
    baseExp: 1,
    baseStoneChance: 0.1
};

// 装备品质数据
const equipmentQuality = {
    凡品: { color: '⚪', probability: 70, namePrefix: '' },
    灵品: { color: '🟢', probability: 20, namePrefix: '灵' },
    仙品: { color: '🔵', probability: 8, namePrefix: '仙' },
    神品: { color: '🟣', probability: 1.9, namePrefix: '神' },
    圣品: { color: '🟠', probability: 0.1, namePrefix: '圣' },
    混沌: { color: '🔴', probability: 0, namePrefix: '混沌' }
};

// 装备部位数据
const equipmentSlots = {
    weapon: { name: '斧头', mainStat: 'atk', baseStat: 5 },
    armor: { name: '道袍', mainStat: 'hp', baseStat: 10 },
    ring: { name: '戒指', mainStat: 'speed', baseStat: 0.05 },
    amulet: { name: '护符', mainStat: 'luck', baseStat: 1 }
};

// 装备掉落概率
const dropChance = {
    base: 0.05, // 5%基础概率
    critBonus: 0.05, // 暴击时额外5%
    comboBonus: 0.03, // 连击x10+额外3%
    buffMultiplier: 2, // 聚宝盆双倍掉率
    max: 0.5 // 上限50%
};

// 道童数据
const servantsData = [
    { id: 1, name: "砍柴童子", cost: 500, rate: 1, bonus: 0 },
    { id: 2, name: "伐木匠人", cost: 2000, rate: 3, bonus: 0.1 },
    { id: 3, name: "灵木师", cost: 10000, rate: 5, bonus: 1 }
];

// 装备强化数据
const strengthenCost = (level) => {
    return 50 * level;
};

// 初始化游戏
function initGame() {
    loadGame();
    updateUI();
    startAutoChopping();
    startAutoSave();
    // 初始化商店
    refreshShop();
    // 绑定键盘事件
    document.addEventListener('keydown', handleKeyPress);
}

// 计算装备掉落概率
function calculateDropChance() {
    let chance = dropChance.base;
    
    // 连击加成
    if (gameData.combo >= 10) {
        chance += dropChance.comboBonus;
    }
    
    // 暴击加成（简化版，实际应根据暴击率计算）
    if (Math.random() < gameData.stats.crit) {
        chance += dropChance.critBonus;
    }
    
    // 境界加成：每提升10级，掉落概率增加1%
    const realmBonus = Math.floor(gameData.realm.level / 10) * 0.01;
    chance += realmBonus;
    
    // 聚宝盆buff加成
    if (gameData.buffs.includes('聚宝盆')) {
        chance *= dropChance.buffMultiplier;
    }
    
    // 上限
    return Math.min(chance, dropChance.max);
}

// 生成装备品质
function generateEquipmentQuality() {
    const luck = gameData.stats.luck;
    const realmLevel = getRealmLevel();
    const realmBonus = realmLevel * 0.01; // 每境界+1%
    
    // 计算各品质概率
    const weights = {
        凡品: Math.max(10, 70 - luck * 0.5),
        灵品: 20 + luck * 0.3,
        仙品: 8 + luck * 0.15 + realmBonus * 10,
        神品: 1.9 + luck * 0.05 + realmBonus * 5,
        圣品: 0.1 + luck * 0.01 + realmBonus * 2,
        混沌: realmLevel >= 5 ? 0.01 + realmBonus * 0.5 : 0
    };
    
    // 加权随机
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [quality, weight] of Object.entries(weights)) {
        random -= weight;
        if (random <= 0) {
            return quality;
        }
    }
    
    return '凡品'; // 默认返回凡品
}

// 获取境界等级
function getRealmLevel() {
    const stageMap = {
        '凡人': 0,
        '炼气': 1,
        '筑基': 2,
        '金丹': 3,
        '元婴': 4,
        '化神': 5
    };
    return stageMap[gameData.realm.stage] || 0;
}

// 生成装备
function generateEquipment(quality, slot = null) {
    const slots = Object.keys(equipmentSlots);
    const targetSlot = slot || slots[Math.floor(Math.random() * slots.length)];
    const slotData = equipmentSlots[targetSlot];
    
    // 计算主属性
    let qualityMultiplier = 1;
    switch(quality) {
        case '灵品': qualityMultiplier = 1.5; break;
        case '仙品': qualityMultiplier = 2.5; break;
        case '神品': qualityMultiplier = 4; break;
        case '圣品': qualityMultiplier = 6; break;
        case '混沌': qualityMultiplier = 10; break;
    }
    
    const mainStatValue = Math.floor(slotData.baseStat * qualityMultiplier);
    
    // 生成装备名称
    const namePrefix = equipmentQuality[quality].namePrefix;
    const nameSuffixes = {
        weapon: ['开山斧', '砍柴斧', '伐木斧', '精铁斧', '神斧'],
        armor: ['道袍', '仙袍', '神袍', '圣袍', '混沌袍'],
        ring: ['戒指', '仙戒', '神戒', '圣戒', '混沌戒'],
        amulet: ['护符', '仙符', '神符', '圣符', '混沌符']
    };
    const suffix = nameSuffixes[targetSlot][Math.floor(Math.random() * nameSuffixes[targetSlot].length)];
    const name = namePrefix + suffix;
    
    // 生成装备
    return {
        id: Date.now() + Math.floor(Math.random() * 1000),
        slot: targetSlot,
        quality: quality,
        level: 1,
        name: name,
        stats: {
            [slotData.mainStat]: mainStatValue
        },
        subStats: generateSubStats(quality)
    };
}

// 生成装备副属性
function generateSubStats(quality) {
    const subStats = {};
    const possibleStats = ['woodBonus', 'stoneBonus', 'expBonus', 'crit'];
    const statCount = Math.min(Math.floor(Math.random() * 3) + 1, possibleStats.length);
    
    // 根据品质决定副属性值
    let valueMultiplier = 1;
    switch(quality) {
        case '灵品': valueMultiplier = 0.05; break;
        case '仙品': valueMultiplier = 0.1; break;
        case '神品': valueMultiplier = 0.15; break;
        case '圣品': valueMultiplier = 0.25; break;
        case '混沌': valueMultiplier = 0.5; break;
        default: valueMultiplier = 0.02;
    }
    
    // 随机选择副属性
    const shuffledStats = possibleStats.sort(() => 0.5 - Math.random());
    for (let i = 0; i < statCount; i++) {
        const stat = shuffledStats[i];
        subStats[stat] = valueMultiplier;
    }
    
    return subStats;
}

// 处理装备掉落
function handleEquipmentDrop() {
    const chance = calculateDropChance();
    if (Math.random() < chance) {
        const quality = generateEquipmentQuality();
        const equipment = generateEquipment(quality);
        showEquipmentDrop(equipment);
        
        // 更新掉落统计
        gameData.dropSystem.todayDrops.chop++;
        gameData.dropSystem.totalDrops.chop++;
        
        // 更新最佳品质
        if (getQualityRank(equipment.quality) > getQualityRank(gameData.dropSystem.bestQuality.chop)) {
            gameData.dropSystem.bestQuality.chop = equipment.quality;
        }
        if (getQualityRank(equipment.quality) > getQualityRank(gameData.dropSystem.bestQuality.total)) {
            gameData.dropSystem.bestQuality.total = equipment.quality;
        }
        
        saveGame();
    }
}

// 获取品质排名
function getQualityRank(quality) {
    const ranks = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Chaos'];
    return ranks.indexOf(quality);
}

// 计算装备属性差异
function calculateEquipmentDiff(newEquipment) {
    const currentEquipment = gameData.equipment[newEquipment.slot];
    const diff = {};
    
    // 比较主属性
    if (newEquipment.stats) {
        for (const [stat, value] of Object.entries(newEquipment.stats)) {
            const currentValue = currentEquipment ? (currentEquipment.stats ? currentEquipment.stats[stat] || 0 : 0) : 0;
            diff[stat] = (value || 0) - currentValue;
        }
    }
    
    // 比较副属性
    if (newEquipment.subStats) {
        for (const [stat, value] of Object.entries(newEquipment.subStats)) {
            const currentValue = currentEquipment ? (currentEquipment.subStats ? currentEquipment.subStats[stat] || 0 : 0) : 0;
            diff[stat] = (value || 0) - currentValue;
        }
    }
    
    return diff;
}

// 显示装备掉落提示
function showEquipmentDrop(equipment) {
    const popupBody = document.getElementById('popup-body');
    const qualityData = equipmentQuality[equipment.quality];
    
    // 计算属性差异
    const diff = calculateEquipmentDiff(equipment);
    
    // 构建主属性文本
    let mainStatsText = '';
    if (equipment.stats) {
        for (const [stat, value] of Object.entries(equipment.stats)) {
            const diffValue = diff[stat] || 0;
            const diffText = diffValue > 0 ? `<span style="color: green;">+${diffValue}</span>` : diffValue < 0 ? `<span style="color: red;">${diffValue}</span>` : '';
            mainStatsText += `${getStatName(stat)}+${value} ${diffText}<br>`;
        }
    }
    
    // 构建副属性文本
    let subStatsText = '';
    if (equipment.subStats) {
        for (const [stat, value] of Object.entries(equipment.subStats)) {
            const statNames = {
                woodBonus: '木材+',
                stoneBonus: '灵石+',
                expBonus: '修为+',
                crit: '暴击率+'
            };
            const diffValue = diff[stat] || 0;
            const diffText = diffValue > 0 ? `<span style="color: green;">+${(diffValue * 100).toFixed(0)}%</span>` : diffValue < 0 ? `<span style="color: red;">${(diffValue * 100).toFixed(0)}%</span>` : '';
            subStatsText += `${statNames[stat]}${((value || 0) * 100).toFixed(0)}% ${diffText}<br>`;
        }
    }
    
    popupBody.innerHTML = `
        <h3>🎉 获得装备！</h3>
        <table>
            <tr>
                <td>品质:</td>
                <td>${qualityData.color} ${equipment.quality}</td>
            </tr>
            <tr>
                <td>名称:</td>
                <td>${equipment.name}</td>
            </tr>
            <tr>
                <td>部位:</td>
                <td>${equipmentSlots[equipment.slot].name}</td>
            </tr>
            ${mainStatsText ? `<tr>
                <td>主属性:</td>
                <td>${mainStatsText}</td>
            </tr>` : ''}
            ${subStatsText ? `<tr>
                <td>副属性:</td>
                <td>${subStatsText}</td>
            </tr>` : ''}
            ${Object.keys(diff).length > 0 ? `<tr>
                <td>属性差异:</td>
                <td><span style="color: green;">绿色</span>表示增加，<span style="color: red;">红色</span>表示减少</td>
            </tr>` : ''}
        </table>
        <div style="margin-top: 10px; display: flex; gap: 10px;">
            <button onclick="equipDrop(${equipment.id}); closePopup();">装备</button>
            <button onclick="addToInventory(${equipment.id}); closePopup();">放入背包</button>
            <button onclick="sellDrop(${equipment.id}); closePopup();">出售</button>
        </div>
    `;
    
    // 保存装备到临时变量，以便处理
    window.tempEquipment = equipment;
    document.getElementById('popup').style.display = 'block';
}

// 获取属性名称
function getStatName(stat) {
    const statNames = {
        atk: '攻击',
        hp: '生命',
        speed: '攻速',
        luck: '幸运'
    };
    return statNames[stat] || stat;
}

// 装备掉落的装备
function equipDrop(id) {
    if (window.tempEquipment) {
        const equipment = window.tempEquipment;
        // 卸下当前装备并放入背包
        if (gameData.equipment[equipment.slot]) {
            const currentEquipment = gameData.equipment[equipment.slot];
            currentEquipment.count = 1;
            gameData.inventory.push(currentEquipment);
        }
        // 装备新装备
        gameData.equipment[equipment.slot] = equipment;
        updateUI();
        saveGame();
        alert(`成功装备了${equipment.name}！`);
    }
}

// 将掉落的装备放入背包
function addToInventory(id) {
    if (window.tempEquipment) {
        const equipment = window.tempEquipment;
        equipment.count = 1; // 添加数量属性
        gameData.inventory.push(equipment);
        updateUI();
        saveGame();
        alert(`成功将${equipment.name}放入背包！`);
    }
}

// 出售掉落的装备
function sellDrop(id) {
    if (window.tempEquipment) {
        const equipment = window.tempEquipment;
        const sellPrice = calculateSellPrice(equipment);
        gameData.resources.stone += sellPrice;
        updateUI();
        saveGame();
        alert(`成功出售${equipment.name}，获得${sellPrice}灵石！`);
    }
}

// 计算装备出售价格
function calculateSellPrice(equipment) {
    const basePrice = 50;
    const qualityMultiplier = {
        '凡品': 1,
        '灵品': 4,
        '仙品': 20,
        '神品': 100,
        '圣品': 500,
        '混沌': 2500
    };
    return Math.floor(basePrice * qualityMultiplier[equipment.quality]);
}

// 刷新商店
function refreshShop() {
    gameData.shop.items = [];
    const realmLevel = getRealmLevel();
    
    // 生成6件装备
    for (let i = 0; i < 6; i++) {
        // 根据境界决定品质范围
        let maxQualityIndex = Math.min(realmLevel + 2, 4); // 最高仙品
        const qualityRanks = ['凡品', '灵品', '仙品', '神品', '圣品'];
        const quality = qualityRanks[Math.floor(Math.random() * (maxQualityIndex + 1))];
        const equipment = generateEquipment(quality);
        
        // 计算价格
        const basePrice = 50;
        const priceMultiplier = {
            '凡品': 1,
            '灵品': 4,
            '仙品': 20
        };
        const price = Math.floor(basePrice * (priceMultiplier[quality] || 100));
        
        gameData.shop.items.push({ ...equipment, price });
    }
    
    gameData.shop.lastRefreshTime = Date.now();
    saveGame();
}

// 手动刷新商店
function manualRefreshShop() {
    if (gameData.resources.stone >= gameData.shop.refreshCost) {
        gameData.resources.stone -= gameData.shop.refreshCost;
        refreshShop();
        updateUI();
        // 重新打开商店界面以显示刷新后的物品
        openShop();
    } else {
        alert('灵石不足！');
    }
}

// 保存游戏到LocalStorage
function saveGame() {
    gameData.lastOfflineTime = Date.now();
    localStorage.setItem('chopTreeGame', JSON.stringify(gameData));
}

// 从LocalStorage加载游戏
function loadGame() {
    const savedData = localStorage.getItem('chopTreeGame');
    if (savedData) {
        gameData = JSON.parse(savedData);
        // 计算离线收益
        calculateOfflineRewards();
    }
}

// 计算离线收益
function calculateOfflineRewards() {
    const now = Date.now();
    const offlineTime = (now - gameData.lastOfflineTime) / 1000; // 转换为秒
    
    if (offlineTime > 0 && offlineTime < 3600) { // 最多计算1小时离线收益
        let woodPerSecond = 0;
        let expPerSecond = 0;
        
        // 计算道童带来的收益
        gameData.servants.unlocked.forEach(servantId => {
            const servant = servantsData.find(s => s.id === servantId);
            if (servant) {
                woodPerSecond += servant.rate;
                expPerSecond += servant.rate * 0.1;
            }
        });
        
        // 计算洞府带来的收益
        woodPerSecond += gameData.buildings.woodField * 0.1;
        gameData.resources.stone += gameData.buildings.stoneMine * 0.1 * offlineTime;
        gameData.realm.exp += gameData.buildings.trainingRoom * 0.1 * offlineTime;
        
        // 应用收益
        gameData.resources.wood += woodPerSecond * offlineTime;
        gameData.resources.totalWood += woodPerSecond * offlineTime;
        gameData.realm.exp += expPerSecond * offlineTime;
        
        // 检查境界突破
        checkRealmBreakthrough();
    }
    
    gameData.lastOfflineTime = now;
}

// 开始自动保存
function startAutoSave() {
    setInterval(() => {
        if (gameData.autoSave) {
            saveGame();
        }
    }, 30000); // 每30秒自动保存
}

// 开始自动砍树
function startAutoChopping() {
    setInterval(() => {
        gameData.servants.unlocked.forEach(servantId => {
            const servant = servantsData.find(s => s.id === servantId);
            if (servant) {
                for (let i = 0; i < servant.rate; i++) {
                    autoChopTree(servant.bonus);
                }
            }
        });
    }, 1000); // 每秒执行一次
}

// 自动砍树
function autoChopTree(bonus = 0) {
    if (gameData.treeHealth > 0) {
        const damage = gameData.stats.attack + (gameData.equipment.weapon ? gameData.equipment.weapon.stats.atk : 0);
        gameData.treeHealth -= damage;
        
        if (gameData.treeHealth <= 0) {
            // 树木被砍倒，获得资源
            const woodGain = Math.floor(Math.random() * (treeData.maxWood - treeData.baseWood + 1)) + treeData.baseWood;
            const finalWoodGain = Math.floor(woodGain * (1 + bonus));
            const expGain = treeData.baseExp;
            const stoneGain = Math.random() < treeData.baseStoneChance ? 1 : 0;
            
            gameData.resources.wood += finalWoodGain;
            gameData.resources.totalWood += finalWoodGain;
            gameData.realm.exp += expGain;
            gameData.resources.stone += stoneGain;
            
            // 重置树木
            gameData.treeHealth = treeData.maxHealth;
            
            // 检查境界突破
            checkRealmBreakthrough();
        }
        
        updateUI();
    }
}

// 手动砍树
function chopTree() {
    if (gameData.treeHealth > 0) {
        // 增加连击数
        gameData.combo++;
        const comboBonus = gameData.combo * 0.05; // 每连击增加5%伤害
        
        // 计算伤害
        const baseDamage = gameData.stats.attack + (gameData.equipment.weapon ? gameData.equipment.weapon.stats.atk : 0);
        const finalDamage = baseDamage * (1 + comboBonus);
        gameData.treeHealth -= finalDamage;
        
        if (gameData.treeHealth <= 0) {
            // 树木被砍倒，获得资源
            const woodGain = Math.floor(Math.random() * (treeData.maxWood - treeData.baseWood + 1)) + treeData.baseWood;
            const expGain = treeData.baseExp;
            const stoneGain = Math.random() < treeData.baseStoneChance ? 1 : 0;
            
            // 应用连击加成
            const finalWoodGain = Math.floor(woodGain * (1 + comboBonus));
            
            gameData.resources.wood += finalWoodGain;
            gameData.resources.totalWood += finalWoodGain;
            gameData.realm.exp += expGain;
            gameData.resources.stone += stoneGain;
            
            // 显示飘字
            showFloatingText(`+${finalWoodGain}木材`);
            showFloatingText(`+${expGain}修为`);
            if (stoneGain > 0) {
                showFloatingText(`+${stoneGain}灵石`);
            }
            
            // 处理装备掉落
            handleEquipmentDrop();
            
            // 重置树木和连击
            gameData.treeHealth = treeData.maxHealth;
            gameData.combo = 0;
            
            // 检查境界突破
            checkRealmBreakthrough();
        }
        
        updateUI();
    }
}

// 显示飘字效果
function showFloatingText(text) {
    const tree = document.getElementById('tree');
    const floatingText = document.createElement('div');
    floatingText.className = 'floating-text';
    floatingText.textContent = text;
    
    // 随机位置
    const x = Math.random() * 200 - 100;
    floatingText.style.left = `50%`;
    floatingText.style.transform = `translateX(${x}px)`;
    
    tree.appendChild(floatingText);
    
    // 1秒后移除
    setTimeout(() => {
        tree.removeChild(floatingText);
    }, 1000);
}

// 检查境界突破
function checkRealmBreakthrough() {
    if (gameData.realm.exp >= gameData.realm.maxExp) {
        // 自动突破
        breakthroughRealm();
    }
}

// 境界突破
function breakthroughRealm() {
    // 检查修为是否足够
    if (gameData.realm.exp < gameData.realm.maxExp) {
        alert("修为不足，无法突破！");
        return;
    }
    
    // 确保修为不会变成负数
    gameData.realm.exp = Math.max(0, gameData.realm.exp - gameData.realm.maxExp);
    gameData.realm.level++;
    
    // 计算新的境界和最大修为
    if (gameData.realm.level <= 9) {
        gameData.realm.stage = "凡人";
    } else if (gameData.realm.level <= 19) {
        gameData.realm.stage = "炼气";
    } else if (gameData.realm.level <= 29) {
        gameData.realm.stage = "筑基";
    } else if (gameData.realm.level <= 39) {
        gameData.realm.stage = "金丹";
    } else if (gameData.realm.level <= 49) {
        gameData.realm.stage = "元婴";
    } else {
        gameData.realm.stage = "化神";
    }
    
    gameData.realm.maxExp = 100 * Math.pow(1.5, gameData.realm.level - 1);
    gameData.stats.attack += 1; // 每突破一次攻击+1
    
    // 检查是否需要连续突破
    if (gameData.realm.exp >= gameData.realm.maxExp) {
        breakthroughRealm();
    }
    
    updateUI();
    saveGame();
}

// 强化武器
function strengthenWeapon() {
    const weapon = gameData.equipment.weapon;
    if (weapon) {
        const cost = strengthenCost(weapon.level);
        if (gameData.resources.强化石 >= cost) {
            gameData.resources.强化石 -= cost;
            weapon.level++;
            weapon.stats.atk += 2; // 每级强化攻击+2
            updateUI();
            saveGame();
        } else {
            alert("强化石不足！");
        }
    }
}

// 强化道袍
function strengthenArmor() {
    const armor = gameData.equipment.armor;
    if (armor) {
        const cost = strengthenCost(armor.level);
        if (gameData.resources.强化石 >= cost) {
            gameData.resources.强化石 -= cost;
            armor.level++;
            armor.stats.hp += 5; // 每级强化生命+5
            if (armor.stats.woodBonus) armor.stats.woodBonus += 0.01; // 每级强化木材加成+1%
            updateUI();
            saveGame();
        } else {
            alert("强化石不足！");
        }
    }
}

// 强化戒指
function strengthenRing() {
    const ring = gameData.equipment.ring;
    if (ring) {
        const cost = strengthenCost(ring.level);
        if (gameData.resources.强化石 >= cost) {
            gameData.resources.强化石 -= cost;
            ring.level++;
            if (ring.stats.speed) ring.stats.speed += 0.01; // 每级强化攻速+1%
            if (ring.stats.stoneBonus) ring.stats.stoneBonus += 0.01; // 每级强化灵石加成+1%
            updateUI();
            saveGame();
        } else {
            alert("强化石不足！");
        }
    }
}

// 强化护符
function strengthenAmulet() {
    const amulet = gameData.equipment.amulet;
    if (amulet) {
        const cost = strengthenCost(amulet.level);
        if (gameData.resources.强化石 >= cost) {
            gameData.resources.强化石 -= cost;
            amulet.level++;
            if (amulet.stats.luck) amulet.stats.luck += 1; // 每级强化幸运+1
            if (amulet.stats.expBonus) amulet.stats.expBonus += 0.01; // 每级强化修为加成+1%
            updateUI();
            saveGame();
        } else {
            alert("强化石不足！");
        }
    }
}

// 卸下装备
function unequipWeapon() {
    if (confirm('确定要卸下斧头吗？')) {
        if (gameData.equipment.weapon) {
            const weapon = gameData.equipment.weapon;
            weapon.count = 1; // 添加数量属性
            gameData.inventory.push(weapon);
            gameData.equipment.weapon = null;
            updateUI();
            saveGame();
            alert('斧头已卸下并放入背包！');
        }
    }
}

function equipArmor() {
    // 打开装备选择界面
    const popupBody = document.getElementById('popup-body');
    popupBody.innerHTML = `
        <h3>装备道袍</h3>
        <p>当前装备: ${gameData.equipment.armor ? gameData.equipment.armor.name : '无'}</p>
        <button onclick="unequipArmor(); closePopup();">卸下当前装备</button>
    `;
    document.getElementById('popup').style.display = 'block';
}

function unequipArmor() {
    if (gameData.equipment.armor) {
        const armor = gameData.equipment.armor;
        armor.count = 1; // 添加数量属性
        gameData.inventory.push(armor);
        gameData.equipment.armor = null;
        updateUI();
        saveGame();
        alert('道袍已卸下并放入背包！');
    }
}

function equipRing() {
    // 打开装备选择界面
    const popupBody = document.getElementById('popup-body');
    popupBody.innerHTML = `
        <h3>装备戒指</h3>
        <p>当前装备: ${gameData.equipment.ring ? gameData.equipment.ring.name : '无'}</p>
        <button onclick="unequipRing(); closePopup();">卸下当前装备</button>
    `;
    document.getElementById('popup').style.display = 'block';
}

function unequipRing() {
    if (gameData.equipment.ring) {
        const ring = gameData.equipment.ring;
        ring.count = 1; // 添加数量属性
        gameData.inventory.push(ring);
        gameData.equipment.ring = null;
        updateUI();
        saveGame();
        alert('戒指已卸下并放入背包！');
    }
}

function equipAmulet() {
    // 打开装备选择界面
    const popupBody = document.getElementById('popup-body');
    popupBody.innerHTML = `
        <h3>装备护符</h3>
        <p>当前装备: ${gameData.equipment.amulet ? gameData.equipment.amulet.name : '无'}</p>
        <button onclick="unequipAmulet(); closePopup();">卸下当前装备</button>
    `;
    document.getElementById('popup').style.display = 'block';
}

function unequipAmulet() {
    if (gameData.equipment.amulet) {
        const amulet = gameData.equipment.amulet;
        amulet.count = 1; // 添加数量属性
        gameData.inventory.push(amulet);
        gameData.equipment.amulet = null;
        updateUI();
        saveGame();
        alert('护符已卸下并放入背包！');
    }
}

// 装备背包中的装备
function equipFromInventory(itemId) {
    const itemIndex = gameData.inventory.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
        const item = gameData.inventory[itemIndex];
        if (item.slot) {
            // 卸下当前装备
            if (gameData.equipment[item.slot]) {
                const currentEquipment = gameData.equipment[item.slot];
                currentEquipment.count = 1;
                gameData.inventory.push(currentEquipment);
            }
            // 装备新装备
            gameData.equipment[item.slot] = item;
            // 从背包中移除
            gameData.inventory.splice(itemIndex, 1);
            updateUI();
            saveGame();
            alert(`成功装备了${item.name}！`);
        } else {
            alert('这不是装备，无法装备！');
        }
    }
}

// 招募道童
function recruitServant(id) {
    const servant = servantsData.find(s => s.id === id);
    if (servant && !gameData.servants.unlocked.includes(id)) {
        if (gameData.resources.stone >= servant.cost) {
            gameData.resources.stone -= servant.cost;
            gameData.servants.unlocked.push(id);
            updateUI();
            saveGame();
        } else {
            alert("灵石不足！");
        }
    }
}

// 打开境界突破弹窗
function openRealmPopup() {
    const popupBody = document.getElementById('popup-body');
    const canBreakthrough = gameData.realm.exp >= gameData.realm.maxExp;
    popupBody.innerHTML = `
        <h3>境界突破</h3>
        <table>
            <tr>
                <th>突破至</th>
                <th>需求修为</th>
                <th>成功率</th>
                <th>失败惩罚</th>
                <th>操作</th>
            </tr>
            <tr>
                <td>${gameData.realm.stage}${gameData.realm.level + 1}阶</td>
                <td>${Math.floor(gameData.realm.maxExp)}修为</td>
                <td>100%</td>
                <td>无</td>
                <td><button ${!canBreakthrough ? 'disabled' : ''} onclick="breakthroughRealm(); closePopup();">${canBreakthrough ? '突破' : '修为不足'}</button></td>
            </tr>
        </table>
    `;
    document.getElementById('popup').style.display = 'block';
}

// 显示装备属性比较
function showEquipmentCompare(itemId) {
    const item = gameData.inventory.find(item => item.id === itemId);
    if (item && item.slot) {
        const popupBody = document.getElementById('popup-body');
        const qualityData = equipmentQuality[item.quality];
        
        // 计算属性差异
        const diff = calculateEquipmentDiff(item);
        
        // 构建主属性文本
        let mainStatsText = '';
        if (item.stats) {
            for (const [stat, value] of Object.entries(item.stats)) {
                const diffValue = diff[stat] || 0;
                const diffText = diffValue > 0 ? `<span style="color: green;">+${diffValue}</span>` : diffValue < 0 ? `<span style="color: red;">${diffValue}</span>` : '';
                mainStatsText += `${getStatName(stat)}+${value} ${diffText}<br>`;
            }
        }
        
        // 构建副属性文本
        let subStatsText = '';
        if (item.subStats) {
            for (const [stat, value] of Object.entries(item.subStats)) {
                const statNames = {
                    woodBonus: '木材+',
                    stoneBonus: '灵石+',
                    expBonus: '修为+',
                    crit: '暴击率+'
                };
                const diffValue = diff[stat] || 0;
                const diffText = diffValue > 0 ? `<span style="color: green;">+${(diffValue * 100).toFixed(0)}%</span>` : diffValue < 0 ? `<span style="color: red;">${(diffValue * 100).toFixed(0)}%</span>` : '';
                subStatsText += `${statNames[stat]}${((value || 0) * 100).toFixed(0)}% ${diffText}<br>`;
            }
        }
        
        popupBody.innerHTML = `
            <h3>装备属性比较</h3>
            <table>
                <tr>
                    <td>品质:</td>
                    <td>${qualityData.color} ${item.quality}</td>
                </tr>
                <tr>
                    <td>名称:</td>
                    <td>${item.name}</td>
                </tr>
                <tr>
                    <td>部位:</td>
                    <td>${equipmentSlots[item.slot].name}</td>
                </tr>
                ${mainStatsText ? `<tr>
                    <td>主属性:</td>
                    <td>${mainStatsText}</td>
                </tr>` : ''}
                ${subStatsText ? `<tr>
                    <td>副属性:</td>
                    <td>${subStatsText}</td>
                </tr>` : ''}
                ${Object.keys(diff).length > 0 ? `<tr>
                    <td>属性差异:</td>
                    <td><span style="color: green;">绿色</span>表示增加，<span style="color: red;">红色</span>表示减少</td>
                </tr>` : ''}
            </table>
            <div style="margin-top: 10px; display: flex; gap: 10px;">
                <button onclick="equipFromInventory(${item.id}); closePopup();">装备</button>
                <button onclick="closePopup();">取消</button>
            </div>
        `;
        
        document.getElementById('popup').style.display = 'block';
    }
}

// 打开背包
function openInventory() {
    const popupBody = document.getElementById('popup-body');
    popupBody.innerHTML = `
        <h3>背包</h3>
        <table>
            <tr>
                <th>物品</th>
                <th>数量</th>
                <th>操作</th>
            </tr>
            ${gameData.inventory.length > 0 ? gameData.inventory.map(item => `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.count || 1}</td>
                    <td>${item.slot ? `<button onclick="showEquipmentCompare(${item.id})">装备</button>` : '<button>使用</button>'}</td>
                </tr>
            `).join('') : '<tr><td colspan="3">背包为空</td></tr>'}
        </table>
    `;
    document.getElementById('popup').style.display = 'block';
}

// 打开神通
function openSkills() {
    const popupBody = document.getElementById('popup-body');
    popupBody.innerHTML = `
        <h3>神通系统</h3>
        <p>灵气: ${gameData.skills.mana}/${gameData.skills.maxMana}</p>
        <table>
            <tr>
                <th>技能槽</th>
                <th>技能</th>
                <th>操作</th>
            </tr>
            ${gameData.skills.active.map((skill, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${skill ? skill.name : '未装备'}</td>
                    <td><button>装备</button></td>
                </tr>
            `).join('')}
        </table>
    `;
    document.getElementById('popup').style.display = 'block';
}

// BOSS数据
const bossData = {
    treeDemon: {
        name: '树妖',
        unlockRealm: '炼气期',
        unlockLevel: 10,
        hp: 1000,
        timeLimit: 60,
        guaranteedQuality: '灵品',
        possibleQuality: ['仙品', '神品'],
        possibleDropChance: { '仙品': 0.3, '神品': 0.05 },
        specialDrop: null,
        reward: { stone: 100 }
    },
    woodSpirit: {
        name: '木灵精',
        unlockRealm: '筑基期',
        unlockLevel: 20,
        hp: 5000,
        timeLimit: 60,
        guaranteedQuality: '仙品',
        possibleQuality: ['神品', '圣品'],
        possibleDropChance: { '神品': 0.3, '圣品': 0.05 },
        specialDrop: '灵宠蛋',
        reward: { stone: 200 }
    },
    forestLord: {
        name: '森林霸主',
        unlockRealm: '金丹期',
        unlockLevel: 30,
        hp: 20000,
        timeLimit: 90,
        guaranteedQuality: '神品',
        possibleQuality: ['圣品', '混沌'],
        possibleDropChance: { '圣品': 0.2, '混沌': 0.01 },
        specialDrop: '突破丹×3',
        reward: { stone: 500 }
    }
};

// 打开挑战
function openChallenges() {
    const popupBody = document.getElementById('popup-body');
    let challengesHtml = '';
    
    Object.values(bossData).forEach(boss => {
        const canChallenge = gameData.realm.level >= boss.unlockLevel;
        challengesHtml += `
            <tr>
                <td>${boss.name}</td>
                <td>${boss.unlockRealm}</td>
                <td>${boss.hp}</td>
                <td>${boss.timeLimit}秒</td>
                <td>${equipmentQuality[boss.guaranteedQuality].color} ${boss.guaranteedQuality} ${boss.specialDrop ? ' ' + boss.specialDrop : ''}</td>
                <td><button ${!canChallenge ? 'disabled' : ''} onclick="challengeBoss('${boss.name}')">挑战</button></td>
            </tr>
        `;
    });
    
    popupBody.innerHTML = `
        <h3>⚔️ 挑战系统</h3>
        <table>
            <tr>
                <th>妖兽</th>
                <th>解锁境界</th>
                <th>血量</th>
                <th>限时</th>
                <th>掉落</th>
                <th>操作</th>
            </tr>
            ${challengesHtml}
        </table>
    `;
    document.getElementById('popup').style.display = 'block';
}

// 挑战BOSS
function challengeBoss(bossName) {
    // 简化版BOSS挑战，直接胜利
    const bossKey = Object.keys(bossData).find(key => bossData[key].name === bossName);
    if (bossKey) {
        const boss = bossData[bossKey];
        
        // 获得保底装备
        const guaranteedEquipment = generateEquipment(boss.guaranteedQuality);
        
        // 尝试获得额外装备
        let extraEquipment = [];
        for (const [quality, chance] of Object.entries(boss.possibleDropChance)) {
            if (Math.random() < chance) {
                extraEquipment.push(generateEquipment(quality));
            }
        }
        
        // 显示掉落
        showBossDrop(boss, guaranteedEquipment, extraEquipment);
        
        // 获得奖励
        gameData.resources.stone += boss.reward.stone;
        
        // 更新掉落统计
        gameData.dropSystem.todayDrops.boss++;
        gameData.dropSystem.totalDrops.boss++;
        
        // 更新最佳品质
        const bestQuality = [...[guaranteedEquipment], ...extraEquipment]
            .reduce((best, eq) => getQualityRank(eq.quality) > getQualityRank(best) ? eq.quality : best, '凡品');
        
        if (getQualityRank(bestQuality) > getQualityRank(gameData.dropSystem.bestQuality.boss)) {
            gameData.dropSystem.bestQuality.boss = bestQuality;
        }
        if (getQualityRank(bestQuality) > getQualityRank(gameData.dropSystem.bestQuality.total)) {
            gameData.dropSystem.bestQuality.total = bestQuality;
        }
        
        saveGame();
    }
}

// 显示BOSS掉落
function showBossDrop(boss, guaranteedEquipment, extraEquipment) {
    const popupBody = document.getElementById('popup-body');
    
    // 构建装备列表HTML
    let equipmentHtml = `
        <tr>
            <td>保底掉落:</td>
            <td>${equipmentQuality[guaranteedEquipment.quality].color} ${guaranteedEquipment.name}</td>
        </tr>
    `;
    
    extraEquipment.forEach((eq, index) => {
        equipmentHtml += `
            <tr>
                <td>额外掉落 ${index + 1}:</td>
                <td>${equipmentQuality[eq.quality].color} ${eq.name}</td>
            </tr>
        `;
    });
    
    if (boss.specialDrop) {
        equipmentHtml += `
            <tr>
                <td>特殊掉落:</td>
                <td>${boss.specialDrop}</td>
            </tr>
        `;
    }
    
    equipmentHtml += `
        <tr>
            <td>灵石奖励:</td>
            <td>💎 ${boss.reward.stone}灵石</td>
        </tr>
    `;
    
    popupBody.innerHTML = `
        <h3>🎉 挑战成功！</h3>
        <h4>击败了${boss.name}</h4>
        <table>
            ${equipmentHtml}
        </table>
        <button onclick="closePopup()">确定</button>
    `;
    
    document.getElementById('popup').style.display = 'block';
}

// 打开地图
function openMap() {
    const popupBody = document.getElementById('popup-body');
    popupBody.innerHTML = `
        <h3>地图</h3>
        <p>当前区域: 新手森林</p>
        <table>
            <tr>
                <th>区域</th>
                <th>解锁条件</th>
                <th>描述</th>
                <th>操作</th>
            </tr>
            <tr>
                <td>新手森林</td>
                <td>凡人一阶</td>
                <td>基础木材资源</td>
                <td><button>进入</button></td>
            </tr>
            <tr>
                <td>青木林</td>
                <td>炼气期</td>
                <td>高级木材资源</td>
                <td><button ${gameData.realm.level < 10 ? 'disabled' : ''}>进入</button></td>
            </tr>
            <tr>
                <td>灵木谷</td>
                <td>筑基期</td>
                <td>稀有木材资源</td>
                <td><button ${gameData.realm.level < 20 ? 'disabled' : ''}>进入</button></td>
            </tr>
        </table>
    `;
    document.getElementById('popup').style.display = 'block';
}

// 打开商店
function openShop() {
    const popupBody = document.getElementById('popup-body');
    const realmLevel = getRealmLevel();
    const nextRefreshTime = new Date(gameData.shop.lastRefreshTime + 2 * 60 * 60 * 1000).toLocaleTimeString();
    
    // 构建商店物品HTML
    let shopItemsHtml = '';
    gameData.shop.items.forEach(item => {
        const qualityData = equipmentQuality[item.quality];
        const slotName = equipmentSlots[item.slot].name;
        const mainStatKey = Object.keys(item.stats || {})[0];
        const mainStat = mainStatKey ? getStatName(mainStatKey) : '无';
        const mainStatValue = Object.values(item.stats || {})[0] || 0;
        
        // 构建副属性文本
        let subStatsText = '';
        for (const [stat, value] of Object.entries(item.subStats || {})) {
            const statNames = {
                woodBonus: '木材+',
                stoneBonus: '灵石+',
                expBonus: '修为+',
                crit: '暴击率+'
            };
            subStatsText += `${statNames[stat]}${((value || 0) * 100).toFixed(0)}% `;
        }
        
        shopItemsHtml += `
            <tr>
                <td style="padding: 8px; text-align: center;">${qualityData.color} ${item.name}</td>
                <td style="padding: 8px; text-align: left;">
                    <div>部位: ${slotName}</div>
                    <div>主属性: ${mainStat}+${mainStatValue}</div>
                    ${subStatsText ? `<div>副属性: ${subStatsText}</div>` : ''}
                </td>
                <td style="padding: 8px; text-align: center; font-weight: bold;">💎 ${item.price}</td>
                <td style="padding: 8px; text-align: center;"><button onclick="buyShopItem(${item.id})" style="padding: 5px 10px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">购买</button></td>
            </tr>
        `;
    });
    
    popupBody.innerHTML = `
        <h3 style="text-align: center; margin-bottom: 15px;">🛒 商店</h3>
        <div style="margin-bottom: 15px; text-align: center;">
            <p style="margin-bottom: 10px;">下次自动刷新: ${nextRefreshTime}</p>
            <button onclick="manualRefreshShop()" style="padding: 8px 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">手动刷新 (${gameData.shop.refreshCost}灵石)</button>
        </div>
        
        <h4 style="margin-top: 20px; margin-bottom: 10px;">装备</h4>
        <div style="overflow-x: auto; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr style="background-color: #f2f2f2;">
                    <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">装备</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">属性</th>
                    <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">价格</th>
                    <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">操作</th>
                </tr>
                ${shopItemsHtml}
            </table>
        </div>
        
        <h4 style="margin-top: 20px; margin-bottom: 10px;">消耗品</h4>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr style="background-color: #f2f2f2;">
                    <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">道具</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">效果</th>
                    <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">价格</th>
                    <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">操作</th>
                </tr>
                <tr>
                    <td style="padding: 8px; text-align: center;">⚡ 突破丹</td>
                    <td style="padding: 8px; text-align: left;">境界突破必备</td>
                    <td style="padding: 8px; text-align: center; font-weight: bold;">💎 1000</td>
                    <td style="padding: 8px; text-align: center;"><button onclick="buyItem('突破丹', 1000)" style="padding: 5px 10px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">购买</button></td>
                </tr>
                <tr>
                    <td style="padding: 8px; text-align: center;">🔨 强化石</td>
                    <td style="padding: 8px; text-align: left;">装备强化材料</td>
                    <td style="padding: 8px; text-align: center; font-weight: bold;">💎 100</td>
                    <td style="padding: 8px; text-align: center;"><button onclick="buyItem('强化石', 100, 10)" style="padding: 5px 10px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">购买×10</button></td>
                </tr>
                <tr>
                    <td style="padding: 8px; text-align: center;">🧬 延寿丹</td>
                    <td style="padding: 8px; text-align: left;">寿元+50</td>
                    <td style="padding: 8px; text-align: center; font-weight: bold;">💎 500</td>
                    <td style="padding: 8px; text-align: center;"><button onclick="buyItem('延寿丹', 500)" style="padding: 5px 10px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">购买</button></td>
                </tr>
                <tr>
                    <td style="padding: 8px; text-align: center;">🐾 灵宠经验丹</td>
                    <td style="padding: 8px; text-align: left;">灵宠升级</td>
                    <td style="padding: 8px; text-align: center; font-weight: bold;">💎 200</td>
                    <td style="padding: 8px; text-align: center;"><button onclick="buyItem('灵宠经验丹', 200, 10)" style="padding: 5px 10px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">购买×10</button></td>
                </tr>
            </table>
        </div>
    `;
    document.getElementById('popup').style.display = 'block';
}

// 购买商店物品
function buyShopItem(id) {
    const item = gameData.shop.items.find(item => item.id === id);
    if (item) {
        if (gameData.resources.stone >= item.price) {
            gameData.resources.stone -= item.price;
            showEquipmentDrop(item);
            
            // 更新掉落统计
            gameData.dropSystem.todayDrops.shop++;
            gameData.dropSystem.totalDrops.shop++;
            
            // 更新最佳品质
            if (getQualityRank(item.quality) > getQualityRank(gameData.dropSystem.bestQuality.shop)) {
                gameData.dropSystem.bestQuality.shop = item.quality;
            }
            if (getQualityRank(item.quality) > getQualityRank(gameData.dropSystem.bestQuality.total)) {
                gameData.dropSystem.bestQuality.total = item.quality;
            }
            
            saveGame();
        } else {
            alert('灵石不足！');
        }
    }
}

// 购买物品
function buyItem(name, price, count = 1) {
    const totalPrice = price * count;
    if (gameData.resources.stone >= totalPrice) {
        gameData.resources.stone -= totalPrice;
        // 添加物品到背包
        const existingItem = gameData.inventory.find(item => item.name === name);
        if (existingItem) {
            existingItem.count += count;
        } else {
            gameData.inventory.push({ name, count });
        }
        updateUI();
        saveGame();
    } else {
        alert("灵石不足！");
    }
}

// 购买装备
function buyEquipment(slot, equipment) {
    let price = 0;
    switch(slot) {
        case 'armor':
            price = 500;
            break;
        case 'ring':
            price = 800;
            break;
        case 'amulet':
            price = 1000;
            break;
    }
    
    if (gameData.resources.stone >= price) {
        gameData.resources.stone -= price;
        gameData.equipment[slot] = equipment;
        updateUI();
        saveGame();
        alert(`成功购买并装备了${equipment.name}！`);
    } else {
        alert("灵石不足！");
    }
}

// 洞府炼器系统
const craftingRecipes = {
    '凡品': {
        wood: 100,
        level: 1,
        successRate: 1.0
    },
    '灵品': {
        wood: 500,
        stone: 50,
        level: 3,
        successRate: 0.9
    },
    '仙品': {
        wood: 2000,
        stone: 300,
        强化石: 10,
        level: 5,
        successRate: 0.8
    },
    '神品': {
        wood: 10000,
        stone: 2000,
        强化石: 50,
        灵木: 10,
        level: 8,
        successRate: 0.6
    },
    '圣品': {
        wood: 50000,
        stone: 10000,
        强化石: 200,
        神木: 5,
        level: 10,
        successRate: 0.4
    }
};

// 打开洞府
function openMap() {
    const popupBody = document.getElementById('popup-body');
    popupBody.innerHTML = `
        <h3>🗺️ 地图</h3>
        <p>当前区域: 新手森林</p>
        <table>
            <tr>
                <th>区域</th>
                <th>解锁条件</th>
                <th>描述</th>
                <th>操作</th>
            </tr>
            <tr>
                <td>新手森林</td>
                <td>凡人一阶</td>
                <td>基础木材资源</td>
                <td><button>进入</button></td>
            </tr>
            <tr>
                <td>青木林</td>
                <td>炼气期</td>
                <td>高级木材资源</td>
                <td><button ${gameData.realm.level < 10 ? 'disabled' : ''}>进入</button></td>
            </tr>
            <tr>
                <td>灵木谷</td>
                <td>筑基期</td>
                <td>稀有木材资源</td>
                <td><button ${gameData.realm.level < 20 ? 'disabled' : ''}>进入</button></td>
            </tr>
        </table>
        <h4 style="margin-top: 20px;">洞府建筑</h4>
        <table>
            <tr>
                <th>建筑</th>
                <th>等级</th>
                <th>效果</th>
                <th>升级需求</th>
                <th>操作</th>
            </tr>
            <tr>
                <td>灵木园</td>
                <td>${gameData.buildings.woodField}</td>
                <td>木材+${gameData.buildings.woodField * 0.1}/小时</td>
                <td>木材×1000</td>
                <td><button onclick="upgradeBuilding('woodField')">升级</button></td>
            </tr>
            <tr>
                <td>灵矿</td>
                <td>${gameData.buildings.stoneMine}</td>
                <td>灵石+${gameData.buildings.stoneMine * 0.1}/小时</td>
                <td>木材×500 灵石×100</td>
                <td><button onclick="upgradeBuilding('stoneMine')">升级</button></td>
            </tr>
            <tr>
                <td>修炼室</td>
                <td>${gameData.buildings.trainingRoom}</td>
                <td>离线修为+${gameData.buildings.trainingRoom * 0.1}/小时</td>
                <td>灵石×1000</td>
                <td><button onclick="upgradeBuilding('trainingRoom')">升级</button></td>
            </tr>
            <tr>
                <td>炼器室</td>
                <td>${gameData.buildings.炼器室}</td>
                <td>可打造${gameData.buildings.炼器室 >= 1 ? '凡品' : '无'}装备</td>
                <td>木材×2000 灵石×500</td>
                <td><button onclick="upgradeBuilding('炼器室')">${gameData.buildings.炼器室 >= 1 ? '升级' : '建造'}</button></td>
            </tr>
        </table>
        ${gameData.buildings.炼器室 >= 1 ? `
        <h4 style="margin-top: 20px;">炼器</h4>
        <button onclick="openCrafting()">打开炼器界面</button>
        ` : ''}
    `;
    document.getElementById('popup').style.display = 'block';
}

// 升级建筑
function upgradeBuilding(building) {
    let cost = {};
    switch(building) {
        case 'woodField':
            cost = { wood: 1000 };
            break;
        case 'stoneMine':
            cost = { wood: 500, stone: 100 };
            break;
        case 'trainingRoom':
            cost = { stone: 1000 };
            break;
        case '炼器室':
            cost = { wood: 2000, stone: 500 };
            break;
    }
    
    // 检查资源是否足够
    let canAfford = true;
    for (const [resource, amount] of Object.entries(cost)) {
        if (gameData.resources[resource] < amount) {
            canAfford = false;
            break;
        }
    }
    
    if (canAfford) {
        // 扣除资源
        for (const [resource, amount] of Object.entries(cost)) {
            gameData.resources[resource] -= amount;
        }
        
        // 升级建筑
        gameData.buildings[building]++;
        updateUI();
        saveGame();
    } else {
        alert('资源不足！');
    }
}

// 打开炼器界面
function openCrafting() {
    const popupBody = document.getElementById('popup-body');
    let craftingHtml = '';
    
    Object.entries(craftingRecipes).forEach(([quality, recipe]) => {
        if (gameData.buildings.炼器室 >= recipe.level) {
            // 检查资源是否足够
            let canCraft = true;
            let costText = '';
            for (const [resource, amount] of Object.entries(recipe)) {
                if (typeof amount === 'number' && resource !== 'level' && resource !== 'successRate') {
                    costText += `${resource}×${amount} `;
                    if (gameData.resources[resource] < amount) {
                        canCraft = false;
                    }
                }
            }
            
            craftingHtml += `
                <tr>
                    <td>${equipmentQuality[quality].color} ${quality}</td>
                    <td>${costText}</td>
                    <td>${(recipe.successRate * 100).toFixed(0)}%</td>
                    <td><button ${!canCraft ? 'disabled' : ''} onclick="craftEquipment('${quality}')">打造</button></td>
                </tr>
            `;
        }
    });
    
    popupBody.innerHTML = `
        <h3>🔨 炼器室</h3>
        <p>炼器室等级: ${gameData.buildings.炼器室}</p>
        <table>
            <tr>
                <th>品质</th>
                <th>材料需求</th>
                <th>成功率</th>
                <th>操作</th>
            </tr>
            ${craftingHtml}
        </table>
    `;
    document.getElementById('popup').style.display = 'block';
}

// 打造装备
function craftEquipment(quality) {
    const recipe = craftingRecipes[quality];
    if (recipe && gameData.buildings.炼器室 >= recipe.level) {
        // 检查资源是否足够
        let canCraft = true;
        for (const [resource, amount] of Object.entries(recipe)) {
            if (typeof amount === 'number' && resource !== 'level' && resource !== 'successRate') {
                if (gameData.resources[resource] < amount) {
                    canCraft = false;
                    break;
                }
            }
        }
        
        if (canCraft) {
            // 扣除资源
            for (const [resource, amount] of Object.entries(recipe)) {
                if (typeof amount === 'number' && resource !== 'level' && resource !== 'successRate') {
                    gameData.resources[resource] -= amount;
                }
            }
            
            // 计算成功率
            if (Math.random() < recipe.successRate) {
                // 成功
                const equipment = generateEquipment(quality);
                showEquipmentDrop(equipment);
                
                // 更新掉落统计
                gameData.dropSystem.todayDrops.craft++;
                gameData.dropSystem.totalDrops.craft++;
                
                // 更新最佳品质
                if (getQualityRank(equipment.quality) > getQualityRank(gameData.dropSystem.bestQuality.craft)) {
                    gameData.dropSystem.bestQuality.craft = equipment.quality;
                }
                if (getQualityRank(equipment.quality) > getQualityRank(gameData.dropSystem.bestQuality.total)) {
                    gameData.dropSystem.bestQuality.total = equipment.quality;
                }
            } else {
                // 失败，返还50%材料
                for (const [resource, amount] of Object.entries(recipe)) {
                    if (typeof amount === 'number' && resource !== 'level' && resource !== 'successRate') {
                        gameData.resources[resource] += Math.floor(amount * 0.5);
                    }
                }
                alert('炼器失败！返还50%材料。');
            }
            
            saveGame();
        } else {
            alert('材料不足！');
        }
    }
}

// 打开设置
function openSettings() {
    const popupBody = document.getElementById('popup-body');
    popupBody.innerHTML = `
        <h3>⚙️ 设置</h3>
        <table>
            <tr>
                <th>功能</th>
                <th>说明</th>
                <th>操作</th>
            </tr>
            <tr>
                <td>自动保存</td>
                <td>每30秒自动存档</td>
                <td><button onclick="toggleAutoSave()">${gameData.autoSave ? '关闭' : '开启'}</button></td>
            </tr>
            <tr>
                <td>导出存档</td>
                <td>复制存档代码</td>
                <td><button onclick="exportSave()">导出</button></td>
            </tr>
            <tr>
                <td>导入存档</td>
                <td>粘贴存档代码恢复</td>
                <td><button onclick="importSave()">导入</button></td>
            </tr>
            <tr>
                <td>转世重修</td>
                <td>保留50%属性重新开始</td>
                <td><button onclick="rebirth()">转世</button></td>
            </tr>
            <tr>
                <td>重置游戏</td>
                <td>清空所有数据</td>
                <td><button onclick="resetGame()">重置</button></td>
            </tr>
        </table>
        <h4 style="margin-top: 20px;">装备获取统计</h4>
        <table>
            <tr>
                <th>获取途径</th>
                <th>今日次数</th>
                <th>累计次数</th>
                <th>最佳品质</th>
            </tr>
            <tr>
                <td>砍树掉落</td>
                <td>${gameData.dropSystem.todayDrops.chop}</td>
                <td>${gameData.dropSystem.totalDrops.chop}</td>
                <td>${equipmentQuality[gameData.dropSystem.bestQuality.chop].color} ${gameData.dropSystem.bestQuality.chop}</td>
            </tr>
            <tr>
                <td>BOSS挑战</td>
                <td>${gameData.dropSystem.todayDrops.boss}</td>
                <td>${gameData.dropSystem.totalDrops.boss}</td>
                <td>${equipmentQuality[gameData.dropSystem.bestQuality.boss].color} ${gameData.dropSystem.bestQuality.boss}</td>
            </tr>
            <tr>
                <td>洞府炼器</td>
                <td>${gameData.dropSystem.todayDrops.craft}</td>
                <td>${gameData.dropSystem.totalDrops.craft}</td>
                <td>${equipmentQuality[gameData.dropSystem.bestQuality.craft].color} ${gameData.dropSystem.bestQuality.craft}</td>
            </tr>
            <tr>
                <td>商店购买</td>
                <td>${gameData.dropSystem.todayDrops.shop}</td>
                <td>${gameData.dropSystem.totalDrops.shop}</td>
                <td>${equipmentQuality[gameData.dropSystem.bestQuality.shop].color} ${gameData.dropSystem.bestQuality.shop}</td>
            </tr>
            <tr>
                <td>总计</td>
                <td>${gameData.dropSystem.todayDrops.chop + gameData.dropSystem.todayDrops.boss + gameData.dropSystem.todayDrops.craft + gameData.dropSystem.todayDrops.shop}</td>
                <td>${gameData.dropSystem.totalDrops.chop + gameData.dropSystem.totalDrops.boss + gameData.dropSystem.totalDrops.craft + gameData.dropSystem.totalDrops.shop}</td>
                <td>${equipmentQuality[gameData.dropSystem.bestQuality.total].color} ${gameData.dropSystem.bestQuality.total}</td>
            </tr>
        </table>
    `;
    document.getElementById('popup').style.display = 'block';
}

// 切换自动保存
function toggleAutoSave() {
    gameData.autoSave = !gameData.autoSave;
    updateUI();
    saveGame();
}

// 导出存档
function exportSave() {
    const saveData = JSON.stringify(gameData);
    const encodedData = btoa(saveData);
    prompt('请复制以下存档代码:', encodedData);
}

// 导入存档
function importSave() {
    const encodedData = prompt('请粘贴存档代码:');
    if (encodedData) {
        try {
            const saveData = atob(encodedData);
            gameData = JSON.parse(saveData);
            updateUI();
            saveGame();
            alert('存档导入成功！');
        } catch (e) {
            alert('存档格式错误！');
        }
    }
}

// 转世重修
function rebirth() {
    if (confirm('确定要转世重修吗？这将保留50%属性并重新开始游戏。')) {
        // 计算永久加成
        gameData.permanentBonus.wood += gameData.resources.totalWood * 0.5;
        gameData.permanentBonus.stone += gameData.resources.stone * 0.5;
        gameData.permanentBonus.exp += gameData.realm.exp * 0.5;
        gameData.rebirthCount++;
        
        // 重置游戏数据
        gameData = {
            realm: { stage: "凡人", level: 1, exp: 0, maxExp: 100 },
            lifespan: { current: 100, max: 100 },
            resources: { wood: 0, stone: 0, totalWood: 0 },
            stats: { attack: 1, speed: 1, crit: 0.05, luck: 0 },
            equipment: {
                weapon: { id: 1, name: "生锈斧头", quality: "凡品", level: 1, stats: { atk: 5 } },
                armor: null,
                ring: null,
                amulet: null
            },
            inventory: [],
            servants: { unlocked: [], active: null },
            pets: { unlocked: [], active: null, levels: {} },
            buildings: { woodField: 0, stoneMine: 0, trainingRoom: 0 },
            lastOfflineTime: Date.now(),
            skills: { active: [null, null, null, null], passive: [], mana: 100, maxMana: 1000 },
            bossesDefeated: [],
            rebirthCount: gameData.rebirthCount,
            permanentBonus: gameData.permanentBonus,
            combo: 0,
            treeHealth: 100,
            autoSave: true
        };
        
        updateUI();
        saveGame();
        alert('转世成功！');
    }
}

// 重置游戏
function resetGame() {
    if (confirm('确定要重置游戏吗？这将清空所有数据！')) {
        localStorage.removeItem('chopTreeGame');
        gameData = {
            realm: { stage: "凡人", level: 1, exp: 0, maxExp: 100 },
            lifespan: { current: 100, max: 100 },
            resources: { wood: 0, stone: 0, totalWood: 0 },
            stats: { attack: 1, speed: 1, crit: 0.05, luck: 0 },
            equipment: {
                weapon: { id: 1, name: "生锈斧头", quality: "凡品", level: 1, stats: { atk: 5 } },
                armor: null,
                ring: null,
                amulet: null
            },
            inventory: [],
            servants: { unlocked: [], active: null },
            pets: { unlocked: [], active: null, levels: {} },
            buildings: { woodField: 0, stoneMine: 0, trainingRoom: 0 },
            lastOfflineTime: Date.now(),
            skills: { active: [null, null, null, null], passive: [], mana: 100, maxMana: 1000 },
            bossesDefeated: [],
            rebirthCount: 0,
            permanentBonus: { wood: 0, stone: 0, exp: 0 },
            combo: 0,
            treeHealth: 100,
            autoSave: true
        };
        
        updateUI();
        alert('游戏已重置！');
    }
}

// 关闭弹窗
function closePopup() {
    document.getElementById('popup').style.display = 'none';
}

// 处理键盘事件
function handleKeyPress(e) {
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault(); // 阻止默认行为，防止空格键导致页面滚动
        chopTree();
    }
}

// 更新UI
function updateUI() {
    // 更新状态栏
    document.getElementById('lifespan').textContent = `${gameData.lifespan.current}/${gameData.lifespan.max}`;
    document.getElementById('realm').textContent = `${gameData.realm.stage}${gameData.realm.level}阶`;
    document.getElementById('exp').textContent = `${Math.floor(gameData.realm.exp)}/${Math.floor(gameData.realm.maxExp)}`;
    document.getElementById('wood').textContent = gameData.resources.wood;
    document.getElementById('stone').textContent = gameData.resources.stone;
    document.getElementById('strengthenStone').textContent = gameData.resources.strengthenStone;
    document.getElementById('spiritWood').textContent = gameData.resources.spiritWood;
    document.getElementById('divineWood').textContent = gameData.resources.divineWood;
    
    // 更新砍树区域
    const treeHealthPercent = (gameData.treeHealth / treeData.maxHealth) * 100;
    document.getElementById('tree-health-bar').style.width = `${treeHealthPercent}%`;
    document.getElementById('tree-hp').textContent = `${Math.floor(gameData.treeHealth)}/${treeData.maxHealth}`;
    document.getElementById('combo').textContent = gameData.combo;
    document.getElementById('combo-bonus').textContent = `+${(gameData.combo * 5)}%`;
    
    // 计算自动收益
    let woodPerSecond = 0;
    let expPerSecond = 0;
    gameData.servants.unlocked.forEach(servantId => {
        const servant = servantsData.find(s => s.id === servantId);
        if (servant) {
            woodPerSecond += servant.rate;
            expPerSecond += servant.rate * 0.1;
        }
    });
    document.getElementById('wood-per-second').textContent = woodPerSecond.toFixed(1);
    document.getElementById('exp-per-second').textContent = expPerSecond.toFixed(1);
    
    // 更新境界系统
    document.getElementById('current-realm').textContent = `${gameData.realm.stage}${gameData.realm.level}阶`;
    document.getElementById('exp-progress').textContent = `${Math.floor(gameData.realm.exp)}/${Math.floor(gameData.realm.maxExp)}`;
    document.getElementById('realm-requirement').textContent = `${Math.floor(gameData.realm.maxExp)}修为`;
    
    // 更新装备系统
    const weapon = gameData.equipment.weapon;
    document.getElementById('weapon-name').textContent = `${weapon.name} Lv.${weapon.level}`;
    let weaponStatsText = `⚔️ 攻击+${weapon.stats.atk || 0}`;
    // 添加武器副属性
    if (weapon.subStats) {
        if (weapon.subStats.atk) weaponStatsText += ` ⚔️ 攻击+${weapon.subStats.atk}`;
        if (weapon.subStats.woodBonus) weaponStatsText += ` 🪵 木材+${(weapon.subStats.woodBonus * 100).toFixed(0)}%`;
        if (weapon.subStats.stoneBonus) weaponStatsText += ` 💎 灵石+${(weapon.subStats.stoneBonus * 100).toFixed(0)}%`;
        if (weapon.subStats.expBonus) weaponStatsText += ` ⭐ 修为+${(weapon.subStats.expBonus * 100).toFixed(0)}%`;
        if (weapon.subStats.crit) weaponStatsText += ` 💥 暴击率+${(weapon.subStats.crit * 100).toFixed(0)}%`;
    }
    document.getElementById('weapon-stats').textContent = weaponStatsText;
    
    // 更新道袍
    const armor = gameData.equipment.armor;
    if (armor) {
        document.getElementById('armor-name').textContent = `${armor.name} Lv.${armor.level}`;
        let armorStatsText = `❤️ 生命+${armor.stats.hp || 0}`;
        if (armor.stats.woodBonus) armorStatsText += ` 🪵 木材+${(armor.stats.woodBonus * 100).toFixed(0)}%`;
        // 添加道袍副属性
        if (armor.subStats) {
            if (armor.subStats.hp) armorStatsText += ` ❤️ 生命+${armor.subStats.hp}`;
            if (armor.subStats.woodBonus) armorStatsText += ` 🪵 木材+${(armor.subStats.woodBonus * 100).toFixed(0)}%`;
            if (armor.subStats.stoneBonus) armorStatsText += ` 💎 灵石+${(armor.subStats.stoneBonus * 100).toFixed(0)}%`;
            if (armor.subStats.expBonus) armorStatsText += ` ⭐ 修为+${(armor.subStats.expBonus * 100).toFixed(0)}%`;
            if (armor.subStats.crit) armorStatsText += ` 💥 暴击率+${(armor.subStats.crit * 100).toFixed(0)}%`;
        }
        document.getElementById('armor-stats').textContent = armorStatsText;
    } else {
        document.getElementById('armor-name').textContent = "无";
        document.getElementById('armor-stats').textContent = "❤️ 生命+0 🪵 木材+0%";
    }
    
    // 更新戒指
    const ring = gameData.equipment.ring;
    if (ring) {
        document.getElementById('ring-name').textContent = `${ring.name} Lv.${ring.level}`;
        let ringStatsText = `⚡ 攻速+${((ring.stats.speed || 0) * 100).toFixed(0)}%`;
        if (ring.stats.stoneBonus) ringStatsText += ` 💎 灵石+${(ring.stats.stoneBonus * 100).toFixed(0)}%`;
        // 添加戒指副属性
        if (ring.subStats) {
            if (ring.subStats.speed) ringStatsText += ` ⚡ 攻速+${(ring.subStats.speed * 100).toFixed(0)}%`;
            if (ring.subStats.stoneBonus) ringStatsText += ` 💎 灵石+${(ring.subStats.stoneBonus * 100).toFixed(0)}%`;
            if (ring.subStats.woodBonus) ringStatsText += ` 🪵 木材+${(ring.subStats.woodBonus * 100).toFixed(0)}%`;
            if (ring.subStats.expBonus) ringStatsText += ` ⭐ 修为+${(ring.subStats.expBonus * 100).toFixed(0)}%`;
            if (ring.subStats.crit) ringStatsText += ` 💥 暴击率+${(ring.subStats.crit * 100).toFixed(0)}%`;
        }
        document.getElementById('ring-stats').textContent = ringStatsText;
    } else {
        document.getElementById('ring-name').textContent = "无";
        document.getElementById('ring-stats').textContent = "⚡ 攻速+0% 💎 灵石+0%";
    }
    
    // 更新护符
    const amulet = gameData.equipment.amulet;
    if (amulet) {
        document.getElementById('amulet-name').textContent = `${amulet.name} Lv.${amulet.level}`;
        let amuletStatsText = `🍀 幸运+${amulet.stats.luck || 0}`;
        if (amulet.stats.expBonus) amuletStatsText += ` ⭐ 修为+${(amulet.stats.expBonus * 100).toFixed(0)}%`;
        // 添加护符副属性
        if (amulet.subStats) {
            if (amulet.subStats.luck) amuletStatsText += ` 🍀 幸运+${amulet.subStats.luck}`;
            if (amulet.subStats.expBonus) amuletStatsText += ` ⭐ 修为+${(amulet.subStats.expBonus * 100).toFixed(0)}%`;
            if (amulet.subStats.woodBonus) amuletStatsText += ` 🪵 木材+${(amulet.subStats.woodBonus * 100).toFixed(0)}%`;
            if (amulet.subStats.stoneBonus) amuletStatsText += ` 💎 灵石+${(amulet.subStats.stoneBonus * 100).toFixed(0)}%`;
            if (amulet.subStats.crit) amuletStatsText += ` 💥 暴击率+${(amulet.subStats.crit * 100).toFixed(0)}%`;
        }
        document.getElementById('amulet-stats').textContent = amuletStatsText;
    } else {
        document.getElementById('amulet-name').textContent = "无";
        document.getElementById('amulet-stats').textContent = "🍀 幸运+0 ⭐ 修为+0%";
    }
    
    // 更新道童系统
    servantsData.forEach(servant => {
        const statusElement = document.getElementById(`servant${servant.id}-status`);
        if (gameData.servants.unlocked.includes(servant.id)) {
            statusElement.textContent = "已招募";
        } else {
            statusElement.textContent = "未招募";
        }
    });
    
    // 更新角色属性
    updateCharacterStats();
}

// 更新角色属性
function updateCharacterStats() {
    // 计算攻击力
    let attack = gameData.stats.attack;
    if (gameData.equipment.weapon) {
        attack += gameData.equipment.weapon.stats.atk || 0;
        // 检查武器副属性
        if (gameData.equipment.weapon.subStats) {
            attack += gameData.equipment.weapon.subStats.atk || 0;
        }
    }
    document.getElementById('attack-value').textContent = attack;
    
    // 计算生命值
    let hp = gameData.lifespan.max;
    if (gameData.equipment.armor) {
        hp += gameData.equipment.armor.stats.hp || 0;
        // 检查道袍副属性
        if (gameData.equipment.armor.subStats) {
            hp += gameData.equipment.armor.subStats.hp || 0;
        }
    }
    document.getElementById('hp-value').textContent = hp;
    
    // 计算攻速
    let speed = 100;
    if (gameData.equipment.ring) {
        speed += (gameData.equipment.ring.stats.speed || 0) * 100;
        // 检查戒指副属性
        if (gameData.equipment.ring.subStats) {
            speed += (gameData.equipment.ring.subStats.speed || 0) * 100;
        }
    }
    document.getElementById('speed-value').textContent = `${speed.toFixed(0)}%`;
    
    // 计算幸运
    let luck = 0;
    if (gameData.equipment.amulet) {
        luck += gameData.equipment.amulet.stats.luck || 0;
        // 检查护符副属性
        if (gameData.equipment.amulet.subStats) {
            luck += gameData.equipment.amulet.subStats.luck || 0;
        }
    }
    document.getElementById('luck-value').textContent = luck;
    
    // 计算木材加成
    let woodBonus = 0;
    // 检查所有装备的木材加成副属性
    if (gameData.equipment.armor) {
        woodBonus += (gameData.equipment.armor.stats.woodBonus || 0) * 100;
        if (gameData.equipment.armor.subStats) {
            woodBonus += (gameData.equipment.armor.subStats.woodBonus || 0) * 100;
        }
    }
    if (gameData.equipment.weapon && gameData.equipment.weapon.subStats) {
        woodBonus += (gameData.equipment.weapon.subStats.woodBonus || 0) * 100;
    }
    if (gameData.equipment.ring && gameData.equipment.ring.subStats) {
        woodBonus += (gameData.equipment.ring.subStats.woodBonus || 0) * 100;
    }
    if (gameData.equipment.amulet && gameData.equipment.amulet.subStats) {
        woodBonus += (gameData.equipment.amulet.subStats.woodBonus || 0) * 100;
    }
    document.getElementById('wood-bonus-value').textContent = `${woodBonus.toFixed(0)}%`;
    
    // 计算灵石加成
    let stoneBonus = 0;
    // 检查所有装备的灵石加成副属性
    if (gameData.equipment.ring) {
        stoneBonus += (gameData.equipment.ring.stats.stoneBonus || 0) * 100;
        if (gameData.equipment.ring.subStats) {
            stoneBonus += (gameData.equipment.ring.subStats.stoneBonus || 0) * 100;
        }
    }
    if (gameData.equipment.weapon && gameData.equipment.weapon.subStats) {
        stoneBonus += (gameData.equipment.weapon.subStats.stoneBonus || 0) * 100;
    }
    if (gameData.equipment.armor && gameData.equipment.armor.subStats) {
        stoneBonus += (gameData.equipment.armor.subStats.stoneBonus || 0) * 100;
    }
    if (gameData.equipment.amulet && gameData.equipment.amulet.subStats) {
        stoneBonus += (gameData.equipment.amulet.subStats.stoneBonus || 0) * 100;
    }
    document.getElementById('stone-bonus-value').textContent = `${stoneBonus.toFixed(0)}%`;
    
    // 计算修为加成
    let expBonus = 0;
    // 检查所有装备的修为加成副属性
    if (gameData.equipment.amulet) {
        expBonus += (gameData.equipment.amulet.stats.expBonus || 0) * 100;
        if (gameData.equipment.amulet.subStats) {
            expBonus += (gameData.equipment.amulet.subStats.expBonus || 0) * 100;
        }
    }
    if (gameData.equipment.weapon && gameData.equipment.weapon.subStats) {
        expBonus += (gameData.equipment.weapon.subStats.expBonus || 0) * 100;
    }
    if (gameData.equipment.armor && gameData.equipment.armor.subStats) {
        expBonus += (gameData.equipment.armor.subStats.expBonus || 0) * 100;
    }
    if (gameData.equipment.ring && gameData.equipment.ring.subStats) {
        expBonus += (gameData.equipment.ring.subStats.expBonus || 0) * 100;
    }
    document.getElementById('exp-bonus-value').textContent = `${expBonus.toFixed(0)}%`;
    
    // 计算暴击率
    let crit = gameData.stats.crit * 100;
    // 检查所有装备的暴击率副属性
    if (gameData.equipment.weapon && gameData.equipment.weapon.subStats) {
        crit += (gameData.equipment.weapon.subStats.crit || 0) * 100;
    }
    if (gameData.equipment.armor && gameData.equipment.armor.subStats) {
        crit += (gameData.equipment.armor.subStats.crit || 0) * 100;
    }
    if (gameData.equipment.ring && gameData.equipment.ring.subStats) {
        crit += (gameData.equipment.ring.subStats.crit || 0) * 100;
    }
    if (gameData.equipment.amulet && gameData.equipment.amulet.subStats) {
        crit += (gameData.equipment.amulet.subStats.crit || 0) * 100;
    }
    document.getElementById('crit-value').textContent = `${crit.toFixed(1)}%`;
}

// 初始化游戏
window.onload = initGame;
// 游戏核心数据结构
let gameData = {
    // 基础属性
    realm: { stage: "凡人", level: 1, exp: 0, maxExp: 100 },
    lifespan: { current: 100, max: 100 },
    resources: { wood: 0, stone: 0, totalWood: 0 },
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
        trainingRoom: 0
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
    autoSave: true
};

// 树木数据
const treeData = {
    maxHealth: 100,
    baseWood: 1,
    maxWood: 3,
    baseExp: 1,
    baseStoneChance: 0.1
};

// 道童数据
const servantsData = [
    { id: 1, name: "砍柴童子", cost: 500, rate: 1, bonus: 0 },
    { id: 2, name: "伐木匠人", cost: 2000, rate: 3, bonus: 0.1 },
    { id: 3, name: "灵木师", cost: 10000, rate: 5, bonus: 1 }
];

// 装备强化数据
const强化Cost = (level) => {
    return 50 * level;
};

// 初始化游戏
function initGame() {
    loadGame();
    updateUI();
    startAutoChopping();
    startAutoSave();
    // 绑定键盘事件
    document.addEventListener('keydown', handleKeyPress);
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
        const cost = 强化Cost(weapon.level);
        if (gameData.resources.wood >= cost) {
            gameData.resources.wood -= cost;
            weapon.level++;
            weapon.stats.atk += 2; // 每级强化攻击+2
            updateUI();
            saveGame();
        } else {
            alert("木材不足！");
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
                    <td>${item.count}</td>
                    <td><button>使用</button></td>
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

// 打开挑战
function openChallenges() {
    const popupBody = document.getElementById('popup-body');
    popupBody.innerHTML = `
        <h3>挑战系统</h3>
        <table>
            <tr>
                <th>妖兽</th>
                <th>解锁境界</th>
                <th>血量</th>
                <th>限时</th>
                <th>掉落</th>
                <th>操作</th>
            </tr>
            <tr>
                <td>树妖</td>
                <td>炼气期</td>
                <td>1000</td>
                <td>60秒</td>
                <td>绿装 灵石×100</td>
                <td><button ${gameData.realm.level < 10 ? 'disabled' : ''}>挑战</button></td>
            </tr>
            <tr>
                <td>木灵精</td>
                <td>筑基期</td>
                <td>5000</td>
                <td>60秒</td>
                <td>蓝装 灵宠蛋</td>
                <td><button ${gameData.realm.level < 20 ? 'disabled' : ''}>挑战</button></td>
            </tr>
            <tr>
                <td>森林霸主</td>
                <td>金丹期</td>
                <td>20000</td>
                <td>90秒</td>
                <td>紫装 突破丹×3</td>
                <td><button ${gameData.realm.level < 30 ? 'disabled' : ''}>挑战</button></td>
            </tr>
        </table>
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
    popupBody.innerHTML = `
        <h3>商店</h3>
        <table>
            <tr>
                <th>道具</th>
                <th>效果</th>
                <th>价格</th>
                <th>操作</th>
            </tr>
            <tr>
                <td>突破丹</td>
                <td>境界突破必备</td>
                <td>1000灵石</td>
                <td><button onclick="buyItem('突破丹', 1000)">购买</button></td>
            </tr>
            <tr>
                <td>强化石</td>
                <td>装备强化材料</td>
                <td>100灵石</td>
                <td><button onclick="buyItem('强化石', 100, 10)">购买×10</button></td>
            </tr>
            <tr>
                <td>延寿丹</td>
                <td>寿元+50</td>
                <td>500灵石</td>
                <td><button onclick="buyItem('延寿丹', 500)">购买</button></td>
            </tr>
            <tr>
                <td>灵宠经验丹</td>
                <td>灵宠升级</td>
                <td>200灵石</td>
                <td><button onclick="buyItem('灵宠经验丹', 200, 10)">购买×10</button></td>
            </tr>
        </table>
    `;
    document.getElementById('popup').style.display = 'block';
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

// 打开设置
function openSettings() {
    const popupBody = document.getElementById('popup-body');
    popupBody.innerHTML = `
        <h3>设置</h3>
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
    document.getElementById('stone').textContent = gameData.resources.stone;
    
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
    document.getElementById('weapon-stats').textContent = `攻击+${weapon.stats.atk}`;
    
    // 更新道童系统
    servantsData.forEach(servant => {
        const statusElement = document.getElementById(`servant${servant.id}-status`);
        if (gameData.servants.unlocked.includes(servant.id)) {
            statusElement.textContent = "已招募";
        } else {
            statusElement.textContent = "未招募";
        }
    });
}

// 初始化游戏
window.onload = initGame;
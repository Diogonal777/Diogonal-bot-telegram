// Онлайн текстовая RPG для Telegram-бота
const { getBalance, updateBalance } = require('../currency');

// Классы персонажей
// Здесь мы определяем различные классы, которые доступны для игроков
const CHARACTER_CLASSES = {
  warrior: {
    name: 'Воин',
    description: 'Мастер ближнего боя с высокой защитой',
    stats: {
      health: 120,
      attack: 8,
      defense: 10,
      magic: 2
    },
    abilities: ['Сильный удар', 'Стойка защиты', 'Боевой клич']
  },
  mage: {
    name: 'Маг',
    description: 'Владеет мощными заклинаниями и магией',
    stats: {
      health: 80,
      attack: 3,
      defense: 4,
      magic: 15
    },
    abilities: ['Огненный шар', 'Ледяной щит', 'Телепорт']
  },
  archer: {
    name: 'Лучник',
    description: 'Эксперт по атакам с дальней дистанции',
    stats: {
      health: 90,
      attack: 12,
      defense: 5,
      magic: 5
    },
    abilities: ['Меткий выстрел', 'Дождь стрел', 'Маскировка']
  },
  healer: {
    name: 'Целитель',
    description: 'Поддерживает союзников и лечит раны',
    stats: {
      health: 100,
      attack: 4,
      defense: 6,
      magic: 12
    },
    abilities: ['Исцеление', 'Благословение', 'Возрождение']
  }
};

// Локации для исследования
const LOCATIONS = {
  village: {
    name: 'Деревня',
    description: 'Мирная деревня, где можно отдохнуть и пополнить запасы',
    actions: ['Магазин', 'Таверна', 'Кузница', 'Выйти из деревни'],
    enemies: []
  },
  forest: {
    name: 'Лес',
    description: 'Темный лес с различными монстрами и сокровищами',
    actions: ['Исследовать', 'Охотиться', 'Собирать ресурсы', 'Вернуться в деревню'],
    enemies: ['Волк', 'Гоблин', 'Дикий кабан', 'Лесной тролль']
  },
  cave: {
    name: 'Пещера',
    description: 'Глубокая пещера с ценными ресурсами и опасными существами',
    actions: ['Добывать руду', 'Исследовать глубины', 'Сражаться с монстрами', 'Вернуться в деревню'],
    enemies: ['Летучая мышь', 'Пещерный паук', 'Скелет', 'Горный тролль']
  },
  mountains: {
    name: 'Горы',
    description: 'Высокие горы с редкими ресурсами и сильными противниками',
    actions: ['Восхождение', 'Поиск сокровищ', 'Охота на монстров', 'Вернуться в деревню'],
    enemies: ['Горный волк', 'Йети', 'Гарпия', 'Горный великан']
  },
  dungeon: {
    name: 'Подземелье',
    description: 'Древнее подземелье с ловушками и могущественными врагами',
    actions: ['Исследовать комнаты', 'Искать сокровища', 'Сражаться с боссом', 'Вернуться в деревню'],
    enemies: ['Скелет-воин', 'Зомби', 'Призрак', 'Некромант', 'Древний дракон']
  }
};

// Предметы и снаряжение
const ITEMS = {
  weapons: {
    'Ржавый меч': { attack: 5, cost: 50 },
    'Короткий лук': { attack: 7, cost: 75 },
    'Боевой посох': { attack: 3, magic: 8, cost: 100 },
    'Стальной клинок': { attack: 12, cost: 200 },
    'Эльфийский лук': { attack: 15, cost: 250 },
    'Посох архимага': { attack: 6, magic: 18, cost: 300 }
  },
  armor: {
    'Кожаная броня': { defense: 5, cost: 60 },
    'Кольчуга': { defense: 10, cost: 150 },
    'Мантия мага': { defense: 3, magic: 5, cost: 120 },
    'Стальные доспехи': { defense: 15, cost: 280 },
    'Эльфийские доспехи': { defense: 12, speed: 5, cost: 250 },
    'Мантия архимага': { defense: 8, magic: 12, cost: 320 }
  },
  potions: {
    'Малое зелье здоровья': { effect: 'health', value: 30, cost: 20 },
    'Зелье силы': { effect: 'attack', value: 5, cost: 30 },
    'Зелье защиты': { effect: 'defense', value: 5, cost: 30 },
    'Большое зелье здоровья': { effect: 'health', value: 80, cost: 50 },
    'Эликсир магии': { effect: 'magic', value: 10, cost: 60 }
  }
};

// База данных игроков (в памяти)
const players = new Map();

/**
 * Инициализирует нового игрока с выбранным классом
 * @param {number} userId - ID пользователя
 * @param {string} className - Название класса персонажа
 * @returns {object} - Данные созданного игрока
 */
async function createPlayer(userId, className) {
  if (!CHARACTER_CLASSES[className]) {
    throw new Error('Неверный класс персонажа');
  }

  const playerClass = CHARACTER_CLASSES[className];
  
  const player = {
    userId,
    className,
    name: playerClass.name,
    level: 1,
    experience: 0,
    stats: { ...playerClass.stats },
    currentHealth: playerClass.stats.health,
    abilities: [...playerClass.abilities],
    inventory: {
      gold: 100,
      items: []
    },
    equipment: {
      weapon: null,
      armor: null
    },
    location: 'village',
    quests: [],
    lastAction: Date.now()
  };

  // Сохраняем игрока в "базе данных"
  players.set(userId, player);
  
  return player;
}

/**
 * Получает данные игрока
 * @param {number} userId - ID пользователя
 * @returns {object|null} - Данные игрока или null, если игрок не найден
 */
function getPlayer(userId) {
  return players.get(userId) || null;
}

/**
 * Сохраняет данные игрока
 * @param {object} player - Данные игрока
 */
function savePlayer(player) {
  players.set(player.userId, player);
}

/**
 * Проверяет, существует ли игрок
 * @param {number} userId - ID пользователя
 * @returns {boolean} - true, если игрок существует
 */
function playerExists(userId) {
  return players.has(userId);
}

/**
 * Удаляет игрока из базы данных
 * @param {number} userId - ID пользователя
 */
function deletePlayer(userId) {
  players.delete(userId);
}

/**
 * Начинает RPG-игру или продолжает, если игрок уже существует
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 */
function startRPG(bot, chatId) {
  if (playerExists(chatId)) {
    const player = getPlayer(chatId);
    sendLocationMenu(bot, chatId, player);
  } else {
    sendClassSelectionMenu(bot, chatId);
  }
}

/**
 * Отправляет меню выбора класса персонажа
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 */
function sendClassSelectionMenu(bot, chatId) {
  const message = '🎮 Добро пожаловать в RPG-мир!\n\nВыберите класс вашего персонажа:';
  
  const keyboard = [];
  
  for (const [key, characterClass] of Object.entries(CHARACTER_CLASSES)) {
    keyboard.push([{
      text: `${characterClass.name} - ${characterClass.description}`,
      callback_data: `rpg_class_${key}`
    }]);
  }
  
  keyboard.push([{ text: '« Назад', callback_data: 'back_to_main' }]);
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
}

/**
 * Обрабатывает выбор класса персонажа
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {string} className - Название выбранного класса
 */
async function handleClassSelection(bot, chatId, className) {
  try {
    const player = await createPlayer(chatId, className);
    
    let message = `✅ Вы выбрали класс: ${player.name}\n\n`;
    message += `💪 Характеристики:\n`;
    message += `❤️ Здоровье: ${player.stats.health}\n`;
    message += `⚔️ Атака: ${player.stats.attack}\n`;
    message += `🛡️ Защита: ${player.stats.defense}\n`;
    message += `✨ Магия: ${player.stats.magic}\n\n`;
    message += `🔮 Способности:\n`;
    
    player.abilities.forEach(ability => {
      message += `- ${ability}\n`;
    });
    
    message += `\n💰 Золото: ${player.inventory.gold}\n`;
    message += `\nВы находитесь в локации: ${LOCATIONS[player.location].name}`;
    
    bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Исследовать мир', callback_data: 'rpg_explore' }],
          [{ text: 'Информация о персонаже', callback_data: 'rpg_char_info' }],
          [{ text: '« Главное меню', callback_data: 'back_to_main' }]
        ]
      }
    });
  } catch (error) {
    bot.sendMessage(chatId, `Ошибка при создании персонажа: ${error.message}`);
  }
}

/**
 * Отправляет информацию о персонаже
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 */
function sendCharacterInfo(bot, chatId) {
  const player = getPlayer(chatId);
  
  if (!player) {
    return bot.sendMessage(chatId, 'У вас нет персонажа. Начните игру, чтобы создать его.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Начать игру', callback_data: 'rpg_start' }],
          [{ text: '« Главное меню', callback_data: 'back_to_main' }]
        ]
      }
    });
  }
  
  let message = `📝 Информация о персонаже\n\n`;
  message += `🧙‍♂️ Имя: Герой\n`;
  message += `🏅 Класс: ${player.name}\n`;
  message += `📊 Уровень: ${player.level} (Опыт: ${player.experience}/${player.level * 100})\n\n`;
  
  message += `💪 Характеристики:\n`;
  message += `❤️ Здоровье: ${player.currentHealth}/${player.stats.health}\n`;
  message += `⚔️ Атака: ${player.stats.attack}\n`;
  message += `🛡️ Защита: ${player.stats.defense}\n`;
  message += `✨ Магия: ${player.stats.magic}\n\n`;
  
  message += `🔮 Способности:\n`;
  player.abilities.forEach(ability => {
    message += `- ${ability}\n`;
  });
  
  message += `\n💰 Золото: ${player.inventory.gold}\n`;
  
  message += `\n🎒 Снаряжение:\n`;
  message += `🗡️ Оружие: ${player.equipment.weapon || 'Нет'}\n`;
  message += `🛡️ Броня: ${player.equipment.armor || 'Нет'}\n\n`;
  
  message += `📦 Инвентарь (${player.inventory.items.length} предметов):\n`;
  if (player.inventory.items.length === 0) {
    message += `Пусто\n`;
  } else {
    player.inventory.items.forEach(item => {
      message += `- ${item.name} (${item.type})\n`;
    });
  }
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Исследовать мир', callback_data: 'rpg_explore' }],
        [{ text: '« Главное меню', callback_data: 'back_to_main' }]
      ]
    }
  });
}

/**
 * Отправляет меню локации
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {object} player - Данные игрока
 */
function sendLocationMenu(bot, chatId, player) {
  const location = LOCATIONS[player.location];
  
  let message = `📍 Вы находитесь в локации: ${location.name}\n\n`;
  message += `${location.description}\n\n`;
  
  message += `❤️ Здоровье: ${player.currentHealth}/${player.stats.health} | 💰 Золото: ${player.inventory.gold}\n\n`;
  
  message += `Выберите действие:`;
  
  const keyboard = [];
  
  // Добавляем действия для текущей локации
  location.actions.forEach(action => {
    keyboard.push([{ text: action, callback_data: `rpg_action_${player.location}_${action.replace(/ /g, '_')}` }]);
  });
  
  // Добавляем базовые опции
  keyboard.push([
    { text: 'Персонаж', callback_data: 'rpg_char_info' },
    { text: 'Инвентарь', callback_data: 'rpg_inventory' }
  ]);
  
  keyboard.push([{ text: '« Главное меню', callback_data: 'back_to_main' }]);
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
}

/**
 * Обрабатывает исследование мира
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 */
function exploreWorld(bot, chatId) {
  const player = getPlayer(chatId);
  
  if (!player) {
    return bot.sendMessage(chatId, 'У вас нет персонажа. Начните игру, чтобы создать его.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Начать игру', callback_data: 'rpg_start' }],
          [{ text: '« Главное меню', callback_data: 'back_to_main' }]
        ]
      }
    });
  }
  
  let message = `🗺️ Выберите локацию для исследования:\n\n`;
  
  const keyboard = [];
  
  // Добавляем все доступные локации
  for (const [key, location] of Object.entries(LOCATIONS)) {
    keyboard.push([{ 
      text: `${location.name} - ${location.description.slice(0, 40)}...`, 
      callback_data: `rpg_location_${key}` 
    }]);
  }
  
  keyboard.push([{ text: '« Назад', callback_data: 'rpg_char_info' }]);
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
}

/**
 * Обрабатывает выбор локации
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {string} locationKey - Ключ выбранной локации
 */
function handleLocationSelection(bot, chatId, locationKey) {
  const player = getPlayer(chatId);
  
  if (!player) {
    return bot.sendMessage(chatId, 'У вас нет персонажа. Начните игру, чтобы создать его.');
  }
  
  if (!LOCATIONS[locationKey]) {
    return bot.sendMessage(chatId, 'Выбрана неверная локация.');
  }
  
  // Обновляем локацию игрока
  player.location = locationKey;
  savePlayer(player);
  
  // Показываем меню локации
  sendLocationMenu(bot, chatId, player);
}

/**
 * Обрабатывает действие в локации
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {string} locationKey - Ключ локации
 * @param {string} actionKey - Ключ действия
 */
function handleLocationAction(bot, chatId, locationKey, actionKey) {
  const player = getPlayer(chatId);
  
  if (!player) {
    return bot.sendMessage(chatId, 'У вас нет персонажа. Начните игру, чтобы создать его.');
  }
  
  // Переводим ключ действия обратно в текст
  const actionText = actionKey.replace(/_/g, ' ');
  
  // Проверяем, есть ли у локации такое действие
  const location = LOCATIONS[locationKey];
  if (!location || !location.actions.includes(actionText)) {
    return bot.sendMessage(chatId, 'Неверное действие для этой локации.');
  }
  
  let message = '';
  
  // Обрабатываем различные действия в зависимости от локации
  switch (locationKey) {
    case 'village':
      switch (actionText) {
        case 'Магазин':
          return showShop(bot, chatId, player);
        case 'Таверна':
          message = 'Вы зашли в таверну. Здесь можно отдохнуть и восстановить здоровье.';
          // Восстанавливаем здоровье
          player.currentHealth = player.stats.health;
          savePlayer(player);
          break;
        case 'Кузница':
          message = 'Кузнец предлагает улучшить ваше оружие и броню за золото.';
          break;
        case 'Выйти из деревни':
          return exploreWorld(bot, chatId);
      }
      break;
      
    case 'forest':
    case 'cave':
    case 'mountains':
    case 'dungeon':
      if (actionText === 'Вернуться в деревню') {
        player.location = 'village';
        savePlayer(player);
        return sendLocationMenu(bot, chatId, player);
      } else if (actionText.includes('Сражаться') || actionText === 'Охотиться' || actionText === 'Охота на монстров') {
        return startBattle(bot, chatId, player, locationKey);
      } else {
        // Для других действий (исследование, сбор ресурсов и т.д.)
        const reward = Math.floor(Math.random() * 20) + 10;
        player.inventory.gold += reward;
        savePlayer(player);
        message = `Вы ${actionText.toLowerCase()} и находите ${reward} золота!`;
        
        // Шанс найти предмет
        if (Math.random() < 0.3) {
          const itemTypes = ['weapons', 'armor', 'potions'];
          const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
          const itemKeys = Object.keys(ITEMS[itemType]);
          const itemKey = itemKeys[Math.floor(Math.random() * Math.min(3, itemKeys.length))]; // Берем один из первых (более слабых) предметов
          
          player.inventory.items.push({
            name: itemKey,
            type: itemType,
            ...ITEMS[itemType][itemKey]
          });
          
          savePlayer(player);
          message += `\n\nВы также находите: ${itemKey}!`;
        }
      }
      break;
  }
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Продолжить', callback_data: `rpg_location_${player.location}` }]
      ]
    }
  });
}

/**
 * Показывает магазин
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {object} player - Данные игрока
 */
function showShop(bot, chatId, player) {
  let message = `🏪 Магазин\n\n`;
  message += `💰 У вас ${player.inventory.gold} золота\n\n`;
  message += `Что хотите купить?`;
  
  const keyboard = [];
  
  // Добавляем категории товаров
  keyboard.push([
    { text: '🗡️ Оружие', callback_data: 'rpg_shop_weapons' },
    { text: '🛡️ Броня', callback_data: 'rpg_shop_armor' }
  ]);
  
  keyboard.push([
    { text: '🧪 Зелья', callback_data: 'rpg_shop_potions' }
  ]);
  
  keyboard.push([{ text: '« Назад', callback_data: `rpg_location_${player.location}` }]);
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
}

/**
 * Показывает товары в магазине
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {string} category - Категория товаров
 */
function showShopItems(bot, chatId, category) {
  const player = getPlayer(chatId);
  
  if (!player) {
    return bot.sendMessage(chatId, 'У вас нет персонажа. Начните игру, чтобы создать его.');
  }
  
  const categoryItems = ITEMS[category];
  if (!categoryItems) {
    return bot.sendMessage(chatId, 'Неверная категория товаров.');
  }
  
  let message = `🏪 Магазин - ${category === 'weapons' ? 'Оружие' : category === 'armor' ? 'Броня' : 'Зелья'}\n\n`;
  message += `💰 У вас ${player.inventory.gold} золота\n\n`;
  
  const keyboard = [];
  
  // Добавляем товары в меню
  for (const [itemName, itemData] of Object.entries(categoryItems)) {
    const itemDescription = category === 'weapons' ? 
      `Атака +${itemData.attack}${itemData.magic ? `, Магия +${itemData.magic}` : ''}` :
      category === 'armor' ? 
      `Защита +${itemData.defense}${itemData.magic ? `, Магия +${itemData.magic}` : ''}` :
      `${itemData.effect.charAt(0).toUpperCase() + itemData.effect.slice(1)} +${itemData.value}`;
    
    keyboard.push([{ 
      text: `${itemName} (${itemDescription}) - ${itemData.cost} золота`, 
      callback_data: `rpg_buy_${category}_${itemName.replace(/ /g, '_')}` 
    }]);
  }
  
  keyboard.push([{ text: '« Назад в магазин', callback_data: 'rpg_shop' }]);
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
}

/**
 * Обрабатывает покупку предмета
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {string} category - Категория товара
 * @param {string} itemKey - Ключ предмета
 */
function handleItemPurchase(bot, chatId, category, itemKey) {
  const player = getPlayer(chatId);
  
  if (!player) {
    return bot.sendMessage(chatId, 'У вас нет персонажа. Начните игру, чтобы создать его.');
  }
  
  // Преобразуем ключ предмета обратно в название
  const itemName = itemKey.replace(/_/g, ' ');
  
  // Проверяем, существует ли такой предмет
  if (!ITEMS[category] || !ITEMS[category][itemName]) {
    return bot.sendMessage(chatId, 'Такой предмет не существует.');
  }
  
  const item = ITEMS[category][itemName];
  
  // Проверяем, достаточно ли золота
  if (player.inventory.gold < item.cost) {
    return bot.sendMessage(chatId, `У вас недостаточно золота для покупки этого предмета. Нужно: ${item.cost} золота.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '« Назад в магазин', callback_data: 'rpg_shop' }]
        ]
      }
    });
  }
  
  // Вычитаем золото
  player.inventory.gold -= item.cost;
  
  // Добавляем предмет в инвентарь
  player.inventory.items.push({
    name: itemName,
    type: category,
    ...item
  });
  
  // Сохраняем изменения
  savePlayer(player);
  
  bot.sendMessage(chatId, `Вы успешно купили ${itemName} за ${item.cost} золота!`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Купить ещё', callback_data: `rpg_shop_${category}` }],
        [{ text: '« Назад в магазин', callback_data: 'rpg_shop' }]
      ]
    }
  });
}

/**
 * Показывает инвентарь игрока
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 */
function showInventory(bot, chatId) {
  const player = getPlayer(chatId);
  
  if (!player) {
    return bot.sendMessage(chatId, 'У вас нет персонажа. Начните игру, чтобы создать его.');
  }
  
  let message = `🎒 Инвентарь\n\n`;
  message += `💰 Золото: ${player.inventory.gold}\n\n`;
  
  message += `🎒 Предметы:\n`;
  
  if (player.inventory.items.length === 0) {
    message += `У вас нет предметов в инвентаре.`;
  }
  
  const keyboard = [];
  
  // Группируем предметы по типу
  const weapons = player.inventory.items.filter(item => item.type === 'weapons');
  const armor = player.inventory.items.filter(item => item.type === 'armor');
  const potions = player.inventory.items.filter(item => item.type === 'potions');
  
  if (weapons.length > 0) {
    message += `\n🗡️ Оружие:\n`;
    weapons.forEach(item => {
      message += `- ${item.name} (Атака +${item.attack}${item.magic ? `, Магия +${item.magic}` : ''})\n`;
      keyboard.push([{ text: `Экипировать ${item.name}`, callback_data: `rpg_equip_weapon_${player.inventory.items.indexOf(item)}` }]);
    });
  }
  
  if (armor.length > 0) {
    message += `\n🛡️ Броня:\n`;
    armor.forEach(item => {
      message += `- ${item.name} (Защита +${item.defense}${item.magic ? `, Магия +${item.magic}` : ''})\n`;
      keyboard.push([{ text: `Экипировать ${item.name}`, callback_data: `rpg_equip_armor_${player.inventory.items.indexOf(item)}` }]);
    });
  }
  
  if (potions.length > 0) {
    message += `\n🧪 Зелья:\n`;
    potions.forEach(item => {
      const effectName = item.effect === 'health' ? 'Здоровье' : 
                        item.effect === 'attack' ? 'Атака' : 
                        item.effect === 'defense' ? 'Защита' : 
                        item.effect === 'magic' ? 'Магия' : item.effect;
      
      message += `- ${item.name} (${effectName} +${item.value})\n`;
      keyboard.push([{ text: `Использовать ${item.name}`, callback_data: `rpg_use_potion_${player.inventory.items.indexOf(item)}` }]);
    });
  }
  
  message += `\n🎖️ Снаряжение:\n`;
  message += `🗡️ Оружие: ${player.equipment.weapon || 'Нет'}\n`;
  message += `🛡️ Броня: ${player.equipment.armor || 'Нет'}`;
  
  keyboard.push([{ text: '« Назад', callback_data: `rpg_location_${player.location}` }]);
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
}

/**
 * Экипирует предмет
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {string} itemType - Тип предмета (weapon или armor)
 * @param {number} itemIndex - Индекс предмета в инвентаре
 */
function equipItem(bot, chatId, itemType, itemIndex) {
  const player = getPlayer(chatId);
  
  if (!player) {
    return bot.sendMessage(chatId, 'У вас нет персонажа. Начните игру, чтобы создать его.');
  }
  
  const itemIdx = parseInt(itemIndex);
  if (isNaN(itemIdx) || itemIdx < 0 || itemIdx >= player.inventory.items.length) {
    return bot.sendMessage(chatId, 'Неверный индекс предмета.');
  }
  
  const item = player.inventory.items[itemIdx];
  
  if ((itemType === 'weapon' && item.type !== 'weapons') || 
      (itemType === 'armor' && item.type !== 'armor')) {
    return bot.sendMessage(chatId, 'Неверный тип предмета.');
  }
  
  // Снимаем текущее снаряжение, если оно есть
  if (itemType === 'weapon' && player.equipment.weapon) {
    // Убираем бонусы от старого оружия
    const oldWeapon = player.inventory.items.find(i => i.name === player.equipment.weapon);
    if (oldWeapon) {
      player.stats.attack -= oldWeapon.attack || 0;
      player.stats.magic -= oldWeapon.magic || 0;
    }
  } else if (itemType === 'armor' && player.equipment.armor) {
    // Убираем бонусы от старой брони
    const oldArmor = player.inventory.items.find(i => i.name === player.equipment.armor);
    if (oldArmor) {
      player.stats.defense -= oldArmor.defense || 0;
      player.stats.magic -= oldArmor.magic || 0;
    }
  }
  
  // Экипируем новое снаряжение
  if (itemType === 'weapon') {
    player.equipment.weapon = item.name;
    player.stats.attack += item.attack || 0;
    player.stats.magic += item.magic || 0;
  } else {
    player.equipment.armor = item.name;
    player.stats.defense += item.defense || 0;
    player.stats.magic += item.magic || 0;
  }
  
  // Сохраняем изменения
  savePlayer(player);
  
  bot.sendMessage(chatId, `Вы экипировали ${item.name}!`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '« Вернуться в инвентарь', callback_data: 'rpg_inventory' }]
      ]
    }
  });
}

/**
 * Использует зелье
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {number} itemIndex - Индекс предмета в инвентаре
 */
function usePotion(bot, chatId, itemIndex) {
  const player = getPlayer(chatId);
  
  if (!player) {
    return bot.sendMessage(chatId, 'У вас нет персонажа. Начните игру, чтобы создать его.');
  }
  
  const itemIdx = parseInt(itemIndex);
  if (isNaN(itemIdx) || itemIdx < 0 || itemIdx >= player.inventory.items.length) {
    return bot.sendMessage(chatId, 'Неверный индекс предмета.');
  }
  
  const item = player.inventory.items[itemIdx];
  
  if (item.type !== 'potions') {
    return bot.sendMessage(chatId, 'Это не зелье.');
  }
  
  let message = '';
  
  // Применяем эффект зелья
  switch (item.effect) {
    case 'health':
      player.currentHealth = Math.min(player.stats.health, player.currentHealth + item.value);
      message = `Вы восстановили ${item.value} здоровья. Текущее здоровье: ${player.currentHealth}/${player.stats.health}`;
      break;
    case 'attack':
      player.stats.attack += item.value;
      message = `Ваша атака увеличена на ${item.value}. Текущая атака: ${player.stats.attack}`;
      break;
    case 'defense':
      player.stats.defense += item.value;
      message = `Ваша защита увеличена на ${item.value}. Текущая защита: ${player.stats.defense}`;
      break;
    case 'magic':
      player.stats.magic += item.value;
      message = `Ваша магия увеличена на ${item.value}. Текущая магия: ${player.stats.magic}`;
      break;
    default:
      message = `Зелье не имеет эффекта.`;
  }
  
  // Удаляем зелье из инвентаря
  player.inventory.items.splice(itemIdx, 1);
  
  // Сохраняем изменения
  savePlayer(player);
  
  bot.sendMessage(chatId, `Вы использовали ${item.name}. ${message}`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '« Вернуться в инвентарь', callback_data: 'rpg_inventory' }]
      ]
    }
  });
}

/**
 * Начинает сражение с монстром
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {object} player - Данные игрока
 * @param {string} locationKey - Ключ локации
 */
function startBattle(bot, chatId, player, locationKey) {
  const location = LOCATIONS[locationKey];
  
  if (location.enemies.length === 0) {
    return bot.sendMessage(chatId, 'В этой локации нет врагов.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Вернуться', callback_data: `rpg_location_${locationKey}` }]
        ]
      }
    });
  }
  
  // Выбираем случайного врага из локации
  const enemyName = location.enemies[Math.floor(Math.random() * location.enemies.length)];
  
  // Генерируем характеристики врага в зависимости от уровня игрока и локации
  const locationDifficulty = {
    village: 0.8,
    forest: 1,
    cave: 1.2,
    mountains: 1.5,
    dungeon: 2
  };
  
  const difficulty = locationDifficulty[locationKey] || 1;
  const enemyLevel = Math.max(1, Math.floor(player.level * difficulty));
  
  const enemy = {
    name: enemyName,
    level: enemyLevel,
    health: Math.floor(30 * enemyLevel * difficulty),
    maxHealth: Math.floor(30 * enemyLevel * difficulty),
    attack: Math.floor((5 + enemyLevel * 2) * difficulty),
    defense: Math.floor((3 + enemyLevel) * difficulty)
  };
  
  // Сохраняем врага в состоянии игрока
  player.currentBattle = enemy;
  savePlayer(player);
  
  let message = `⚔️ Вы столкнулись с врагом: ${enemy.name} (Уровень ${enemy.level})\n\n`;
  message += `👾 ${enemy.name}:\n`;
  message += `❤️ Здоровье: ${enemy.health}/${enemy.maxHealth}\n`;
  message += `⚔️ Атака: ${enemy.attack}\n`;
  message += `🛡️ Защита: ${enemy.defense}\n\n`;
  
  message += `👤 Вы:\n`;
  message += `❤️ Здоровье: ${player.currentHealth}/${player.stats.health}\n`;
  message += `⚔️ Атака: ${player.stats.attack}\n`;
  message += `🛡️ Защита: ${player.stats.defense}\n`;
  message += `✨ Магия: ${player.stats.magic}\n\n`;
  
  message += `Что вы будете делать?`;
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '⚔️ Атаковать', callback_data: 'rpg_battle_attack' },
          { text: '✨ Использовать магию', callback_data: 'rpg_battle_magic' }
        ],
        [
          { text: '🧪 Использовать зелье', callback_data: 'rpg_battle_potion' },
          { text: '🏃 Сбежать', callback_data: 'rpg_battle_flee' }
        ]
      ]
    }
  });
}

/**
 * Обрабатывает действие в бою
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {string} action - Действие игрока
 */
function handleBattleAction(bot, chatId, action) {
  const player = getPlayer(chatId);
  
  if (!player) {
    return bot.sendMessage(chatId, 'У вас нет персонажа. Начните игру, чтобы создать его.');
  }
  
  if (!player.currentBattle) {
    return bot.sendMessage(chatId, 'Вы не находитесь в бою.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Вернуться', callback_data: `rpg_location_${player.location}` }]
        ]
      }
    });
  }
  
  const enemy = player.currentBattle;
  let message = '';
  
  switch (action) {
    case 'attack':
      // Рассчитываем урон игрока
      const playerDamage = Math.max(1, player.stats.attack - Math.floor(enemy.defense / 2));
      
      // Наносим урон врагу
      enemy.health = Math.max(0, enemy.health - playerDamage);
      
      message = `⚔️ Вы атакуете ${enemy.name} и наносите ${playerDamage} урона!\n`;
      
      // Проверяем, победили ли мы
      if (enemy.health <= 0) {
        return handleBattleVictory(bot, chatId, player, enemy);
      }
      
      // Враг атакует в ответ
      const enemyDamage = Math.max(1, enemy.attack - Math.floor(player.stats.defense / 2));
      player.currentHealth = Math.max(0, player.currentHealth - enemyDamage);
      
      message += `👾 ${enemy.name} атакует вас и наносит ${enemyDamage} урона!\n\n`;
      
      // Проверяем, проиграли ли мы
      if (player.currentHealth <= 0) {
        return handleBattleDefeat(bot, chatId, player, enemy);
      }
      
      break;
      
    case 'magic':
      // Проверяем, есть ли у игрока магия
      if (player.stats.magic <= 0) {
        message = `У вас нет магических способностей!\n\n`;
        
        // Враг атакует в ответ
        const enemyDmg = Math.max(1, enemy.attack - Math.floor(player.stats.defense / 2));
        player.currentHealth = Math.max(0, player.currentHealth - enemyDmg);
        
        message += `👾 ${enemy.name} атакует вас и наносит ${enemyDmg} урона!\n\n`;
        
        if (player.currentHealth <= 0) {
          return handleBattleDefeat(bot, chatId, player, enemy);
        }
      } else {
        // Рассчитываем магический урон
        const magicDamage = Math.max(1, player.stats.magic * 1.5);
        
        // Наносим урон врагу
        enemy.health = Math.max(0, enemy.health - magicDamage);
        
        message = `✨ Вы используете магию против ${enemy.name} и наносите ${magicDamage} урона!\n`;
        
        // Проверяем, победили ли мы
        if (enemy.health <= 0) {
          return handleBattleVictory(bot, chatId, player, enemy);
        }
        
        // Враг атакует в ответ
        const enemyDmg = Math.max(1, enemy.attack - Math.floor(player.stats.defense / 2));
        player.currentHealth = Math.max(0, player.currentHealth - enemyDmg);
        
        message += `👾 ${enemy.name} атакует вас и наносит ${enemyDmg} урона!\n\n`;
        
        if (player.currentHealth <= 0) {
          return handleBattleDefeat(bot, chatId, player, enemy);
        }
      }
      break;
      
    case 'potion':
      // Проверяем, есть ли у игрока зелья
      const healthPotions = player.inventory.items.filter(item => 
        item.type === 'potions' && item.effect === 'health'
      );
      
      if (healthPotions.length === 0) {
        message = `У вас нет зелий здоровья!\n\n`;
        
        // Враг атакует в ответ
        const enemyDmg = Math.max(1, enemy.attack - Math.floor(player.stats.defense / 2));
        player.currentHealth = Math.max(0, player.currentHealth - enemyDmg);
        
        message += `👾 ${enemy.name} атакует вас и наносит ${enemyDmg} урона!\n\n`;
        
        if (player.currentHealth <= 0) {
          return handleBattleDefeat(bot, chatId, player, enemy);
        }
      } else {
        // Используем первое зелье здоровья
        const potion = healthPotions[0];
        const potionIndex = player.inventory.items.indexOf(potion);
        
        // Восстанавливаем здоровье
        const oldHealth = player.currentHealth;
        player.currentHealth = Math.min(player.stats.health, player.currentHealth + potion.value);
        const healAmount = player.currentHealth - oldHealth;
        
        // Удаляем зелье из инвентаря
        player.inventory.items.splice(potionIndex, 1);
        
        message = `🧪 Вы выпиваете ${potion.name} и восстанавливаете ${healAmount} здоровья!\n`;
        
        // Враг атакует в ответ
        const enemyDmg = Math.max(1, enemy.attack - Math.floor(player.stats.defense / 2));
        player.currentHealth = Math.max(0, player.currentHealth - enemyDmg);
        
        message += `👾 ${enemy.name} атакует вас и наносит ${enemyDmg} урона!\n\n`;
        
        if (player.currentHealth <= 0) {
          return handleBattleDefeat(bot, chatId, player, enemy);
        }
      }
      break;
      
    case 'flee':
      // Шанс сбежать зависит от уровня игрока и уровня врага
      const fleeChance = 0.4 + (player.level - enemy.level) * 0.1;
      
      if (Math.random() < fleeChance) {
        delete player.currentBattle;
        savePlayer(player);
        
        return bot.sendMessage(chatId, `🏃 Вам удалось сбежать от ${enemy.name}!`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Вернуться', callback_data: `rpg_location_${player.location}` }]
            ]
          }
        });
      } else {
        message = `🏃 Вы пытаетесь сбежать, но ${enemy.name} вас догоняет!\n`;
        
        // Враг атакует с повышенным уроном
        const enemyDmg = Math.max(1, Math.floor(enemy.attack * 1.5) - Math.floor(player.stats.defense / 2));
        player.currentHealth = Math.max(0, player.currentHealth - enemyDmg);
        
        message += `👾 ${enemy.name} атакует вас сзади и наносит ${enemyDmg} урона!\n\n`;
        
        if (player.currentHealth <= 0) {
          return handleBattleDefeat(bot, chatId, player, enemy);
        }
      }
      break;
  }
  
  // Обновляем состояние битвы
  player.currentBattle = enemy;
  savePlayer(player);
  
  // Показываем текущее состояние битвы
  message += `👾 ${enemy.name}: ❤️ ${enemy.health}/${enemy.maxHealth}\n`;
  message += `👤 Вы: ❤️ ${player.currentHealth}/${player.stats.health}\n\n`;
  
  message += `Что вы будете делать дальше?`;
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '⚔️ Атаковать', callback_data: 'rpg_battle_attack' },
          { text: '✨ Использовать магию', callback_data: 'rpg_battle_magic' }
        ],
        [
          { text: '🧪 Использовать зелье', callback_data: 'rpg_battle_potion' },
          { text: '🏃 Сбежать', callback_data: 'rpg_battle_flee' }
        ]
      ]
    }
  });
}

/**
 * Обрабатывает победу в бою
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {object} player - Данные игрока
 * @param {object} enemy - Данные врага
 */
function handleBattleVictory(bot, chatId, player, enemy) {
  // Рассчитываем награду
  const expReward = enemy.level * 10;
  const goldReward = Math.floor(enemy.level * 5 + Math.random() * enemy.level * 5);
  
  // Начисляем опыт и золото
  player.experience += expReward;
  player.inventory.gold += goldReward;
  
  let message = `🎖️ Вы победили ${enemy.name}!\n\n`;
  message += `Получено:\n`;
  message += `✨ ${expReward} опыта\n`;
  message += `💰 ${goldReward} золота\n\n`;
  
  // Проверяем, достаточно ли опыта для повышения уровня
  if (player.experience >= player.level * 100) {
    player.experience -= player.level * 100;
    player.level += 1;
    
    // Увеличиваем характеристики
    player.stats.health += 10;
    player.stats.attack += 2;
    player.stats.defense += 1;
    player.stats.magic += 1;
    
    // Восстанавливаем здоровье при повышении уровня
    player.currentHealth = player.stats.health;
    
    message += `🌟 Уровень повышен! Теперь у вас ${player.level} уровень!\n`;
    message += `Характеристики улучшены:\n`;
    message += `❤️ Здоровье: +10\n`;
    message += `⚔️ Атака: +2\n`;
    message += `🛡️ Защита: +1\n`;
    message += `✨ Магия: +1\n\n`;
  }
  
  // Шанс найти предмет
  if (Math.random() < 0.3) {
    const itemTypes = ['weapons', 'armor', 'potions'];
    const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    const itemKeys = Object.keys(ITEMS[itemType]);
    const itemKey = itemKeys[Math.floor(Math.random() * Math.min(player.level, itemKeys.length))];
    
    player.inventory.items.push({
      name: itemKey,
      type: itemType,
      ...ITEMS[itemType][itemKey]
    });
    
    message += `💎 Вы нашли предмет: ${itemKey}!\n\n`;
  }
  
  // Удаляем текущего врага
  delete player.currentBattle;
  
  // Сохраняем изменения
  savePlayer(player);
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Продолжить', callback_data: `rpg_location_${player.location}` }]
      ]
    }
  });
}

/**
 * Обрабатывает поражение в бою
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {number} chatId - ID чата пользователя
 * @param {object} player - Данные игрока
 * @param {object} enemy - Данные врага
 */
function handleBattleDefeat(bot, chatId, player, enemy) {
  // Рассчитываем потери
  const goldLoss = Math.floor(player.inventory.gold * 0.2); // Теряем 20% золота
  
  player.inventory.gold -= goldLoss;
  if (player.inventory.gold < 0) player.inventory.gold = 0;
  
  // Возвращаем игрока в деревню и восстанавливаем половину здоровья
  player.location = 'village';
  player.currentHealth = Math.floor(player.stats.health * 0.5);
  
  // Удаляем текущего врага
  delete player.currentBattle;
  
  // Сохраняем изменения
  savePlayer(player);
  
  let message = `☠️ Вы проиграли в бою с ${enemy.name}!\n\n`;
  message += `Вы теряете сознание и просыпаетесь в деревне.\n`;
  message += `Потеряно ${goldLoss} золота.\n\n`;
  message += `Текущее здоровье: ${player.currentHealth}/${player.stats.health}`;
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Продолжить', callback_data: `rpg_location_${player.location}` }]
      ]
    }
  });
}

/**
 * Обработчик callback-запросов для RPG
 * @param {object} bot - Экземпляр Telegram-бота
 * @param {object} query - Объект callback-запроса
 */
function handleRPGCallback(bot, query) {
  const chatId = query.message.chat.id;
  const data = query.data;
  
  if (data === 'rpg_start') {
    startRPG(bot, chatId);
    return true;
  }
  
  // Выбор класса
  if (data.startsWith('rpg_class_')) {
    const className = data.substring('rpg_class_'.length);
    handleClassSelection(bot, chatId, className);
    return true;
  }
  
  // Информация о персонаже
  if (data === 'rpg_char_info') {
    sendCharacterInfo(bot, chatId);
    return true;
  }
  
  // Исследование мира
  if (data === 'rpg_explore') {
    exploreWorld(bot, chatId);
    return true;
  }
  
  // Выбор локации
  if (data.startsWith('rpg_location_')) {
    const locationKey = data.substring('rpg_location_'.length);
    handleLocationSelection(bot, chatId, locationKey);
    return true;
  }
  
  // Действие в локации
  if (data.startsWith('rpg_action_')) {
    const [, locationKey, actionKey] = data.split('_action_')[1].split('_', 2);
    const remainingAction = data.split(`_action_${locationKey}_${actionKey}`)[1];
    const fullActionKey = actionKey + (remainingAction || '');
    handleLocationAction(bot, chatId, locationKey, fullActionKey);
    return true;
  }
  
  // Инвентарь
  if (data === 'rpg_inventory') {
    showInventory(bot, chatId);
    return true;
  }
  
  // Магазин
  if (data === 'rpg_shop') {
    showShop(bot, chatId, getPlayer(chatId));
    return true;
  }
  
  // Категория товаров
  if (data.startsWith('rpg_shop_')) {
    const category = data.substring('rpg_shop_'.length);
    showShopItems(bot, chatId, category);
    return true;
  }
  
  // Покупка предмета
  if (data.startsWith('rpg_buy_')) {
    const [, category, itemKey] = data.split('_buy_')[1].split('_', 2);
    const remainingItemKey = data.split(`_buy_${category}_${itemKey}`)[1];
    const fullItemKey = itemKey + (remainingItemKey || '');
    handleItemPurchase(bot, chatId, category, fullItemKey);
    return true;
  }
  
  // Экипировка предмета
  if (data.startsWith('rpg_equip_')) {
    const [, itemType, itemIndex] = data.split('_equip_')[1].split('_', 2);
    equipItem(bot, chatId, itemType, itemIndex);
    return true;
  }
  
  // Использование зелья
  if (data.startsWith('rpg_use_potion_')) {
    const itemIndex = data.substring('rpg_use_potion_'.length);
    usePotion(bot, chatId, itemIndex);
    return true;
  }
  
  // Действия в бою
  if (data.startsWith('rpg_battle_')) {
    const action = data.substring('rpg_battle_'.length);
    handleBattleAction(bot, chatId, action);
    return true;
  }
  
  // Если это не команда RPG, возвращаем false
  return false;
}

module.exports = {
  startRPG,
  handleRPGCallback,
  playerExists
};
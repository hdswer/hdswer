import { MenuItem } from './types.ts';

export const initialMenuItems: MenuItem[] = [
  // 和風茶
  {
    name: '八曜和茶',
    category: '和風茶',
    priceM: 35,
    priceL: 40,
    available: true,
    description: '經典招牌！不含咖啡因的特製穀麥茶，甘甜順口、麥香撲鼻。'
  },
  {
    name: '究極307',
    category: '和風茶',
    priceM: 40,
    priceL: 45,
    available: true,
    description: '輕微焙火，極品輕焙四季春與炭焙穀物調和，喉韻回甘。'
  },
  {
    name: '十七歲的輕茶',
    category: '和風茶',
    priceM: 35,
    priceL: 40,
    available: true,
    description: '零咖啡因！由精選大麥與玄米溫火炒焙，口感輕透。'
  },

  // 自然茶
  {
    name: '極上307',
    category: '自然茶',
    priceM: 35,
    priceL: 40,
    available: true,
    description: '精選輕發酵四季春青茶，如高山流水般清爽無雜質。'
  },
  {
    name: '深焙307',
    category: '自然茶',
    priceM: 40,
    priceL: 45,
    available: true,
    description: '茶葉重火烘焙，釋放深層焦糖香與飽滿的炭香茶韻。'
  },
  {
    name: '經典綠茶',
    category: '自然茶',
    priceM: 30,
    priceL: 35,
    available: true,
    description: '鮮採茉莉綠茶，茶湯清新芬芳，口感滑順。'
  },
  {
    name: '經典紅茶',
    category: '自然茶',
    priceM: 30,
    priceL: 35,
    available: true,
    description: '大葉種阿薩姆紅茶，香氣濃烈，尾韻綿長。'
  },

  // 鮮乳配製
  {
    name: '牧場鮮奶紅茶',
    category: '鮮乳配製',
    priceM: 50,
    priceL: 60,
    available: true,
    description: '100% 莊園鮮乳完美融合經典紅茶，醇厚順口。'
  },
  {
    name: '牧場鮮奶綠茶',
    category: '鮮乳配製',
    priceM: 50,
    priceL: 60,
    available: true,
    description: '清新茉莉茶香結合香濃牧場鮮奶，宛若漫步綠野。'
  },
  {
    name: '牧場鮮奶烏龍',
    category: '鮮乳配製',
    priceM: 50,
    priceL: 60,
    available: true,
    description: '焙火烏龍結合鮮奶，回甘茶香與乳香層次交疊。'
  },

  // 厚奶茶
  {
    name: '八曜厚奶茶',
    category: '厚奶茶',
    priceM: 45,
    priceL: 55,
    available: true,
    description: '濃厚醇香特調奶粉配招牌無咖啡因穀麥茶，奶香加倍。'
  },
  {
    name: '究極厚奶茶',
    category: '厚奶茶',
    priceM: 45,
    priceL: 55,
    available: true,
    description: '極致特調焙香烏龍奶茶，奶香與果香和協平衡。'
  },
  {
    name: '虎山炙燒奶茶',
    category: '厚奶茶',
    priceM: 50,
    priceL: 60,
    available: true,
    description: '炙烤焦香黑糖與濃滑深焙奶茶，焦甜芬芳。'
  },

  // 極上白奶茶
  {
    name: '85原創白奶茶',
    category: '極上白奶茶',
    priceM: 60,
    priceL: 70,
    available: true,
    description: '日本風極上白乳片，特殊工法細熬慢煮，香甜白淨滋味。'
  },
  {
    name: '84炙燒白奶茶',
    category: '極上白奶茶',
    priceM: 65,
    priceL: 75,
    available: true,
    description: '炙燒烤糖與白奶茶相融，入口溫潤，帶有焦糖堅果香氣。'
  },
  {
    name: '83蜂潮白奶茶',
    category: '極上白奶茶',
    priceM: 65,
    priceL: 75,
    available: true,
    description: '天然龍眼蜜細熬淬取，白奶茶中流溢出香甜蜂潮。'
  },

  // 乳酸樂多
  {
    name: '八曜優多',
    category: '乳酸樂多',
    priceM: 55,
    priceL: 65,
    available: true,
    description: '兩瓶正牌活乳酸菌養樂多融入極上青茶，回甘酸甜。'
  },
  {
    name: '熟成優多',
    category: '乳酸樂多',
    priceM: 50,
    priceL: 60,
    available: true,
    description: '酸甜香濃的養樂多與阿薩姆熟成紅茶共譜清涼協奏曲。'
  },
  {
    name: '蜂潮優多',
    category: '乳酸樂多',
    priceM: 55,
    priceL: 65,
    available: true,
    description: '深山野蜜與樂多冰沙，搭配軟嫩蒟蒻片，多重口感滿足！'
  }
];

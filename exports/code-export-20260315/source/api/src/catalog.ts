import type { Campus, OpenHourSlot, Place, PlaceType } from './types'

const weekDays: Array<0 | 1 | 2 | 3 | 4 | 5 | 6> = [0, 1, 2, 3, 4, 5, 6]

const fullWeek = (start: string, end: string): OpenHourSlot[] =>
  weekDays.map((day) => ({ day, start, end }))

const breakfastWeekday = (): OpenHourSlot[] => [
  ...([1, 2, 3, 4, 5] as const).map((day) => ({ day, start: '06:30', end: '10:30' })),
  { day: 6, start: '07:00', end: '11:30' },
  { day: 0, start: '07:00', end: '11:30' },
]

interface PlaceTemplate {
  name: string
  type: PlaceType
  cuisines: string[]
  priceLevel: 1 | 2 | 3 | 4
  avgPrice: number
  rating: number
  reviewCount: number
  tags: string[]
  signatureDishes: string[]
  vibeLine: string
  mealServiceSpeed: 'fast' | 'normal' | 'slow'
  openHours: OpenHourSlot[]
}

export const campuses: Campus[] = [
  {
    id: 'wuhan-university',
    name: '武汉大学',
    shortName: '武大',
    center: { lng: 114.3658, lat: 30.5389 },
    radiusKm: 3.2,
  },
  {
    id: 'ccnu',
    name: '华中师范大学',
    shortName: '华师',
    center: { lng: 114.3602, lat: 30.5306 },
    radiusKm: 2.8,
  },
  {
    id: 'wut',
    name: '武汉理工大学',
    shortName: '武理',
    center: { lng: 114.3516, lat: 30.5188 },
    radiusKm: 3,
  },
  {
    id: 'cug',
    name: '中国地质大学（武汉）',
    shortName: '地大',
    center: { lng: 114.4129, lat: 30.5221 },
    radiusKm: 3.5,
  },
  {
    id: 'whsu',
    name: '武汉体育学院',
    shortName: '武体',
    center: { lng: 114.3754, lat: 30.5254 },
    radiusKm: 2.6,
  },
]

const templates: PlaceTemplate[] = [
  {
    name: '热气砂锅面',
    type: 'restaurant',
    cuisines: ['面食', '粤式快餐'],
    priceLevel: 1,
    avgPrice: 24,
    rating: 4.4,
    reviewCount: 172,
    tags: ['一人食友好', '出餐快', '汤底鲜', '晚课后方便'],
    signatureDishes: ['番茄牛肉砂锅面', '酸辣肥牛面'],
    vibeLine: '晚自习后十分钟就能吃上热面。',
    mealServiceSpeed: 'fast',
    openHours: fullWeek('10:30', '23:30'),
  },
  {
    name: '操场边生烫粥',
    type: 'stall',
    cuisines: ['粥品', '夜宵'],
    priceLevel: 1,
    avgPrice: 15,
    rating: 4.5,
    reviewCount: 142,
    tags: ['夜宵', '暖胃', '性价比', '打包方便'],
    signatureDishes: ['生滚牛肉粥', '皮蛋瘦肉粥'],
    vibeLine: '熬到凌晨也能来一碗暖胃的。',
    mealServiceSpeed: 'fast',
    openHours: fullWeek('18:00', '02:00'),
  },
  {
    name: '同桌烤肉拌饭',
    type: 'restaurant',
    cuisines: ['韩式', '拌饭'],
    priceLevel: 2,
    avgPrice: 33,
    rating: 4.6,
    reviewCount: 208,
    tags: ['朋友聚餐', '肉量足', '酱香', '可拼桌'],
    signatureDishes: ['芝士鸡腿拌饭', '辣酱五花肉套餐'],
    vibeLine: '两三个人拼着吃最有氛围。',
    mealServiceSpeed: 'normal',
    openHours: fullWeek('11:00', '22:30'),
  },
  {
    name: '桥头麻辣烫',
    type: 'stall',
    cuisines: ['麻辣烫', '川味'],
    priceLevel: 1,
    avgPrice: 22,
    rating: 4.3,
    reviewCount: 266,
    tags: ['辣', '菜品多', '自选', '夜宵'],
    signatureDishes: ['番茄骨汤底', '牛油麻辣底'],
    vibeLine: '想吃辣的时候，这家不会让你失望。',
    mealServiceSpeed: 'fast',
    openHours: fullWeek('11:00', '01:30'),
  },
  {
    name: '木槿轻食碗',
    type: 'restaurant',
    cuisines: ['轻食', '沙拉'],
    priceLevel: 2,
    avgPrice: 36,
    rating: 4.5,
    reviewCount: 128,
    tags: ['低负担', '健身友好', '出餐快', '午餐'],
    signatureDishes: ['牛油果鸡胸能量碗', '黑椒牛肉藜麦碗'],
    vibeLine: '下午有课也不会吃得太困。',
    mealServiceSpeed: 'fast',
    openHours: fullWeek('10:00', '21:00'),
  },
  {
    name: '晚风糖水铺',
    type: 'stall',
    cuisines: ['甜品', '糖水'],
    priceLevel: 1,
    avgPrice: 18,
    rating: 4.4,
    reviewCount: 196,
    tags: ['甜口', '解压', '夜宵', '打包方便'],
    signatureDishes: ['杨枝甘露', '椰奶红豆双皮奶'],
    vibeLine: '心情低落的时候来一碗甜的。',
    mealServiceSpeed: 'fast',
    openHours: fullWeek('15:00', '00:30'),
  },
  {
    name: '炭火小馆',
    type: 'restaurant',
    cuisines: ['烧烤', '湘菜'],
    priceLevel: 3,
    avgPrice: 52,
    rating: 4.6,
    reviewCount: 318,
    tags: ['聚餐', '下饭', '重口味', '晚餐'],
    signatureDishes: ['孜然羊肉串', '剁椒鱼片'],
    vibeLine: '社团团建和生日局常选这家。',
    mealServiceSpeed: 'normal',
    openHours: fullWeek('17:00', '01:00'),
  },
  {
    name: '北门煎饼车',
    type: 'stall',
    cuisines: ['煎饼', '早餐'],
    priceLevel: 1,
    avgPrice: 10,
    rating: 4.2,
    reviewCount: 382,
    tags: ['早餐', '极快出餐', '便宜', '路过就买'],
    signatureDishes: ['里脊煎饼', '双蛋芝士煎饼'],
    vibeLine: '八点前排一会就能拿走。',
    mealServiceSpeed: 'fast',
    openHours: breakfastWeekday(),
  },
  {
    name: '徽味小馆',
    type: 'restaurant',
    cuisines: ['安徽菜', '徽菜'],
    priceLevel: 2,
    avgPrice: 36,
    rating: 4.4,
    reviewCount: 165,
    tags: ['安徽菜', '徽菜', '咸鲜口', '朋友聚餐'],
    signatureDishes: ['黄山臭鳜鱼', '笋干烧肉'],
    vibeLine: '想吃安徽菜时，这家命中率很高。',
    mealServiceSpeed: 'normal',
    openHours: fullWeek('10:30', '22:00'),
  },
  {
    name: '海盐小馆',
    type: 'restaurant',
    cuisines: ['西式', '简餐'],
    priceLevel: 3,
    avgPrice: 58,
    rating: 4.7,
    reviewCount: 132,
    tags: ['约会', '环境好', '拍照友好', '慢慢吃'],
    signatureDishes: ['海盐奶油意面', '香煎鸡排拼盘'],
    vibeLine: '想慢慢吃一顿的时候选它。',
    mealServiceSpeed: 'slow',
    openHours: fullWeek('11:30', '22:30'),
  },
  {
    name: '椒香冒菜实验室',
    type: 'restaurant',
    cuisines: ['川味', '冒菜'],
    priceLevel: 2,
    avgPrice: 34,
    rating: 4.5,
    reviewCount: 219,
    tags: ['辣', '可自定义', '分量足', '晚餐'],
    signatureDishes: ['藤椒牛肉冒菜', '番茄土豆冒菜'],
    vibeLine: '重口味爱好者的固定补给站。',
    mealServiceSpeed: 'normal',
    openHours: fullWeek('11:00', '23:00'),
  },
  {
    name: '晚课后寿司吧',
    type: 'restaurant',
    cuisines: ['日料', '寿司'],
    priceLevel: 2,
    avgPrice: 42,
    rating: 4.3,
    reviewCount: 96,
    tags: ['清爽', '晚餐', '两人同行', '口味轻'],
    signatureDishes: ['火炙三文鱼卷', '照烧鸡肉饭'],
    vibeLine: '想换口味时常被同学想起。',
    mealServiceSpeed: 'normal',
    openHours: fullWeek('11:30', '21:30'),
  },
]

const lngOffsets = [
  0.0043, -0.0039, 0.0061, -0.0066, 0.0027, -0.0022, 0.0071, -0.0058, 0.0018,
  -0.0011, 0.0054, -0.0047,
]

const latOffsets = [
  0.0051, -0.0046, -0.0022, 0.0065, -0.0062, 0.0039, 0.0019, -0.0031, 0.0074,
  -0.0053, 0.0025, -0.0017,
]

const wrapRating = (rating: number): number => {
  const clamped = Math.max(3.9, Math.min(4.9, rating))
  return Math.round(clamped * 10) / 10
}

const trustSummary = (keywords: string[], revisitRate30d: number): string =>
  `多人提到${keywords.slice(0, 2).join('、')}，近30天回头率 ${revisitRate30d}%`

export const places: Place[] = campuses.flatMap((campus, campusIndex) =>
  templates.map((template, templateIndex) => {
    const variation = (campusIndex * 3 + templateIndex) % 7
    const rating = wrapRating(template.rating + (variation - 3) * 0.06)
    const revisitRate30d = 21 + ((campusIndex + 1) * 11 + templateIndex * 5) % 53
    const reviewCount = template.reviewCount + campusIndex * 24 + templateIndex * 3

    return {
      id: `${campus.id}-${templateIndex + 1}`,
      name: `${campus.shortName}${template.name}`,
      campusId: campus.id,
      type: template.type,
      location: {
        lng: Number((campus.center.lng + lngOffsets[templateIndex] * (0.72 + campusIndex * 0.05)).toFixed(6)),
        lat: Number((campus.center.lat + latOffsets[templateIndex] * (0.72 + campusIndex * 0.05)).toFixed(6)),
      },
      cuisines: template.cuisines,
      priceLevel: template.priceLevel,
      avgPrice: template.avgPrice + campusIndex * 2,
      rating,
      reviewCount,
      openHours: template.openHours,
      tags: template.tags,
      signatureDishes: template.signatureDishes,
      address: `${campus.name}周边 ${templateIndex + 1} 号街区`,
      vibeLine: template.vibeLine,
      trustSignals: {
        keywords: template.tags.slice(0, 3),
        revisitRate30d,
        aiSummary: trustSummary(template.tags, revisitRate30d),
      },
      mealServiceSpeed: template.mealServiceSpeed,
    }
  }),
)

export const initialCommunityPosts = [
  {
    id: 'post-1',
    author: '计算机学院 李同学',
    title: '晚课后 20 分钟吃饱路线',
    body: '从图书馆出来先冲热气砂锅面，再带一杯糖水回宿舍，步行基本都在 12 分钟内。',
    placeId: 'wuhan-university-1',
    tags: ['晚课后', '效率流', '一人食'],
    createdAt: '2026-03-10T09:20:00.000Z',
  },
  {
    id: 'post-2',
    author: '经管学院 周同学',
    title: '四人聚餐不踩雷组合',
    body: '炭火小馆真的很稳，点招牌串加剁椒鱼片，AA 后人均还能控制住。',
    placeId: 'ccnu-7',
    tags: ['朋友局', '聚餐', '重口味'],
    createdAt: '2026-03-09T12:30:00.000Z',
  },
  {
    id: 'post-3',
    author: '新闻学院 陈同学',
    title: '校门口小摊也太懂学生胃了',
    body: '桥头麻辣烫份量很实在，夜里十一点去也有，想吃辣又预算紧可以冲。',
    placeId: 'wut-4',
    tags: ['夜宵', '小摊贩', '性价比'],
    createdAt: '2026-03-08T15:18:00.000Z',
  },
]

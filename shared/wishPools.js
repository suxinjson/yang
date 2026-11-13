// Pool names describe the beneficiary; targets keep the existing payment contract.
const wishes = [
  ['dinner', '大餐任选请客券', '🥩', (owner, partner) => `今天吃什么由${owner}全权做主，火锅、烤肉、日料随心挑，${partner}买单。`],
  ['drink', '奶茶快乐水券', '🧋', (owner, partner) => `${owner}挑一杯喜欢的奶茶、咖啡或快乐水，口味和加料自己定，${partner}负责买单送到。`],
  ['massage', '专属按摩 15 分钟', '💆', (owner, partner) => `${partner}给${owner}按摩肩颈 15 分钟，力度按舒服的来，一起放松一下。`],
  ['housework', '今日家务承包券', '🧹', (owner, partner) => `${owner}今天休息，${partner}承包约好的洗碗、收拾房间或倒垃圾。`],
  ['sock', '手洗袜子券', '🧦', (owner, partner) => `${partner}帮${owner}手洗一次袜子，洗净晾好，再送上一句甜甜的夸奖。`],
  ['snack', '爱心夜宵水果券', '🍱', (owner, partner) => `${owner}挑喜欢的夜宵或水果，${partner}负责准备；外卖也可以，吃得开心最重要。`],
  ['movie', '电影任选券', '🎬', (owner, partner) => `今晚电影由${owner}选，${partner}陪看并准备零食；去影院的话，电影票由${partner}买单。`],
  ['date', '约会安排券', '🎡', (owner, partner) => `${owner}选择一次散步、逛街、游乐园或短途约会，${partner}负责安排，花费事先商量好。`],
  ['praise', '甜甜夸夸三分钟', '💖', (owner, partner) => `${partner}认真夸${owner}三分钟，讲讲喜欢的优点和最近让自己心动的小事。`],
  ['breakfast', '早餐投喂券', '🥪', (owner, partner) => `${owner}决定想吃的早餐，${partner}负责买好或做好，让这一天从被照顾开始。`],
  ['game', '游戏陪玩一小时', '🎮', (owner, partner) => `${owner}挑一款双方愿意玩的游戏，${partner}陪玩一小时，输赢都开开心心。`],
  ['wish', '自选小心愿券', '🌟', (owner, partner) => `${owner}提出一个小心愿，${partner}一起商量时间、预算和做法，再认真兑现。`]
]

export function defaultWishPools() {
  const pool = (prefix, owner, partner, target) => wishes.map(([key, title, icon, describe]) => ({ id: `${prefix}_${key}`, title, icon, desc: describe(owner, partner), target }))
  return { girlfriendTasks: pool('gf', '男友', '女友', 'girlfriend_pays'), boyfriendRewards: pool('bf', '女友', '男友', 'boyfriend_pays') }
}

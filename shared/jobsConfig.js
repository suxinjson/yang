export const JOBS_CONFIG = Object.freeze({
  job_barista: {
    id: 'job_barista',
    title: '手作咖啡师',
    desc: '研磨咖啡豆、拉花打奶泡，收获温暖香气。',
    icon: '☕',
    durationSeconds: 3600, // 1 hour
    rewardCoins: 150,
    bonusChance: 25,
    bonusItemId: 'pet.supply.snack_treats'
  },
  job_illustrator: {
    id: 'job_illustrator',
    title: '自由插画师',
    desc: '绘制温馨情侣绘本，描绘浪漫色彩。',
    icon: '🎨',
    durationSeconds: 14400, // 4 hours
    rewardCoins: 700,
    bonusChance: 35,
    bonusItemId: 'pet.supply.canned_food'
  },
  job_programmer: {
    id: 'job_programmer',
    title: '架构师编程',
    desc: '敲击键盘重构元宇宙，实现丝滑体验。',
    icon: '💻',
    durationSeconds: 28800, // 8 hours
    rewardCoins: 1600,
    bonusChance: 50,
    bonusItemId: 'work.token.coffee'
  }
})

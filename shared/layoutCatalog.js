// Standard LayoutCatalog ordered strictly by topological complexity and structural branching (Rank 1 to 12).
export const LAYOUTS = Object.freeze([
  { id: 'scatter', name: '随机铺展', rank: 1, description: '宽阔铺面，无深度遮挡，适合熟悉规则' },
  { id: 'diamond', name: '菱形宝石', rank: 2, description: '中心收束，边缘逐步揭开，单向渐进消解' },
  { id: 'heart', name: '甜蜜爱心', rank: 3, description: '双峰与尖底，经典双区域解谜分割' },
  { id: 'cross', name: '十字交错', rank: 4, description: '四个支路在中心互相遮挡强力互锁' },
  { id: 'ring', name: '环形迷宫', rank: 5, description: '中空环状结构，顺逆时针循环依赖' },
  { id: 'butterfly', name: '蝴蝶双翼', rank: 6, description: '双翼交错对称布局，跨区调配消除牌' },
  { id: 'hourglass', name: '上下沙漏', rank: 7, description: '窄腰连接上下两大区，单瓶颈高压考验' },
  { id: 'pyramid', name: '埃及金字塔', rank: 8, description: '分层递减，底部大跨度遮挡，纵深渐进' },
  { id: 'fortress', name: '古堡迷阵', rank: 9, description: '四座防御塔牌堆与中心锁区，多陷阱拓扑' },
  { id: 'vortex', name: '同心漩涡', rank: 10, description: '螺旋向心层叠，外层严密封锁内层' },
  { id: 'taichi', name: '八卦双极', rank: 11, description: '阴阳双极对立深井陷阱，双轴交替联动' },
  { id: 'skynet', name: '终极天网', rank: 12, description: '蜂窝全局互锁与中央多层深井，极致烧脑' }
])

export function shapeColumns(layout, columns, rows, row) {
  const all = Array.from({ length: columns }, (_, c) => c)
  const y = rows === 1 ? 0 : row / (rows - 1) * 2 - 1
  const chosen = all.filter(c => {
    const x = columns === 1 ? 0 : c / (columns - 1) * 2 - 1
    if (layout === 'diamond') return Math.abs(x) + Math.abs(y) <= 1.25
    if (layout === 'cross') return Math.abs(x) <= .4 || Math.abs(y) <= .4
    if (layout === 'ring') return Math.abs(x) >= .55 || Math.abs(y) >= .55
    if (layout === 'butterfly') return Math.abs(x) <= Math.max(.28, Math.abs(y)) || Math.abs(y) >= .6
    if (layout === 'hourglass') return Math.abs(x) <= .25 + Math.abs(y) * .75
    if (layout === 'pyramid') return Math.abs(x) <= .2 + (y + 1) * .4
    if (layout === 'fortress') return Math.abs(x) >= .55 || Math.abs(y) >= .55 || (Math.abs(x) <= .3 && Math.abs(y) <= .3)
    if (layout === 'vortex') {
      const inOuterBorder = Math.abs(x) >= .65 || Math.abs(y) >= .65
      const inCore = Math.abs(x) <= .3 && Math.abs(y) <= .3
      const inBridge = (Math.abs(y) <= .18 && x >= -.4 && x <= .65) || (Math.abs(x) <= .18 && y >= -.65 && y <= .4)
      return inOuterBorder || inCore || inBridge
    }
    if (layout === 'taichi') {
      const poleA = Math.hypot(x + 0.38, y) <= 0.42
      const poleB = Math.hypot(x - 0.38, y) <= 0.42
      const bridge = Math.abs(x) <= 0.35 && Math.abs(y) <= 0.35
      return poleA || poleB || bridge
    }
    if (layout === 'skynet') {
      const gridLine = Math.abs(x) <= 0.22 || Math.abs(y) <= 0.22
      const outerRing = Math.abs(x) + Math.abs(y) >= 0.95
      const cornerCluster = Math.abs(x) >= 0.6 && Math.abs(y) >= 0.6
      return gridLine || outerRing || cornerCluster
    }
    return true
  })
  return chosen.length ? chosen : [Math.floor(columns / 2)]
}

export interface JobDefinition {
  id: string
  title: string
  desc: string
  icon: string
  durationSeconds: number
  rewardCoins: number
  bonusChance: number
  bonusItemId: string
}

export const JOBS_CONFIG: Readonly<Record<string, JobDefinition>>

export function registerPlatformRoutes(app: any, options: {
  runExclusive: (task: () => Promise<any>) => Promise<any>
  getLedger: () => any
  saveLedger: (value: any) => Promise<any>
}): void

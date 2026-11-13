export const LIFECYCLE_EVENTS: Set<string>
export const LOG_CATEGORIES: Record<string, string>
export function logCategory(event: string): string
export function logMatches(row: any, params: any): boolean

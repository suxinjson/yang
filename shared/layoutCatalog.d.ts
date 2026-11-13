export interface LayoutDefinition {
  readonly id: string
  readonly name: string
  readonly rank: number
  readonly description: string
}

export const LAYOUTS: readonly LayoutDefinition[]
export function shapeColumns(layout: string, columns: number, rows: number, row: number): number[]

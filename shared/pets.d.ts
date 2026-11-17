export type PetType = 'cat' | 'dog' | 'labrador' | 'golden' | 'rabbit' | 'fox'
export const PETS: readonly { id: PetType; name: string; description: string; coat: string; accent: string }[]

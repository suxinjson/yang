import type { BoyfriendPhoto } from '../src/types/game'
export function defaultBoyfriendPhotos(): BoyfriendPhoto[]
export function normalizeBoyfriendSettings(input?: unknown): { bfPhotos: BoyfriendPhoto[]; bfCardEnabled: boolean }

import { CARD_GRID_WIDTH, CARD_GRID_HEIGHT, getBoardLayout } from './boardGeometry.js';
import { defaultGameSettings, normalizeGameSettings, layoutGrid } from './gameConfig.js';
const defaults = defaultGameSettings().levels;
function defaultRule(index) {
    const rule = defaults[index];
    return { minSets: rule.minCards / 3, maxSets: rule.maxCards / 3, types: rule.types, layers: rule.layers };
}
export const LEVEL_RULES = { 1: defaultRule(0), 2: defaultRule(1), 3: defaultRule(2) };
export function checkCardOverlap(posA, posB, cardWidth = CARD_GRID_WIDTH, cardHeight = CARD_GRID_HEIGHT) {
    return Math.abs(posA.x - posB.x) < cardWidth && Math.abs(posA.y - posB.y) < cardHeight;
}
function shuffleArray(arr, random) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function between(min, max, random) {
    return min + random() * (max - min);
}
// Rows have enough spacing to prevent overlap within a layer, even with jitter.
// Inter-layer staggering creates classic 羊了个羊 half-card interlocking mounds.
function createLayer(layer, settings, rules, random) {
    const positions = [];
    const grid = layoutGrid(settings, rules);
    const strength = rules.randomness / 100;
    // Calculate available slack within the bounding box
    const slackX = Math.max(0, grid.spanX - (grid.columns - 1) * 1.06);
    const slackY = Math.max(0, grid.spanY - (grid.rows - 1) * 1.06);
    // Layer staggering phase: creates organic half-step / quarter-step offsets across layers
    const phase = layer % 4;
    const dirX = (phase === 0 || phase === 3) ? -1 : 1;
    const dirY = (phase === 0 || phase === 2) ? -1 : 1;
    const safeSlackX = Math.max(0, slackX / 2 - 0.01);
    const safeSlackY = Math.max(0, slackY / 2 - 0.01);
    // Base staggering offset + organic randomness
    const baseFraction = 0.8;
    const randomShiftX = between(-0.10, 0.10, random) * strength * safeSlackX;
    const randomShiftY = between(-0.10, 0.10, random) * strength * safeSlackY;
    const layerOffsetX = Math.max(-safeSlackX, Math.min(safeSlackX, dirX * safeSlackX * baseFraction + randomShiftX));
    const layerOffsetY = Math.max(-safeSlackY, Math.min(safeSlackY, dirY * safeSlackY * baseFraction + randomShiftY));
    const mirror = random() < 0.5 ? -1 : 1;
    grid.rowCounts.forEach((count, row) => {
        const rowShift = between(-0.015, 0.015, random) * strength;
        for (let col = 0; col < count; col++) {
            const offset = rules.layout === 'heart' && row === 0
                ? (col < count / 2 ? -(grid.columns - 1) / 2 + col : (grid.columns - 1) / 2 - (count - 1 - col)) * 1.06
                : (col - (count - 1) / 2) * 1.06;
            // Micro-jitter per card to avoid rigid alignment while strictly maintaining inter-card spacing
            const microJitterX = between(-0.015, 0.015, random) * strength;
            const microJitterY = between(-0.015, 0.015, random) * strength;
            let x = grid.maxX / 2 + offset * mirror + layerOffsetX + rowShift + microJitterX;
            let y = (grid.maxY - (grid.rows - 1) * 1.06) / 2 + row * 1.06 + layerOffsetY + microJitterY;
            // Strictly stay inside span bounds with an epsilon margin against floating-point precision issues
            const maxDiffX = grid.spanX / 2 - 0.0001;
            const maxDiffY = grid.spanY / 2 - 0.0001;
            const minX = Math.max(0, grid.maxX / 2 - maxDiffX);
            const maxX = Math.min(grid.maxX, grid.maxX / 2 + maxDiffX);
            const minY = Math.max(0, grid.maxY / 2 - maxDiffY);
            const maxY = Math.min(grid.maxY, grid.maxY / 2 + maxDiffY);
            x = Math.max(minX, Math.min(maxX, x));
            y = Math.max(minY, Math.min(maxY, y));
            positions.push({ x, y, layer });
        }
    });
    return positions;
}
// Randomized topological order; ties match the browser's DOM painting order.
export function getRemovalOrder(cards, random = Math.random, cardWidth = CARD_GRID_WIDTH, cardHeight = CARD_GRID_HEIGHT) {
    const blockers = cards.map(() => 0);
    const below = cards.map(() => []);
    for (let a = 0; a < cards.length; a++) {
        for (let b = a + 1; b < cards.length; b++) {
            if (!checkCardOverlap(cards[a], cards[b], cardWidth, cardHeight))
                continue;
            const [lower, upper] = cards[a].layer > cards[b].layer ? [b, a] : [a, b];
            blockers[lower]++;
            below[upper].push(lower);
        }
    }
    const exposed = blockers.flatMap((count, index) => count === 0 ? [index] : []);
    const order = [];
    while (exposed.length > 0) {
        const index = Math.floor(random() * exposed.length);
        const [next] = exposed.splice(index, 1);
        order.push(next);
        for (const lower of below[next]) {
            if (--blockers[lower] === 0)
                exposed.push(lower);
        }
    }
    return order;
}
// Deal along a valid removal order. Guaranteed/hard modes reserve enough room
// to finish an open triple using only the initial slots, without unlocks or props.
function dealTypes(cards, types, level, settings, solvability = 'guaranteed', random = Math.random) {
    const layout = getBoardLayout(settings);
    const order = getRemovalOrder(cards, random, layout.cardWidth / layout.stepX, layout.cardHeight / layout.stepY);
    const totalSets = cards.length / 3;
    const pool = [];
    let bag = [];
    for (let set = 0; set < totalSets; set++) {
        if (bag.length === 0)
            bag = shuffleArray([...types], random);
        const type = bag.pop();
        pool.push(type, type, type);
    }
    if (solvability === 'normal' || solvability === 'impossible') {
        if (solvability === 'impossible' && types.length > 1) {
            // Break divisibility while keeping the total number of cards unchanged.
            const replacement = types.find(type => type !== pool[0]);
            pool[0] = replacement;
        }
        shuffleArray(pool, random);
        order.forEach((index, step) => { cards[index].type = pool[step]; });
        // A random (or deliberately impossible) deal has no certified solution.
        return [];
    }
    const slots = settings.initialSlots || 7;
    const capacity = solvability === 'hard' ? slots : Math.min(slots, level === 1 ? 4 : 6);
    const remaining = new Map(types.map(type => [type, 0]));
    for (const type of pool)
        remaining.set(type, remaining.get(type) + 1);
    const inTray = new Map(types.map(type => [type, 0]));
    let traySize = 0;
    for (const index of order) {
        const candidates = [];
        for (const type of types) {
            if (!remaining.get(type))
                continue;
            const count = (inTray.get(type) + 1) % 3;
            const size = traySize + (count === 0 ? -2 : 1);
            if (size >= capacity)
                continue;
            // At least one triple must remain finishable before a nonmatching full tray.
            const canFinish = size === 0 || types.some(other => {
                const held = other === type ? count : inTray.get(other);
                return held > 0 && remaining.get(other) - (other === type ? 1 : 0) >= 3 - held && size + 3 - held <= capacity;
            });
            if (!canFinish)
                continue;
            const weight = solvability === 'hard' ? (count === 0 ? 1 : 12) : (count === 0 ? 3 : 4);
            candidates.push({ type, size, count, weight });
        }
        if (!candidates.length)
            throw new Error('No safe card available for the configured slots');
        let pick = random() * candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
        const chosen = candidates.find(candidate => (pick -= candidate.weight) < 0) || candidates[candidates.length - 1];
        cards[index].type = chosen.type;
        remaining.set(chosen.type, remaining.get(chosen.type) - 1);
        inTray.set(chosen.type, chosen.count);
        traySize = chosen.size;
    }
    return order;
}
export function createLevel(level, availableTypes, random = Math.random, input = defaultGameSettings()) {
    const settings = normalizeGameSettings(input);
    const rules = settings.levels[level - 1] || settings.levels[settings.levels.length - 1];
    const types = shuffleArray([...new Set(availableTypes.filter(Boolean))], random).slice(0, rules.types);
    if (types.length === 0)
        throw new Error('至少需要一种有效卡牌才能生成关卡');
    const total = Math.floor(between(rules.minCards / 3, rules.maxCards / 3 + 1, random)) * 3;
    const positions = [];
    const counts = Array.from({ length: rules.layers }, () => Math.floor(total / rules.layers));
    const remainder = total % rules.layers;
    for (let i = 0; i < remainder; i++)
        counts[i]++;
    for (let layer = 0; layer < rules.layers; layer++) {
        const candidates = createLayer(layer, settings, rules, random);
        if (rules.layout !== 'heart' && rules.layers > 2 && layer >= Math.floor(rules.layers / 2)) {
            const grid = layoutGrid(settings, rules);
            candidates.sort((a, b) => {
                const distA = Math.hypot(a.x - grid.maxX / 2, a.y - grid.maxY / 2) + between(-0.3, 0.3, random);
                const distB = Math.hypot(b.x - grid.maxX / 2, b.y - grid.maxY / 2) + between(-0.3, 0.3, random);
                return distA - distB;
            });
        }
        else {
            shuffleArray(candidates, random);
        }
        let selected = candidates.slice(0, counts[layer]);
        if (rules.layout === 'heart' && layer === 0) {
            // Preserve the two lobes, outer edges and tip of the heart.
            const { maxX, maxY } = layoutGrid(settings, rules);
            const outline = candidates.filter(p => p.y < 0.4 || p.y > maxY - 0.4 || p.x < 0.5 || p.x > maxX - 0.5);
            selected = [...outline, ...candidates.filter(p => !outline.includes(p))].slice(0, counts[layer]);
        }
        positions.push(...selected);
    }
    const cards = positions.map((pos, index) => ({
        ...pos,
        id: level * 1000 + index,
        type: '',
        status: 'board',
        isCovered: false
    }));
    const solution = dealTypes(cards, types, level, settings, rules.solvability, random);
    const layout = getBoardLayout(settings);
    updateCardCoverage(cards, layout.cardWidth / layout.stepX, layout.cardHeight / layout.stepY);
    return { cards, solution };
}
export function generateLevel1(types, random = Math.random) {
    return createLevel(1, types, random).cards;
}
export function generateLevel2(types, random = Math.random) {
    return createLevel(2, types, random).cards;
}
export function generateLevel3(types, random = Math.random) {
    return createLevel(3, types, random).cards;
}
export function updateCardCoverage(cards, cardWidth = CARD_GRID_WIDTH, cardHeight = CARD_GRID_HEIGHT) {
    const boardCards = cards.filter(c => c.status === 'board');
    boardCards.forEach((card, index) => {
        card.isCovered = boardCards.some((other, otherIndex) => (other.layer > card.layer || (other.layer === card.layer && otherIndex > index)) &&
            checkCardOverlap(card, other, cardWidth, cardHeight));
    });
}

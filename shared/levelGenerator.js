import { CARD_GRID_WIDTH, CARD_GRID_HEIGHT, getBoardLayout } from './boardGeometry.js';
import { defaultGameSettings, normalizeGameSettings, layoutGrid } from './gameConfig.js';
import { shapeColumns } from './layoutCatalog.js';
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

// Compare only nearby grid cells. Large stacked deals must not scan every
// pair on every click; the same exact rectangle test still decides overlap.
function cellKey(x, y) { return `${x},${y}`; }
function cellsNear(card, width, height) {
    const x = Math.floor(card.x / width), y = Math.floor(card.y / height);
    const keys = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) keys.push(cellKey(x + dx, y + dy));
    return keys;
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
            const shape = shapeColumns(rules.layout, grid.columns, grid.rows, row);
            const offset = rules.layout !== 'heart'
                ? (shape[col] - (grid.columns - 1) / 2) * 1.06
                : rules.layout === 'heart' && row === 0
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
export function getRemovalOrder(cards, random = Math.random, cardWidth = CARD_GRID_WIDTH, cardHeight = CARD_GRID_HEIGHT, challenging = false) {
    const blockers = cards.map(() => 0);
    const below = cards.map(() => []);
    const cells = new Map();
    for (let a = 0; a < cards.length; a++) {
        for (const key of cellsNear(cards[a], cardWidth, cardHeight)) for (const b of cells.get(key) || []) {
            if (!checkCardOverlap(cards[a], cards[b], cardWidth, cardHeight))
                continue;
            const [lower, upper] = cards[a].layer >= cards[b].layer ? [b, a] : [a, b];
            blockers[lower]++;
            below[upper].push(lower);
        }
        const key = cellKey(Math.floor(cards[a].x / cardWidth), Math.floor(cards[a].y / cardHeight));
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(a);
    }
    const exposed = blockers.flatMap((count, index) => count === 0 ? [index] : []);
    const order = [];
    while (exposed.length > 0) {
        let index = Math.floor(random() * exposed.length);
        if (challenging && order.length) {
            const previous = cards[order[order.length - 1]];
            let best = -Infinity;
            exposed.forEach((i, candidate) => { const score = Math.hypot(cards[i].x - previous.x, cards[i].y - previous.y) + below[i].length * .6 + random() * .5; if (score > best) { best = score; index = candidate; } });
        }
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
    const order = getRemovalOrder(cards, random, layout.cardWidth / layout.stepX, layout.cardHeight / layout.stepY, solvability === 'hard');
    const totalSets = Math.floor(cards.length / 3);
    const remainder = cards.length % 3;
    const pool = [];
    let bag = [];
    for (let set = 0; set < totalSets; set++) {
        if (bag.length === 0)
            bag = shuffleArray([...types], random);
        const type = bag.pop();
        pool.push(type, type, type);
    }
    if (solvability === 'normal' || solvability === 'impossible') {
        if (remainder) pool.push(...Array(remainder).fill(types[0]));
        if (solvability === 'impossible' && types.length > 1) {
            // Keep an invalid remainder pattern even when the total is not a
            // multiple of three and a final short group would normally clear.
            const replacement = types.find(type => type !== pool[0]);
            pool[0] = replacement;
            const residues = [...new Set(pool)].map(type => pool.filter(item => item === type).length % 3).filter(Boolean);
            if (remainder && residues.length === 1 && residues[0] === remainder) pool[1] = replacement;
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
    for (const index of order.slice(0, totalSets * 3)) {
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
            // High pressure deliberately fills different incomplete groups to
            // within one slot of failure before allowing a completing triple.
            const weight = solvability === 'hard' ? (count === 0 ? 1 : 12) : (count === 0 ? 3 : 4);
            candidates.push({ type, size, count, weight });
        }
        if (!candidates.length)
            throw new Error('No safe card available for the configured slots');
        const choices = solvability === 'hard' ? candidates.filter(candidate => candidate.size === Math.max(...candidates.map(item => item.size))) : candidates;
        let pick = random() * choices.reduce((sum, candidate) => sum + candidate.weight, 0);
        const chosen = choices.find(candidate => (pick -= candidate.weight) < 0) || choices[choices.length - 1];
        cards[index].type = chosen.type;
        remaining.set(chosen.type, remaining.get(chosen.type) - 1);
        inTray.set(chosen.type, chosen.count);
        traySize = chosen.size;
    }
    for (const index of order.slice(totalSets * 3)) cards[index].type = types[0];
    return remainder ? [] : order;
}
export function createLevel(level, availableTypes, random = Math.random, input = defaultGameSettings()) {
    const settings = normalizeGameSettings(input);
    const rules = settings.levels[level - 1] || settings.levels[settings.levels.length - 1];
    const types = shuffleArray([...new Set(availableTypes.filter(Boolean))], random).slice(0, rules.types);
    if (types.length === 0)
        throw new Error('至少需要一种有效卡牌才能生成关卡');
    // Preserve exact configured integers, including 520, rather than rounding
    // them down to triples or silently truncating to the visible footprint.
    const firstTriple = Math.ceil(rules.minCards / 3), lastTriple = Math.floor(rules.maxCards / 3);
    const total = rules.minCards !== rules.maxCards && firstTriple <= lastTriple
        ? Math.floor(between(firstTriple, lastTriple + 1, random)) * 3
        : Math.floor(between(rules.minCards, rules.maxCards + 1, random));
    const layerCount = Math.max(rules.layers, Math.ceil(total / layoutGrid(settings, rules).capacity));
    const positions = [];
    const counts = Array.from({ length: layerCount }, () => Math.floor(total / layerCount));
    const remainder = total % layerCount;
    for (let i = 0; i < remainder; i++)
        counts[i]++;
    for (let layer = 0; layer < layerCount; layer++) {
        const candidates = createLayer(layer, settings, rules, random);
        if (rules.layout !== 'heart' && layerCount > 2 && layer >= Math.floor(layerCount / 2)) {
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
        id: index,
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
    const cells = new Map();
    boardCards.forEach((card, index) => {
        const key = cellKey(Math.floor(card.x / cardWidth), Math.floor(card.y / cardHeight));
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(index);
    });
    boardCards.forEach((card, index) => {
        card.isCovered = cellsNear(card, cardWidth, cardHeight).some(key => {
            const bucket = cells.get(key) || [];
            for (let n = bucket.length - 1; n >= 0; n--) {
                const otherIndex = bucket[n], other = boardCards[otherIndex];
                if ((other.layer > card.layer || (other.layer === card.layer && otherIndex > index)) && checkCardOverlap(card, other, cardWidth, cardHeight)) return true;
            }
            return false;
        });
    });
}

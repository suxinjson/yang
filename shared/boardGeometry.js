import { CARD_GEOMETRY, defaultGameSettings } from './gameConfig.js';
export function getBoardLayout(settings = defaultGameSettings()) {
    const cardWidth = settings.cardWidth || CARD_GEOMETRY.cardWidth;
    const cardHeight = settings.cardHeight || CARD_GEOMETRY.cardHeight;
    const stepX = cardWidth + 4;
    const stepY = cardHeight + 4;
    return {
        padding: CARD_GEOMETRY.padding,
        cardWidth,
        cardHeight,
        stepX,
        stepY,
        width: settings.boardWidth,
        height: settings.boardHeight
    };
}
export const BOARD_LAYOUT = getBoardLayout();
export const CARD_GRID_WIDTH = BOARD_LAYOUT.cardWidth / BOARD_LAYOUT.stepX;
export const CARD_GRID_HEIGHT = BOARD_LAYOUT.cardHeight / BOARD_LAYOUT.stepY;
export const BOARD_MAX_X = (BOARD_LAYOUT.width - BOARD_LAYOUT.padding * 2 - BOARD_LAYOUT.cardWidth) / BOARD_LAYOUT.stepX;
export const BOARD_MAX_Y = (BOARD_LAYOUT.height - BOARD_LAYOUT.padding * 2 - BOARD_LAYOUT.cardHeight) / BOARD_LAYOUT.stepY;
export function getBoardCardStyle(card, layout = BOARD_LAYOUT) {
    return {
        left: `${(layout.padding + card.x * layout.stepX) / layout.width * 100}%`,
        top: `${(layout.padding + card.y * layout.stepY) / layout.height * 100}%`,
        width: `${layout.cardWidth / layout.width * 100}%`,
        height: `${layout.cardHeight / layout.height * 100}%`,
        zIndex: card.layer + 1
    };
}

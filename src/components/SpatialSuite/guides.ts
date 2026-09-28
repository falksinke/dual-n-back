import type { ShiftRule } from '../../model/spatialSuite/games/shift';
import type { GameId, TrackId } from '../../model/spatialSuite/types';

export interface Guide {
    /** What is on screen. */
    see: string;
    /** When to press Match. */
    match: string;
    /** A worked 2-back example. */
    example: string;
    /** The near-misses that are built in to catch you. */
    watch: string;
    /** What the game trains. */
    why: string;
}

export const NBACK_PRIMER =
    'Every game is an n-back: items appear one at a time, and you compare each new item with the one n steps earlier. ' +
    'At 1-back that is the item just before; at 2-back, the one before that. Press Match when they match under the game’s rule, ' +
    'and do nothing when they don’t. Keep updating: each new item becomes the one you will compare against n items later.';

export const GUIDES: Record<TrackId, Guide> = {
    drift: {
        see: 'A single dot, anywhere on an empty field. It shows for half a second, then the field is blank until the next dot.',
        match: 'The dot lands on the same spot as the dot n back. It doesn’t have to be exact: very close counts.',
        example: 'At 2-back: a dot near the top, then one bottom-right, then one near the top again, in almost the same place. Press Match on the third.',
        watch: 'Dots that land just outside the match zone, and dots that repeat the wrong earlier spot (n−1 or n+1 back). As you improve, the match zone shrinks.',
        why: 'There is no grid, so you can’t name positions like “top left”. You have to hold the location itself.',
    },
    wayfinder: {
        see: 'An arrow of one to three chevrons. It points in one of eight directions, and each chevron is one step that way, so ›› pointing east means two steps east. There is no map: you keep track of where you are in your head.',
        match: 'You are standing exactly where you stood n moves ago. That is, the last n moves cancel each other out.',
        example: 'At 2-back: two steps east, then two steps west. You are back where you were two moves ago, so press Match. One step north and then one step south-east would leave you one step east, so no match.',
        watch: 'Walks that end one step away from where you started, and returns to the spot from n−1 or n+1 moves ago. Wayfinder starts at 2-back because a 1-back match would need a move of zero steps.',
        why: 'Keeping a position up to date as you move, without anything on screen to anchor it.',
    },
    'pattern-shape': {
        see: 'Three to five dots forming a constellation. Each one appears at a different size and in a different place.',
        match: 'The constellation has the same shape as the one n back. It may be bigger, smaller or moved, but not turned or flipped.',
        example: 'At 2-back: a small triangle top-left, then a line of dots, then the same triangle drawn larger in the middle. Press Match on the third.',
        watch: 'Mirror images of the earlier shape, and the same shape with one dot moved. Neither counts. More dots per shape come in as you level up.',
        why: 'Seeing structure rather than position: reasoning practice of the kind used in matrix puzzles.',
    },
    'pattern-relation': {
        see: 'A filled dot and an outlined square, placed somewhere on the field.',
        match: 'The dot sits in the same direction from the square as it did n back (above, above-right, right and so on), wherever the pair is on screen.',
        example: 'At 2-back: dot above-left of the square, then dot below the square, then dot above-left of the square again, at a different spot. Press Match on the third.',
        watch: 'The reverse relation: the square above-left of the dot is not the same as the dot above-left of the square.',
        why: 'Holding a relation between objects instead of where they are. Pattern alternates between shapes and relations block by block.',
    },
    shift: {
        see: 'A dot inside a circle, a marker pointing from the centre to the rim, and a label above the circle naming the rule for this trial.',
        match: 'Under the rule shown now, the dot matches the dot n back. The rule can change from one trial to the next, so read the label every time.',
        example: 'At 2-back with the Angle rule: the dot two back sat towards the upper right, near the rim. The dot now sits towards the upper right, close to the centre. Same direction, so press Match.',
        watch: 'Dots that would match under a different rule from the deck, but not the one shown now. More rule switches come in as you level up.',
        why: 'Updating when the rules keep changing, so no single routine gets automatic. Each session deals a new deck of two or three rules. One rule is never dealt: it is saved for the monthly check.',
    },
    relay: {
        see: 'Five or more discs drifting around. At the start, two of them are filled in: those are the ones to keep track of. Then the discs flash one at a time as they move.',
        match: 'A disc flashes where the flash n back happened. Any disc counts: this is about the flash location, not which disc flashed.',
        example: 'At 2-back: a flash top-right, a flash bottom-left, then a different disc flashes top-right. Press Match on the third. When the block ends, the discs stop and you pick the two you were tracking.',
        watch: 'Flashes just outside the earlier spot, and flashes at the spot from n−1 or n+1 back. More discs come in as you level up.',
        why: 'Updating memory while also tracking moving objects. This is the most experimental game, so the sessions use it least.',
    },
};

export const RULE_GUIDES: Record<ShiftRule, string> = {
    screen: 'The dot is in the same place on screen as the dot n back.',
    object: 'The dot is in the same place relative to the marker. Imagine the whole circle turning with the marker: if the earlier dot sat just clockwise of the marker, this one must too.',
    mirror: 'Flip the dot n back across the dashed line. Match if the new dot is where the flipped dot would land.',
    angle: 'The dot is in the same direction from the centre as the dot n back, at any distance.',
    radius: 'The dot is the same distance from the centre as the dot n back, in any direction.',
};

export const GUIDE_TRACKS: Record<GameId, TrackId[]> = {
    drift: ['drift'],
    pattern: ['pattern-shape', 'pattern-relation'],
    wayfinder: ['wayfinder'],
    shift: ['shift'],
    relay: ['relay'],
};

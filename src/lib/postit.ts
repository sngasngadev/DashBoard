import type { NoteColor } from '../types/dashboard';

export const POSTIT_COLORS: readonly NoteColor[] = ['yellow', 'pink', 'blue', 'green', 'lavender'];

export const POSTIT_DEFAULT_WIDTH = 240;
export const POSTIT_DEFAULT_HEIGHT = 190;
export const POSTIT_MIN_WIDTH = 180;
export const POSTIT_MAX_WIDTH = 600;
export const POSTIT_MIN_HEIGHT = 140;
export const POSTIT_MAX_HEIGHT = 500;

export function clampPostitWidth(value: number) {
  return Math.max(POSTIT_MIN_WIDTH, Math.min(POSTIT_MAX_WIDTH, Math.round(value)));
}

export function clampPostitHeight(value: number) {
  return Math.max(POSTIT_MIN_HEIGHT, Math.min(POSTIT_MAX_HEIGHT, Math.round(value)));
}

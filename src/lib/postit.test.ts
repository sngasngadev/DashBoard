import { describe, expect, it } from 'vitest';
import {
  clampPostitHeight,
  clampPostitWidth,
  POSTIT_MAX_HEIGHT,
  POSTIT_MAX_WIDTH,
  POSTIT_MIN_HEIGHT,
  POSTIT_MIN_WIDTH
} from './postit';

describe('post-it constraints', () => {
  it('clamps width and height to the shared limits', () => {
    expect(clampPostitWidth(POSTIT_MIN_WIDTH - 50)).toBe(POSTIT_MIN_WIDTH);
    expect(clampPostitWidth(POSTIT_MAX_WIDTH + 50)).toBe(POSTIT_MAX_WIDTH);
    expect(clampPostitHeight(POSTIT_MIN_HEIGHT - 50)).toBe(POSTIT_MIN_HEIGHT);
    expect(clampPostitHeight(POSTIT_MAX_HEIGHT + 50)).toBe(POSTIT_MAX_HEIGHT);
  });

  it('rounds persisted fractional sizes consistently', () => {
    expect(clampPostitWidth(240.4)).toBe(240);
    expect(clampPostitHeight(190.6)).toBe(191);
  });
});

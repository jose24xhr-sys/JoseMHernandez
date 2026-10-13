// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { zoomLocalDateTime } from './monobot-booking.js';

describe('MonoBot booking timezone conversion', () => {
  it('sends 3 p.m. Mexico City to Zoom as local wall time', () => {
    expect(zoomLocalDateTime('2026-10-16T21:00:00.000Z')).toBe('2026-10-16T15:00:00');
  });

  it('sends 6 p.m. Mexico City to Zoom as local wall time', () => {
    expect(zoomLocalDateTime('2026-10-17T00:00:00.000Z')).toBe('2026-10-16T18:00:00');
  });
});

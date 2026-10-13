// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { validateContactDetails, zoomLocalDateTime } from './monobot-booking.js';

describe('MonoBot booking timezone conversion', () => {
  it('sends 3 p.m. Mexico City to Zoom as local wall time', () => {
    expect(zoomLocalDateTime('2026-10-16T21:00:00.000Z')).toBe('2026-10-16T15:00:00');
  });

  it('sends 6 p.m. Mexico City to Zoom as local wall time', () => {
    expect(zoomLocalDateTime('2026-10-17T00:00:00.000Z')).toBe('2026-10-16T18:00:00');
  });
});

describe('MonoBot contact requests', () => {
  it('validates and trims a contact request without a booking time', () => {
    expect(validateContactDetails({
      name: '  Ana Cliente  ',
      email: ' ANA@EXAMPLE.COM ',
      phone: ' 555-0100 ',
      submittedAt: Date.now() - 3_000
    })).toMatchObject({
      name: 'Ana Cliente',
      email: 'ana@example.com',
      phone: '555-0100'
    });
  });

  it('rejects an invalid contact email', () => {
    expect(() => validateContactDetails({
      name: 'Ana Cliente',
      email: 'correo-invalido',
      submittedAt: Date.now() - 3_000
    })).toThrow('Ingresa un email válido.');
  });
});

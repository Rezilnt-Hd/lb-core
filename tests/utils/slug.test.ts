import { describe, it, expect } from 'vitest';
import { generateSlug } from '../../src/utils/slug.js';

describe('generateSlug', () => {
  it('creates slug from business name and city', () => {
    expect(generateSlug("Joe's Plumbing", 'Miami')).toBe('joes-plumbing-miami');
  });

  it('removes special characters', () => {
    expect(generateSlug('A+ HVAC & Cooling', 'Las Vegas')).toBe('a-hvac-cooling-las-vegas');
  });

  it('collapses multiple dashes', () => {
    expect(generateSlug('Bob---Electric', 'New  York')).toBe('bob-electric-new-york');
  });

  it('trims leading/trailing dashes', () => {
    expect(generateSlug('  The Roofers  ', '  Austin  ')).toBe('the-roofers-austin');
  });

  it('lowercases everything', () => {
    expect(generateSlug('MEGA Plumbing LLC', 'HOUSTON')).toBe('mega-plumbing-llc-houston');
  });
});

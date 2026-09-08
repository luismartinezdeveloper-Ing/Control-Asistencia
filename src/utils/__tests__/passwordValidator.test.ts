import { describe, it, expect } from 'vitest';
import { validatePasswordPolicy } from '../passwordValidator';

describe('passwordValidator - OWASP Security Policy', () => {
  it('should reject empty or null-like passwords with MUY_DEBIL', () => {
    const res = validatePasswordPolicy('');
    expect(res.isValid).toBe(false);
    expect(res.level).toBe('MUY_DEBIL');
    expect(res.score).toBe(0);
    expect(res.errors.length).toBeGreaterThanOrEqual(5);
  });

  it('should reject short passwords (< 8 characters) even with high complexity', () => {
    const res = validatePasswordPolicy('Ab1!x');
    expect(res.isValid).toBe(false);
    expect(res.rules.find((r) => r.id === 'length')?.passed).toBe(false);
    expect(res.level).toBe('MEDIA');
  });

  it('should require lowercase, uppercase, number and special characters', () => {
    const noUpper = validatePasswordPolicy('password123!');
    expect(noUpper.rules.find((r) => r.id === 'uppercase')?.passed).toBe(false);

    const noLower = validatePasswordPolicy('PASSWORD123!');
    expect(noLower.rules.find((r) => r.id === 'lowercase')?.passed).toBe(false);

    const noNumber = validatePasswordPolicy('Password!Special');
    expect(noNumber.rules.find((r) => r.id === 'number')?.passed).toBe(false);

    const noSpecial = validatePasswordPolicy('Password1234');
    expect(noSpecial.rules.find((r) => r.id === 'special')?.passed).toBe(false);
  });

  it('should classify compliant 8-11 character password as FUERTE', () => {
    const res = validatePasswordPolicy('Secret1!');
    expect(res.isValid).toBe(true);
    expect(res.level).toBe('FUERTE');
    expect(res.errors.length).toBe(0);
  });

  it('should classify high-entropy 12+ character password as OPTIMA', () => {
    const res = validatePasswordPolicy('SuperClaveSegura2026#$');
    expect(res.isValid).toBe(true);
    expect(res.level).toBe('OPTIMA');
    expect(res.score).toBe(100);
    expect(res.errors.length).toBe(0);
  });
});

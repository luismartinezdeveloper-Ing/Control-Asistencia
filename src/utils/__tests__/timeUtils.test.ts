import { describe, it, expect } from 'vitest';
import {
  calculateAttendanceHours,
  timeStringToSeconds,
  parseUnefaTime,
  excelTimeFractionToString,
  formatHoursToHhMm,
  formatVariance,
} from '../timeUtils';

describe('timeUtils - Payroll & Attendance Rules Engine', () => {
  describe('parseUnefaTime & Excel conversions', () => {
    it('should parse 6-digit military time (173000 -> 17:30:00)', () => {
      expect(parseUnefaTime(173000)).toBe('17:30:00');
    });

    it('should parse 5-digit morning time with leading zero (80512 -> 08:05:12)', () => {
      expect(parseUnefaTime(80512)).toBe('08:05:12');
    });

    it('should parse 4-digit and 3-digit times (830 -> 08:30:00, 1730 -> 17:30:00)', () => {
      expect(parseUnefaTime(830)).toBe('08:30:00');
      expect(parseUnefaTime(1730)).toBe('17:30:00');
    });

    it('should accurately convert Excel fraction (0.333333 ~ 08:00:00)', () => {
      const timeStr = excelTimeFractionToString(0.3333333333333333);
      expect(timeStr).toBe('08:00:00');
    });
  });

  describe('timeStringToSeconds', () => {
    it('should return null for empty or invalid values', () => {
      expect(timeStringToSeconds('')).toBeNull();
      expect(timeStringToSeconds('abc')).toBeNull();
    });

    it('should calculate accurate seconds from midnight', () => {
      expect(timeStringToSeconds('00:00:00')).toBe(0);
      expect(timeStringToSeconds('01:30:00')).toBe(5400);
      expect(timeStringToSeconds('08:00:00')).toBe(28800);
      expect(timeStringToSeconds('17:30:00')).toBe(63000);
    });
  });

  describe('calculateAttendanceHours (Official Policy)', () => {
    it('should treat identical or <= 2 min punches as neutral cases (no deficit)', () => {
      const res = calculateAttendanceHours('08:00:00', '08:01:30');
      expect(res.isNeutralCase).toBe(true);
      expect(res.netHours).toBe(0);
      expect(res.varianceHours).toBe(0);
      expect(res.status).toBe('NEUTRAL');
    });

    it('should accurately calculate standard shift (08:00 to 17:30 = 9.5h gross, 8.0h net)', () => {
      const res = calculateAttendanceHours('08:00:00', '17:30:00');
      expect(res.isNeutralCase).toBe(false);
      expect(res.grossHours).toBe(9.5);
      expect(res.lunchDeductionHours).toBe(1.5);
      expect(res.netHours).toBe(8.0);
      expect(res.scheduledHours).toBe(8.0);
      expect(res.varianceHours).toBe(0);
      expect(res.status).toBe('CUMPLIDO');
    });

    it('should compute surplus hours accurately (08:00 to 18:30 = 9.0h net, +1.0h variance)', () => {
      const res = calculateAttendanceHours('08:00:00', '18:30:00');
      expect(res.grossHours).toBe(10.5);
      expect(res.netHours).toBe(9.0);
      expect(res.varianceHours).toBe(1.0);
      expect(res.status).toBe('SUPERAVIT');
    });

    it('should compute deficit when departing early (08:00 to 15:30 = 6.0h net, -2.0h variance)', () => {
      const res = calculateAttendanceHours('08:00:00', '15:30:00');
      expect(res.grossHours).toBe(7.5);
      expect(res.netHours).toBe(6.0);
      expect(res.varianceHours).toBe(-2.0);
      expect(res.status).toBe('DEFICIT');
    });
  });

  describe('formatting utilities', () => {
    it('should format decimal hours to Hh Mm string accurately', () => {
      expect(formatHoursToHhMm(8.5)).toBe('8h 30m');
      expect(formatHoursToHhMm(-2.25)).toBe('-2h 15m');
      expect(formatHoursToHhMm(0)).toBe('0h 00m');
    });

    it('should format variance with explicit sign', () => {
      expect(formatVariance(1.5)).toBe('+1.50 h');
      expect(formatVariance(-1.5)).toBe('-1.50 h');
      expect(formatVariance(0)).toBe('0.00 h');
    });
  });
});

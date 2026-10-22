import {
  DEFAULT_CURRENCY,
  minorAmountSchema,
  parseMajorToMinor,
  splitMinor,
  sumMinor,
} from './money';

describe('money', () => {
  describe('parseMajorToMinor', () => {
    it('parses whole and fractional amounts', () => {
      expect(parseMajorToMinor('1250', 'USD')).toBe(125000);
      expect(parseMajorToMinor('1250.75', 'USD')).toBe(125075);
      expect(parseMajorToMinor('0.05', 'USD')).toBe(5);
    });

    it('accepts the separators people actually type', () => {
      expect(parseMajorToMinor('1 250,75', 'USD')).toBe(125075);
      expect(parseMajorToMinor('1250.5', 'USD')).toBe(125050);
    });

    it('rejects input it cannot represent exactly', () => {
      expect(parseMajorToMinor('1250.755', 'USD')).toBeNull();
      expect(parseMajorToMinor('abc', 'USD')).toBeNull();
      expect(parseMajorToMinor('', 'USD')).toBeNull();
      expect(parseMajorToMinor('-5', 'USD')).toBeNull();
    });
  });

  describe('splitMinor', () => {
    it('splits into major and minor parts', () => {
      expect(splitMinor(125075, 'USD')).toEqual({ major: 1250, minor: 75 });
      expect(splitMinor(5, 'USD')).toEqual({ major: 0, minor: 5 });
    });
  });

  describe('sumMinor', () => {
    it('adds without floating point drift', () => {
      expect(sumMinor([10, 20, 3])).toBe(33);
      expect(sumMinor([])).toBe(0);
    });
  });

  describe('minorAmountSchema', () => {
    it('allows whole non-negative amounts', () => {
      expect(minorAmountSchema.safeParse(0).success).toBe(true);
      expect(minorAmountSchema.safeParse(12345).success).toBe(true);
    });

    it('rejects floats and negatives', () => {
      expect(minorAmountSchema.safeParse(10.5).success).toBe(false);
      expect(minorAmountSchema.safeParse(-1).success).toBe(false);
    });
  });

  it('defaults to USD', () => {
    expect(DEFAULT_CURRENCY).toBe('USD');
  });
});

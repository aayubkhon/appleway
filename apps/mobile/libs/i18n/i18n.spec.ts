import { en } from './locales/en';
import { ru } from './locales/ru';
import { uz } from './locales/uz';

const flatten = (value: object, prefix = ''): string[] =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? flatten(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

describe('translations', () => {
  it('keeps every language on the same set of keys', () => {
    const uzKeys = flatten(uz).sort();

    expect(flatten(ru).sort()).toEqual(uzKeys);
    expect(flatten(en).sort()).toEqual(uzKeys);
  });

  it('has no empty strings', () => {
    const values = (obj: object): string[] =>
      Object.values(obj).flatMap((v) => (typeof v === 'object' && v !== null ? values(v) : [v]));

    for (const language of [uz, ru, en]) {
      expect(values(language).every((value) => value.trim().length > 0)).toBe(true);
    }
  });
});

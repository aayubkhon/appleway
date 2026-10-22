import { parseEnv } from './env';

describe('parseEnv', () => {
  it('accepts a LAN api url', () => {
    expect(parseEnv({ EXPO_PUBLIC_API_URL: 'http://192.168.1.10:3000' })).toEqual({
      apiUrl: 'http://192.168.1.10:3000',
    });
  });

  it('fails with an actionable message when the url is missing', () => {
    expect(() => parseEnv({})).toThrow(/EXPO_PUBLIC_API_URL/);
  });

  it('fails when the url is not a url', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_API_URL: '192.168.1.10' })).toThrow(/EXPO_PUBLIC_API_URL/);
  });
});

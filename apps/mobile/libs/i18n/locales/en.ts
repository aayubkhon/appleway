import type { uz } from './uz';

/** English is planned; keys are kept in step with Uzbek as they are added. */
export const en: typeof uz = {
  common: {
    appName: 'Appleway',
    retry: 'Retry',
    loading: 'Loading...',
  },
  connection: {
    title: 'Server connection',
    checking: 'Checking the server...',
    online: 'Server is up',
    offline: 'Could not reach the server',
    database: 'Database',
    databaseUp: 'connected',
    databaseDown: 'not connected',
    apiUrl: 'Address',
  },
};

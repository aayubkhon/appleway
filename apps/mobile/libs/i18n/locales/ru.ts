import type { uz } from './uz';

/** Russian is planned; keys are kept in step with Uzbek as they are added. */
export const ru: typeof uz = {
  common: {
    appName: 'Appleway',
    retry: 'Повторить',
    loading: 'Загрузка...',
  },
  connection: {
    title: 'Связь с сервером',
    checking: 'Проверка сервера...',
    online: 'Сервер работает',
    offline: 'Не удалось подключиться к серверу',
    database: 'База данных',
    databaseUp: 'подключена',
    databaseDown: 'не подключена',
    apiUrl: 'Адрес',
  },
};

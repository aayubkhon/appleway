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
  auth: {
    signInTitle: 'Вход',
    signInSubtitle: 'Войдите в свой аккаунт',
    signUpTitle: 'Регистрация',
    signUpSubtitle: 'Создайте новый аккаунт',
    identifierLabel: 'Телефон или email',
    identifierPlaceholder: '90 123 45 67 или vy@primer.uz',
    passwordLabel: 'Пароль',
    passwordHint: 'Не менее 8 символов',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    signInAction: 'Войти',
    signUpAction: 'Зарегистрироваться',
    toSignUp: 'Нет аккаунта? Зарегистрируйтесь',
    toSignIn: 'Уже есть аккаунт? Войдите',
    serverStatus: 'Проверить связь с сервером',
    validation: {
      identifierRequired: 'Введите телефон или email',
      identifierInvalid: 'Неверный номер телефона или email',
      passwordRequired: 'Введите пароль',
      passwordTooShort: 'Пароль должен быть не короче 8 символов',
      passwordTooLong: 'Пароль слишком длинный',
    },
    errors: {
      invalidCredentials: 'Неверный логин или пароль',
      accountExists: 'Аккаунт с этим телефоном или email уже существует',
      tooManyAttempts: 'Слишком много попыток. Повторите через минуту',
      network: 'Не удалось подключиться к серверу. Проверьте интернет',
      unknown: 'Что-то пошло не так. Попробуйте ещё раз',
    },
  },
  home: {
    welcome: 'Добро пожаловать',
    signedInAs: 'Аккаунт',
    timezone: 'Часовой пояс',
    profileError: 'Не удалось загрузить профиль',
    signOut: 'Выйти',
  },
};

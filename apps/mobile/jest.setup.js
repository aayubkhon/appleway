// The app reads its api url from the environment at import time; tests get a
// fixed value so they do not depend on a developer's .env.
process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3000';

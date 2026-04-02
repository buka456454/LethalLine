# Подробная инструкция: OAuth (вход через Google, Discord и др.)

Этот документ описывает, **как в целом подключают OAuth** к приложению вроде Lethal Line (Next.js App Router, своя сессия в cookie, Prisma + PostgreSQL). Код в репозитории на момент написания использует **email + пароль** и JWT в cookie `ll_session`; OAuth нужно добавлять отдельно.

---

## 1. Что вы получите в итоге

1. Пользователь нажимает **«Войти через Google»** (или Discord).
2. Браузер открывает **страницу провайдера**, пользователь входит там и даёт согласие.
3. Провайдер перенаправляет обратно на ваш сайт с **одноразовым кодом** (`code`).
4. **Ваш сервер** обменивает `code` на **токены** и данные профиля (email, имя, id аккаунта).
5. Вы **находите или создаёте** пользователя в таблице `User` и **ставите свою сессию** (как после обычного логина — тот же `ll_session`).

Важно: OAuth подтверждает **владение аккаунтом у провайдера**, а не паспорт.

---

## 2. Что нужно изменить в данных (Prisma), если делаете OAuth всерьёз

Сейчас у `User` поле **`passwordHash` обязательное**. Для пользователей «только OAuth» обычно делают одно из двух:

- **`passwordHash` сделать необязательным** (`String?`) — OAuth-пользователи без пароля; вход только через провайдера (плюс опционально «установить пароль» позже).
- Или хранить **случайный длинный пароль**, который никто не знает (хуже по смыслу, но без миграции на nullable).

Чтобы один человек мог связать Google и Discord с одним аккаунтом, добавляют таблицу **`Account`** (или аналог):

- `provider` — например `google`, `discord`
- `providerAccountId` — стабильный id у провайдера
- `userId` — ссылка на `User`

Так вы не дублируете пользователя при входе разными способами. Пакет **Auth.js** с Prisma adapter генерирует такую схему за вас (см. раздел 6).

---

## 3. Общие правила безопасности

| Тема | Что делать |
|------|------------|
| **Redirect URI** | В консоли провайдера указываете **точный** URL callback, например `https://lethalline.ru/api/auth/callback/google` для продакшена. |
| **Секреты** | `CLIENT_SECRET` храните только в **серверных** переменных окружения (`.env`), не в `NEXT_PUBLIC_*`. |
| **State** | При редиректе на провайдера передавайте случайный `state` и проверяйте его на callback — защита от CSRF. |
| **PKCE** | Для публичных клиентов обязателен; многие библиотеки делают сами. |
| **HTTPS в проде** | Callback и сайт — по HTTPS. |

---

## 4. Google — пошагово (самый частый вариант)

### 4.1. Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/).
2. Создайте **проект** (или выберите существующий).
3. Меню **«APIs & Services» → «OAuth consent screen»**:
   - Тип: для теста — **External** (или Internal, если только Workspace).
   - Заполните название приложения, контактный email.
   - Добавьте **Test users**, если приложение в статусе *Testing* — иначе войти смогут не все.
4. **«APIs & Services» → «Credentials» → «Create Credentials» → «OAuth client ID»**:
   - Application type: **Web application**.
   - **Authorized redirect URIs** — URL callback вашего приложения (см. раздел 6 или 7 в зависимости от библиотеки).
    - Пример для продакшена:  
      `https://lethalline.ru/api/auth/callback/google`  
       (точный путь зависит от того, как назовёте route; для Auth.js v5 часто `/api/auth/callback/google`.)
   - Сохраните **Client ID** и **Client Secret**.

### 4.2. Переменные окружения (пример имён)

```env
AUTH_GOOGLE_ID=....apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-...
```

Или как принято в Auth.js:

```env
AUTH_GOOGLE_ID=...
AUTH_SECRET=...   # общий секрет для подписи сессии Auth.js (отдельно от JWT_SECRET проекта)
AUTH_URL=https://lethalline.ru
```

Точные имена смотрите в документации выбранной библиотеки.

### 4.3. Какие scope запрашивать

Минимум для «узнать, кто вошёл»:

- `openid`
- `email`
- `profile`

Их обычно добавляет провайдер Google по умолчанию в стандартном login flow.

---

## 5. Discord — пошагово (удобно для игроков)

1. Откройте [Discord Developer Portal](https://discord.com/developers/applications).
2. **New Application** → имя, создать.
3. Вкладка **OAuth2**:
   - Скопируйте **Client ID** и **Client Secret**.
   - **Redirects** — добавьте callback URL (тот же принцип, что у Google: ваш домен + путь API).
4. **OAuth2 → URL Generator** (для проверки scope):
   - `identify` — базовый профиль (username, id, avatar).
   - `email` — если нужен email (Discord может требовать верификацию email у аккаунта).

Переменные (пример):

```env
AUTH_DISCORD_ID=...
AUTH_DISCORD_SECRET=...
```

У Discord id пользователя — число в виде строки; email не всегда есть — учитывайте при слиянии с `User.email`.

---

## 6. Рекомендуемый путь для Next.js: Auth.js (ранее «next-auth»)

Библиотека закрывает: редиректы, state, обмен `code`, refresh (где возможно), callback routes.

1. Установка (актуальная версия смотрите на [authjs.dev](https://authjs.dev)):
   - пакет `next-auth` (v5) и при необходимости `@auth/prisma-adapter`.
2. Создаёте файл маршрута по документации, например `src/app/api/auth/[...nextauth]/route.ts` (имя может отличаться — сверяйтесь с гайдом для App Router).
3. Подключаете **Prisma adapter** — применяете сгенерированную миграцию для таблиц `Account`, `Session`, `VerificationToken` (набор зависит от версии adapter).
4. В **`callbacks`** после успешного входа можете:
   - либо жить на сессии Auth.js;
   - либо **дополнительно** выставить вашу куку `ll_session` через общий код с `signSession` / `setSessionCookie`, чтобы остальной код приложения не переписывать (нужна аккуратная синхронизация пользователя Prisma ↔ Auth.js User).

Плюсы: меньше низкоуровневого кода, меньше ошибок с security. Минусы: две системы сессий, если не унифицировать.

Официальные материалы:

- [Auth.js — Getting Started](https://authjs.dev/getting-started)
- [Prisma Adapter](https://authjs.dev/getting-started/adapters/prisma)

---

## 7. Минимальный «ручной» путь (без next-auth)

Если не хотите тяжёлую зависимость:

1. **Route GET** `/api/auth/google` — генерируете `state`, сохраняете в cookie (httpOnly), редирект на  
   `https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=openid%20email%20profile&state=...`
2. **Route GET** `/api/auth/google/callback` — читаете `code` и `state`, проверяете `state`, **POST** на `https://oauth2.googleapis.com/token` с `client_id`, `client_secret`, `redirect_uri`, `code`, `grant_type=authorization_code`.
3. С access token — **GET** `https://openidconnect.googleapis.com/v1/userinfo` (или другой endpoint) → email, `sub` (стабильный id).
4. **findUnique** по email или по паре `provider` + `providerAccountId` в таблице `Account` → создать `User` при необходимости → **`setSessionCookie(signSession(...))`** как у обычного логина.
5. Редирект на `/tournaments` или главную.

Минусы: всё поддерживать самим (ошибки, обновление токенов, edge cases).

---

## 8. Как стыкуется с текущей логикой Lethal Line

| Часть проекта | Заметка |
|---------------|---------|
| `readSession()` / `ll_session` | После OAuth вы должны выдать **тот же формат JWT**, что ожидает `sessionPayloadFromUser` (роль, username, email, phone, phoneVerified). |
| Телефон | При первом входе через OAuth телефона может не быть → по вашей логике `phone == null` считается «проверено» для баннера; позже пользователь может добавить номер в настройках. |
| Username | У Google/Discord имя может занято в БД — нужна стратегия: `username` из ника провайдера + суффикс, или форма «выберите ник» после первого входа. |
| Email | Должен быть уникален в `User`; если Discord не отдал email — нужен другой уникальный ключ или запрет входа без email. |

---

## 9. Чеклист перед продакшеном

- [ ] Redirect URIs в консоли провайдера совпадают с реальным доменом и путём.
- [ ] OAuth consent screen у Google переведён из *Testing* в *Production* (если нужен публичный доступ).
- [ ] Секреты только на сервере; `.env` не в git.
- [ ] `AUTH_URL` / `NEXTAUTH_URL` (если используете) = публичный URL сайта.
- [ ] Протестированы: первый вход (создание пользователя), повторный вход, ошибка отмены на стороне провайдера.

---

## 10. Полезные ссылки

- [Google OAuth 2.0 для веб-серверов](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)
- [Auth.js](https://authjs.dev)

Если нужно, чтобы инструкция была **вшита в код** (кнопки «Войти через Google», миграции Prisma, единая сессия), переключитесь в режим агента и опишите желаемого провайдера (Google / Discord / оба).

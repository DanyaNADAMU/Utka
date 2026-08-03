# Walkthrough: Веб-страница ссылки-подписки в браузере

Реализована полноценная, удобная и визуально привлекательная веб-страница (клиентский портал) для пользователей при переходе по ссылке подписки в браузере.

## Изменения

### 1. Добавление клиента ClashMi и обновление логотипов
- Добавлен клиент **ClashMi** (`clashmi://install-config?...`).
- В директорию `public/icons/` скопированы иконки высокой четкости из `/home/danya/Projects/icons/ProxyVPN Client Icons/`:
  - `hiddify.png` (`Hiddify216.png`)
  - `clash.png` (`Clash256.png`)
  - `karing.png` (`Karing48.png`)
  - `clashmi.png` (`ClashMi32.png`)
- Сетка `.apps-grid` переведена на гибридную адаптивную верстку `repeat(auto-fit, minmax(200px, 1fr))`.

### 2. Обновление инструкций для Android и iOS
- **Android**: Указаны прямые кликабельные ссылки на запуск загрузки из [GitHub (Hiddify)](https://github.com/hiddify/hiddify-app/releases/latest), [GitHub (Karing)](https://github.com/KaringX/karing/releases/latest) и [Google Play](https://play.google.com/store/apps/details?id=app.hiddify.com).
- **iOS**: Название вкладки заменено с `iOS (iPhone)` на **iOS**. Добавлены кликабельные ссылки на App Store для [ClashMI](https://apps.apple.com/us/app/clash-mi/id6744321968), [Hiddify](https://apps.apple.com/us/app/hiddify-proxy-vpn/id6596777532) и [Karing](https://apps.apple.com/us/app/karing/id6472431552).

## Верификация
- Выполнен успешный билд проекта (`npm run build`).
- Проведен синтаксический анализ вывода HTML/JS.
- Развертывание на мастер-сервер `moscow-nadamudash` успешно завершено.

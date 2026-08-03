# Walkthrough: Веб-страница ссылки-подписки в браузере

Реализована полноценная, удобная и визуально привлекательная веб-страница (клиентский портал) для пользователей при переходе по ссылке подписки в браузере.

## Изменения

### 1. Добавление клиентов и логотипов
- Добавлены кнопки быстрого подключения для клиентов **ClashMi** и **Clash Android**.
- Скопированы иконки высокой четкости из `/home/danya/Projects/icons/ProxyVPN Client Icons/`:
  - `hiddify.png` (`Hiddify216.png`)
  - `clash.png` (`Clash256.png`)
  - `clash-android.png` (`ClashAndroid256.png`)
  - `karing.png` (`Karing48.png`)
  - `clashmi.png` (`ClashMi32.png`)
- Сетка `.apps-grid` адаптивно подстраивается под количество клиентов (`repeat(auto-fit, minmax(180px, 1fr))`).

### 2. Обновление инструкций для Android и iOS
- **Android**: Добавлены ссылки на GitHub для [Hiddify](https://github.com/hiddify/hiddify-app/releases/latest), [Clash Android](https://github.com/MetaCubeX/ClashMetaForAndroid/releases/latest), [Karing](https://github.com/KaringX/karing/releases/latest) и [ClashMi](https://github.com/KaringX/clashmi/releases/latest), а также ссылка на [Google Play](https://play.google.com/store/apps/details?id=app.hiddify.com).
- **iOS**: Вкладка переименована в **iOS**. Добавлены кликабельные ссылки на App Store для [ClashMI](https://apps.apple.com/us/app/clash-mi/id6744321968), [Hiddify](https://apps.apple.com/us/app/hiddify-proxy-vpn/id6596777532) и [Karing](https://apps.apple.com/us/app/karing/id6472431552).

## Верификация
- Выполнен успешный билд проекта (`npm run build`).
- Развертывание на мастер-сервер `moscow-nadamudash` успешно завершено.

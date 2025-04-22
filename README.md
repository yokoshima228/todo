# Todo Application

Fullstack Todo приложение, созданное с использованием Vue.js, Pinia, Node.js, Express.js, MongoDB. Контейнеризовано с помощью Docker и включает мониторинг через Prometheus/Grafana, логирование с Winston и документацию API через Swagger UI.

## ✨ Особенности

*   Создание, чтение, обновление и удаление (CRUD) задач.
*   Управление состоянием с помощью Pinia.
*   Автоматически генерируемая документация API через Swagger UI.
*   Мониторинг приложения с Prometheus и Grafana.
*   Логирование с использованием Winston.

## 🛠 Технологический стек

**Фронтенд:**
*   Vue.js
*   Pinia

**Бэкенд:**
*   Node.js
*   Express.js
*   MongoDB

**Документация API:**
*   Swagger UI

**Мониторинг и Логирование:**
*   Prometheus
*   Grafana
*   Winston

**Контейнеризация:**
*   Docker
*   Docker Compose

## 📋 Предварительные требования

*   Node.js 22
*   npm или yarn
*   Docker
*   Docker Compose

## 🚀 Установка

1.  **Клонируйте репозиторий:**
    ```bash
    git clone https://github.com/yokoshima228/todo.git
    cd todo-frontend
    ```
2.  **Установите зависимости фронтенда:**
    ```bash
    cd frontend
    npm install
    # или
    # yarn install
    ```
3.  **Установите зависимости бэкенда:**
    ```bash
    cd ../backend
    npm install
    # или
    # yarn install
    ```
4.  **Настройте переменные окружения:**
    *   Создайте файл `.env` в директории `backend`. Вы можете скопировать `backend/.env.example`, если он существует.
    *   Заполните необходимые переменные (строка подключения к MongoDB, порты, секретные ключи и т.д.).

## ▶️ Запуск

1.  **С помощью Docker Compose (Рекомендуется):**
    *   Убедитесь, что Docker Desktop запущен.
    *   Из корневой директории проекта выполните:
        ```bash
        docker-compose up -d
        ```
    *   Фронтенд будет доступен по адресу `http://localhost:5173`
    *   Бэкенд API будет доступен по адресу `http://localhost:5000`

2.  **Локальный запуск фронтенда (для разработки):**
    ```bash
    cd frontend
    npm run dev # или другая команда для запуска
    # или
    # yarn dev
    ```

3.  **Локальный запуск бэкенда (для разработки):**
    ```bash
    cd backend
    node server.js

## 📖 Документация API

Документация API доступна через Swagger UI. После запуска бэкенда (локально или через Docker), перейдите по адресу:
`http://localhost:5000/api-docs`

## 📊 Мониторинг

Метрики приложения собираются Prometheus и визуализируются в Grafana.

*   **Prometheus:** `http://localhost:9090`
*   **Grafana:** `http://localhost:3001`
    *   Войдите, используя учетные данные по умолчанию (например, `admin`/`admin`) или проверьте конфигурацию Docker Compose/Grafana.

## 🤝 Участие в разработке (Contributing)
## 📄 Лицензия
MIT
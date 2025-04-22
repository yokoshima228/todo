# Настройка мониторинга для Todo API

В этом документе приведены инструкции по установке и настройке Prometheus и Grafana для мониторинга Todo API.

## Установка Prometheus

### Windows

1. Скачайте [Prometheus](https://prometheus.io/download/) для Windows (например, `prometheus-2.49.1.windows-amd64.zip`)
2. Распакуйте архив в директорию (например, `C:\Prometheus`)
3. Скопируйте конфигурационный файл `monitoring/prometheus/prometheus.yml` в директорию `C:\Prometheus` (заменяя существующий)
4. Запустите Prometheus:
   ```
   cd C:\Prometheus
   prometheus.exe --config.file=prometheus.yml
   ```
5. Проверьте, что Prometheus запущен, открыв http://localhost:9090 в браузере

### Linux/macOS

1. Скачайте и распакуйте Prometheus:
   ```bash
   wget https://github.com/prometheus/prometheus/releases/download/v2.49.1/prometheus-2.49.1.linux-amd64.tar.gz
   tar xvfz prometheus-2.49.1.linux-amd64.tar.gz
   cd prometheus-2.49.1.linux-amd64
   ```
2. Скопируйте конфигурационный файл:
   ```bash
   cp ../monitoring/prometheus/prometheus.yml .
   ```
3. Запустите Prometheus:
   ```bash
   ./prometheus --config.file=prometheus.yml
   ```

## Установка Grafana

### Windows

1. Скачайте [Grafana](https://grafana.com/grafana/download) для Windows
2. Установите Grafana, следуя инструкциям установщика
3. Запустите Grafana через ярлык в меню Пуск или через службы Windows

### Linux

```bash
sudo apt-get install -y apt-transport-https software-properties-common
sudo wget -q -O /usr/share/keyrings/grafana.key https://apt.grafana.com/gpg.key
echo "deb [signed-by=/usr/share/keyrings/grafana.key] https://apt.grafana.com stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list
sudo apt-get update
sudo apt-get install grafana
sudo systemctl start grafana-server
```

### macOS

```bash
brew update
brew install grafana
brew services start grafana
```

## Настройка Grafana

1. Откройте Grafana в браузере: http://localhost:3000
2. Войдите с учетными данными по умолчанию (логин: `admin`, пароль: `admin`)
3. Добавьте источник данных Prometheus:
   - Перейдите в `Configuration` -> `Data sources` -> `Add data source`
   - Выберите Prometheus
   - URL: `http://localhost:9090`
   - Нажмите "Save & Test"

4. Импортируйте готовый дашборд:
   - Перейдите в `+ Create` -> `Import`
   - Нажмите "Upload JSON file" и выберите файл `monitoring/grafana-todo-dashboard.json`
   - Выберите источник данных Prometheus и нажмите "Import"

## Тестирование метрик

Чтобы убедиться, что метрики собираются правильно:

1. Откройте http://localhost:5000/metrics в браузере - вы должны увидеть все метрики API
2. Сделайте несколько запросов к API (создайте задачи, обновите их и т.д.)
3. Обновите страницу Grafana, чтобы увидеть изменения в метриках

## Полезные ссылки

- [Документация Prometheus](https://prometheus.io/docs/introduction/overview/)
- [Документация Grafana](https://grafana.com/docs/)
- [Node.js метрики для Prometheus](https://github.com/siimon/prom-client) 
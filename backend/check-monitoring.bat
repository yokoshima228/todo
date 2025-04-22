@echo off
echo ===== Проверка мониторинга Todo API =====

echo.
echo Проверка доступности API метрик:
curl -s http://localhost:5000/metrics > nul
if %errorlevel% equ 0 (
  echo [OK] API метрики доступны на http://localhost:5000/metrics
) else (
  echo [ОШИБКА] API метрики не доступны. Убедитесь, что приложение запущено на порту 5000.
)

echo.
echo Проверка доступности Prometheus:
curl -s http://localhost:9090/-/healthy > nul
if %errorlevel% equ 0 (
  echo [OK] Prometheus запущен и доступен на http://localhost:9090
) else (
  echo [ОШИБКА] Prometheus не доступен. Prometheus нужно запустить вручную:
  echo 1. Убедитесь, что Prometheus скачан и распакован, например в C:\Prometheus
  echo 2. Скопируйте файл prometheus.yml из вашего проекта в директорию Prometheus
  echo 3. Запустите prometheus.exe из командной строки или через ярлык
)

echo.
echo Проверка доступности Grafana:
curl -s http://localhost:3000 > nul
if %errorlevel% equ 0 (
  echo [OK] Grafana запущена и доступна на http://localhost:3000
) else (
  echo [ОШИБКА] Grafana не доступна. Проверьте:
  echo 1. Установлена ли Grafana (C:\Program Files\GrafanaLabs\grafana)
  echo 2. Запущена ли служба Grafana (в списке служб Windows)
  echo 3. Попробуйте запустить Grafana вручную из C:\Program Files\GrafanaLabs\grafana\bin
)

echo.
echo Рекомендации:
echo 1. Убедитесь, что все компоненты запущены в правильном порядке:
echo    - Сначала API (node server.js)
echo    - Затем Prometheus (prometheus.exe)
echo    - Затем Grafana (должна быть установлена как служба)
echo 2. После запуска Prometheus проверьте http://localhost:9090/targets
echo    чтобы убедиться, что метрики собираются успешно
echo 3. В Grafana (http://localhost:3000) проверьте источник данных Prometheus
echo    и импортируйте дашборд из файла monitoring\grafana-todo-dashboard.json

pause 
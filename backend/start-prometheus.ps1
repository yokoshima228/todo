# Укажите путь к Prometheus и конфигурационному файлу
$PromPath = "C:\Prometheus" # Измените это на реальный путь к Prometheus
$ConfigPath = "$PSScriptRoot\monitoring\prometheus\prometheus.yml"

# Проверяем, существуют ли пути
if (-not (Test-Path $PromPath)) {
    Write-Error "Путь к Prometheus не существует: $PromPath. Укажите правильный путь в скрипте."
    exit 1
}

# Проверяем существование директории monitoring
if (-not (Test-Path "$PSScriptRoot\monitoring")) {
    # Если директории monitoring нет в корне, значит мы уже в директории проекта
    $ConfigPath = "$PSScriptRoot\prometheus\prometheus.yml"
}

if (-not (Test-Path $ConfigPath)) {
    Write-Error "Конфигурационный файл не найден: $ConfigPath"
    Write-Error "Попробуйте указать правильный путь вручную"
    exit 1
}

# Копируем конфигурационный файл
Write-Host "Копирование конфигурационного файла..."
Copy-Item -Path $ConfigPath -Destination "$PromPath\prometheus.yml" -Force

# Запускаем Prometheus
Write-Host "Запуск Prometheus..."
Start-Process -FilePath "$PromPath\prometheus.exe" -ArgumentList "--config.file=prometheus.yml" -WorkingDirectory $PromPath

Write-Host "Prometheus запущен! Откройте http://localhost:9090 в браузере." 
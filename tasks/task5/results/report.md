# Задание 5: Настройка управления трафиком с Istio

В данном задании реализовано управление трафиком для сервиса `booking-service` компании Hotelio с использованием Service Mesh (Istio). Реализованы паттерны: Canary Release, Fallback (Retry) и Feature Flags.

## 📁 Структура решения

```text
tasks/task5/
├── helm/
│   └── booking-service/       # Helm-чарт с поддержкой версионирования (v1/v2)
│       ├── values-v1.yaml     # Конфигурация основной версии (Feature Flag выключен)
│       └── values-v2.yaml     # Конфигурация новой версии (Feature Flag включен)
├── istio/
│   ├── destination-rule.yaml  # Определение subsets (v1, v2) + Circuit Breaking + Retries
│   ├── virtual-service.yaml   # Маршрутизация: Canary (90/10), Fallback, Feature Flag by Header
│   └── envoy-filter.yaml      # Демонстрация работы EnvoyFilter (добавление заголовка в ответ)
├── results/                   # Артефакты для проверки (скриншоты, конфиги, report.md)
└── report.md                  # Этот файл
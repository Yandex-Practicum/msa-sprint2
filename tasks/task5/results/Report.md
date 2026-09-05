# Task 5 - отчёт о проделанной работе

## Цель
Настроить управление трафиком микросервиса **booking-service** в Minikube с помощью
**Istio Service Mesh**: канареечный Release (90/10), retries, Circuit Breaking,
фича-флаг через заголовок `X-Feature-Enabled: true` и EnvoyFilter.

## Что сделано

### 1. Установлена и настроена mesh система Istio в Minikube
- Установлен `istioctl` (Windows, версия **1.30.4**, путь `C:\Istio\istio-1.30.4\bin\istioctl.exe`).
- Далее Istio установлен в кластер командой `istioctl install --set profile=demo -y` (istiod + ingress/egress gateway).
- Далее применена стандартная настройка для Istio `kubectl label namespace default istio-injection=enabled` c автоинъекцией sidecar.
- В результате выполнения поды booking-service в состоянии - READY **2/2** (приложение + sidecar Envoy).

### 2. Настроен автодеплой двух версии сервиса (v1 / v2)
- `booking-service/main.go`: `/ping` возвращает `pong-v2 (feature enabled) x_feature_route_flag:v2` для версии `v2` при `X-Feature-Enabled: true`, иначе  `pong-v1 x_feature_route_flag:`.
   и версии v2 -->.
  Версия берётся из env `APP_VERSION`. 
- EnvoyFilter добавляет заголовок `x-feature-route`, что демонстрирует эффект от применения фильтра.
- Обе версии разворачиваются **одним Helm-чартом** `helm/booking-service`
  (с помощью цикла по списку `versions:` в `values.yaml` и вставкой значений в шаблон `templates/deployment.yaml`).
- Конфигурация конфига Deployment для `booking-service-v1`: [label `version: v1`, `APP_VERSION=v1`, `ENABLE_FEATURE_X=false`, **3 реплики**].
- Конфигурация конфига Deployment для `booking-service-v2`: [label `version: v2`, `APP_VERSION=v2`, `ENABLE_FEATURE_X=true`, **1 реплика**].
- Service `booking-service` конфигурируется на основе объединения `helm/booking-service/templates/service.yaml`) с values для PROD или STAGING.

### 3. Istio-маршрутизация
Для настройки Istio маршрутизации используются конфиги: `booking-service-virtual-Service.yaml` и `booking-service-destination-rule.yaml`
(канарейка, фича-флаг, retries, Circuit Breaking), а также для случая настройки fallback - отдельный конфиг 
`booking-service-traffic-fallback.yaml`, в котором настроен fallback-маршрут на v2 при недоступности v1.

#### Проверены следующие сценарии Istio маршрутизации:
- **Канареечный Release**: VirtualService, вес v1=90 / v2=10.
- **Фича-флаг**: match по заголовку `x-feature-enabled: "true"` -> 100% на v2.
- **Retries**: in VirtualService (attempts 3, perTryTimeout 2s).
- **Circuit Breaking**: DestinationRule - connectionPool + outlierDetection.
- **Fallback/устойчивость**: отдельный VirtualService `booking-service-traffic-fallback.yaml`
  при погашенном v1 переводит весь трафик на v2 (используется в fallback-тесте);
  кроме того, при отказе пода Envoy исключает endpoint из балансировки.

### 4. Фича-флаг через EnvoyFilter (`booking-service-envoy-filter.yaml`)
Реализован LUA-фильтр, который при `X-Feature-Enabled: true`
добавляет внутренний заголовок `x-feature-route: v2`. Рабочая маршрутизация на v2
подтверждается header-match в VirtualService.

### 5. Созданы скрипты для деплоя
Деплой разделён на PROD и STAGING и выполняется по цепочке:
- **`deploy-istio-prod.bat`** - делает развёртывание для PROD (`helm/booking-service/values-prod.yaml`).
- **`deploy-istio-staging.bat`** - делает развёртывание для STAGING (`helm/booking-service/values-staging.yaml`).
- Оба скрипта вызывают общий *`deploy-istio-common.bat`*, который: 
1) Стартует кластер Minikube 
2) Проверяет и устанавливает Istio
  (`istioctl install --set profile=demo`), включает `istio-injection=enabled`
3) Вызывает скрипт `deploy-helm.bat`, который делает `Docker build` и всю работу с `Helm`. 
4) После настройки Helm, происходит применение Istio-конфигов (DestinationRule + VirtualService + EnvoyFilter).
5) И в завершении - проверка статусов и ресурсов (`kubectl rollout status`).
- **`deploy-helm.bat`** - делает всю внутреннюю работу по деплою сервиса с помощью Docker и Helm. Создан на основе одноимённого скрипта `deploy-common.bat`
  из задачи 4. В данной задаче помимо просто деплоя, деплоит две версии (v1 и v2).

### 6. Скрипты для тестирования
Для тестирования запустите `./run-all-tests.bat` (обёртка над `run-all-tests.sh`).
- Скрипт накатывает тест-клиент `test-client.yaml` в под `curl-client`, ждёт готовности подов и затем последовательно запускает `check-istio.sh`, `check-feature-flag.sh`, `check-canary.sh`.
- Для теста fallback сценария скрипт применяет `booking-service-traffic-fallback.yaml`, останавливает поды с версией v1 командой `kubectl scale deployment/booking-service-v1 --replicas=0`, прогоняет `check-fallback.sh`, после чего
восстанавливает реплики v1 и канареечный `booking-service-virtual-Service.yaml`.

Все запросы выполняются **из mesh** через скрипт `curl-mesh.sh`
(`kubectl exec deploy/curl-client`), чтобы VirtualService / DestinationRule / EnvoyFilter
реально применялись к трафику.

## Результаты проверок

### check-istio.sh
```
istiod-... 1/1 Running      (istio-system)
istio-ingressgateway-... 1/1 Running
istio-egressgateway-...  1/1 Running
istio-injection: enabled
booking-service-v1-... 2/2 Running   (3 реплики)
booking-service-v2-... 2/2 Running   (1 реплика)
```

### check-canary.sh (100 запросов из mesh)
```
x_feature_route_flag:pong-v1 = 93
x_feature_route_flag:pong-v2 = 6
✅ Канареечный Release работает: ~93% трафика идёт на v1, ~6% на v2 (близко к цели 90/10).
```

### check-feature-flag.sh
```
pong-v2 (feature enabled) x_feature_route_flag:v2
✅ Фича-флаг работает: при X-Feature-Enabled: true трафик маршрутизируется на v2.
```

### check-fallback.sh (после переключения маршрута на fallback и scale v1 -> 0)
```
Ответ: pong-v2  x_feature_route_flag:
Fallback OK: ответ получен от v2
✅ Fallback/устойчивость работает: после отказа v1 сервис продолжает отвечать через v2.
```

Дополнительные артефакты установки и проверок сохранены в `results/extra/`
(поды booking, версии сервиса по логам, поды Istio-system, лог установки Istio и т.п.).

## Особенности и принятые решения
Для чёткой фиксации порядка действий **используются скрипты в bat-файлах**. 
# Задание 5. Istio

## Что сделал

Скопировал task4 в task5. В сервис добавил переменную APP_VERSION, теперь /ping отвечает "pong v1" или "pong v2". Без этого в проверке canary не видно, какая версия ответила.

Две версии. Чарт ставлю двумя релизами:

- booking-service-v1 с values-v1.yaml. 2 реплики, фича выключена. Этот же релиз создает общий Service booking-service
- booking-service-v2 с values-v2.yaml. 1 реплика, ENABLE_FEATURE_X=true, свой Service не создает

У подов метки app: booking-service и version: v1/v2, по ним в DestinationRule сделаны subsets.

Gateway. Сначала хотел проверять через kubectl port-forward svc/booking-service, но так запрос идет сразу в под мимо sidecar и маршрутизация Istio не работает. Поэтому добавил gateway.yaml и проверяю через istio-ingressgateway.

virtual-service.yaml:

- feature flag. Если есть заголовок x-booking-version: v2 (его ставит EnvoyFilter) или x-feature-enabled: true, трафик идет на v2. X-Feature-Enabled VirtualService проверяет и сам, для надежности
- canary, 90% на v1 и 10% на v2
- retries, 3 попытки на 5xx и ошибки соединения, плюс таймаут

destination-rule.yaml. Subsets v1 и v2, circuit breaking через connectionPool, outlierDetection: под, который вернул 5xx, выкидывается из балансировки на 30 секунд. Сами retries в Istio настраиваются только в VirtualService, в DestinationRule есть только лимит maxRetries для пула.

envoy-filter.yaml. Lua фильтр на ingressgateway. Если пришел X-Feature-Enabled: true, он добавляет заголовок x-booking-version: v2, и по нему VirtualService отправляет запрос на v2. Фильтр стоит первым в цепочке, чтобы сработать до выбора маршрута.

## Про fallback

Полноценного варианта "v1 упал, весь трафик ушел на v2" через VirtualService сделать не получилось. Retries и outlierDetection работают внутри выбранного subset. Если отвалился один под v1, запрос повторяется на другом поде v1 и пользователь ошибку не видит. Если лежит весь v1, Istio сам не переключит 90% трафика на v2, придется поменять веса в VirtualService на 0/100. Поэтому check-fallback.sh проверяет сценарий из задания: гасит один под v1 и шлет запросы.

## Как запускать

```bash
cd tasks/task5
./deploy.sh
kubectl -n istio-system port-forward svc/istio-ingressgateway 9090:80
./check-istio.sh
./check-canary.sh
./check-fallback.sh
./check-feature-flag.sh
```

deploy.sh ставит Istio (profile demo), включает инъекцию в default, ставит v1 и v2 через helm и применяет все из istio/. Перед этим он удаляет релиз booking-service из задания 4, иначе два релиза будут спорить за один Service.

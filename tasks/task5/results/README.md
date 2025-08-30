1) Написаны 2 сервиса: один с фича-флагом и другой без
2) Установлен istio
3) В кластер kubernetes добавлены 2 deployment'а: v1 и v2(с feature флагом)
4) С помощью destination rule + virtual service настроена маршрутизация и fallback
5) В destination rule настроены retry и circuit breaker
6) Фича флаг был реализован так же через virtual service (не EnvoyFilter)
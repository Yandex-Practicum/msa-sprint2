Сделал два файла конфигурации сервиса booking-service 
Отличие одно v1 имеет ENABLE_FEATURE_X="false"
v2 имеет ENABLE_FEATURE_X="true

Модифицировал check-canary.sh
 добавил 100 запросов http://localhost:9090/feature
 так что бы было видно распределение трафика в ответах (Feature X is enabled!  и 404 page not found  (10/90))
 
Модифицировал check-feature-flag.sh для наглядности
Два запроса один с заголвком другой нет. 
 


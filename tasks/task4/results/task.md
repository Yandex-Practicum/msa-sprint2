# Задание 4. Автоматизация развёртывания и тестирования

## Цель задания: 
Ускорить доставку фич, уменьшить количество ошибок при выкладке и упростить масштабирование в Kubernetes.

После успешного запуска первых двух микросервисов — booking и booking-statistics — и их интеграции в GraphQL-суперграф, компания Hotelio поняла, что ручное развёртывание и тестирование больше не выдерживает темпа изменений. Руководство дало зелёный свет на автоматизацию.

## Что нужно сделать
Реализовать Docker-образ сервиса.
В рабочей директории задания сделан простой Mock-сервис для понимания работы фича-флагов.
Для него сделан драфт Helm-чартов и тестов.
Mock-сервис заменён на вашу реализацию.

### Дополнительно о реализации сервиса: ###
```
Собирается с помощью docker build,
сделаны healtcheck endpoint,
сделан ready endpoint,
поведение сервиса меняется при наличии переменной ENABLE_FEATURE_X=true.
```

### Реализовать Helm-чарт. ###
**Deployment с пробами:** livenessProbe и readinessProbe по /ping.
Service типа ClusterIP (порт 80 -> targetPort 8080).
**Значения из values.yaml:**
- replicaCount;
- image.name, image.tag, image.pullPolicy;
- env[] — переменные окружения;
- resources — requests и limits;
- ENABLE_FEATURE_X — фича-флаг.

Обязательно сделайте два варианта values.yaml: для staging и prod.

### Реализовать CI/CD-пайплайн (.gitlab-ci.yml). ###
**Стадии:**
- build: docker build
- test: docker run, проверка /ping, docker rm.
- deploy: minikube image load и helm upgrade
- tag: создать git-тег с timestamp

```
Если есть unit-тесты, нужно добавить отдельный шаг для их запуска.
Используйте gitlab-ci-local: gitlab-ci-local build test deploy tag.
Реализовать Service Discovery через DNS.
Проверка: http://booking-service/ping работает из другого пода внутри Minikube. Ниже есть инструкция по установке Minikube.
Используйте скрипт check-dns.sh.
```
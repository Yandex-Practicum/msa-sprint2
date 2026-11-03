# Задание 4. Автоматизация развёртывания и тестирования

## Что сделано

### Docker-образ `booking-service`
[booking-service/Dockerfile](../booking-service/Dockerfile) собирает сервис из [main.go](../booking-service/main.go).

- Порт 8080, `GET /ping` отвечает `pong`.
- При `ENABLE_FEATURE_X=true` появляется `GET /feature` с ответом `Feature X is enabled!`.
- Добавлен заголовок ответа `X-App-Version` из переменной `APP_VERSION`. Он нужен в задании 5, чтобы видеть, какая версия ответила.
- Из Dockerfile убрано `COPY check-dns.sh`. Скрипт лежит не в папке сервиса, поэтому сборка из шаблона падала. Да и в образе он не нужен: он запускает `kubectl` с машины разработчика.

Dockerfile двух Java-сервисов задания 2 ([booking-service](../../task2/results/booking-service/Dockerfile), [booking-history-service](../../task2/results/booking-history-service/Dockerfile)) — многоэтапные. На первом этапе `gradle build` компилирует код, генерирует классы из `.proto` и прогоняет модульные тесты. Образ не соберётся, если тесты упали.

### Helm-чарт [helm/booking-service](../helm/booking-service)
- **Deployment:**
  - `livenessProbe` и `readinessProbe` по `/ping`;
  - `resources` (requests и limits);
  - `env[]`;
  - фича-флаг `featureFlags.enableFeatureX`, который превращается в переменную окружения `ENABLE_FEATURE_X`;
  - `image.name`, `image.tag` и `image.pullPolicy` берутся из values. `pullPolicy: Never`, потому что образ загружается в Minikube через `minikube image load`.
- **Service** типа `ClusterIP`, порт 80 → targetPort 8080.
- **Два окружения:**

| | [values-staging.yaml](../helm/booking-service/values-staging.yaml) | [values-prod.yaml](../helm/booking-service/values-prod.yaml) |
| :- | :- | :- |
| replicaCount | 1 | 3 |
| ENABLE_FEATURE_X | true — фича проверяется до выкатки в prod | false — до решения о запуске |
| resources | 50m / 32Mi → 200m / 64Mi | 100m / 64Mi → 500m / 128Mi |

### CI/CD-пайплайн [.gitlab-ci.yml](../.gitlab-ci.yml)

| Стадия | Что делает |
| :- | :- |
| build | `docker build -t booking-service:latest booking-service` |
| test | Запускает контейнер. Ждёт готовности. Проверяет, что `/ping` возвращает ровно `pong` и что при `ENABLE_FEATURE_X=true` работает `/feature`. Удаляет контейнер, в том числе при ошибке (`after_script`) |
| deploy | `minikube image load`, затем `helm upgrade --install` с `values-$DEPLOY_ENV.yaml`. После этого `kubectl rollout restart` и `rollout status`: тег `latest` и `pullPolicy: Never` без перезапуска оставили бы поды на старом образе |
| tag | `git tag -a booking-service-<YYYYMMDD-HHMMSS>` — аннотированный тег, без `push` |

Запуск: `npx gitlab-ci-local build test deploy tag` (или `make ci`). Окружение переключается переменной: `--variable DEPLOY_ENV=prod`.

### Service Discovery
[check-dns.sh](../check-dns.sh): под `busybox` обращается к `http://booking-service/ping` по DNS-имени сервиса внутри кластера и получает `pong`. В скрипте `-it` заменено на `-i`: без терминала (CI, IDE) `-t` не работает.

## Результаты

| Файл | Что внутри |
| :- | :- |
| [pipeline-log.txt](pipeline-log.txt) | Прогон пайплайна: build, test, deploy — PASS. tag — FAIL, см. ниже |
| [check-status.txt](check-status.txt) | Под Running, Service ClusterIP 80/TCP, Helm-релиз deployed, `/ping` через port-forward отвечает `pong` |
| [check-dns.txt](check-dns.txt) | DNS-проверка изнутри кластера: `pong`, ✅ Success |

## Особенности окружения (Windows)

- **rsync.** gitlab-ci-local при старте копирует файлы проекта через `rsync`, которого нет в Git Bash на Windows. Для локального прогона в `PATH` подложена замена `rsync` на основе `tar`. На Linux и WSL, где README курса предполагает запуск, это не нужно.
- **Стадия tag.** В глобальном git-конфиге машины включена подпись тегов (`tag.gpgsign=true`), а GPG-ключа нет. Поэтому `git tag` падает с `No secret key`. Отключать подпись в пайплайне в обход конфига разработчика неправильно. По условию тег можно создать вручную: `git tag -a booking-service-<timestamp> -m "..."` на машине с ключом, либо отключить подпись для этого репозитория.

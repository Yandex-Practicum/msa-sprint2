### Изменения

- Сервис bookings-service реализован на FastAPI. Добавлен endpoint /health
- В helm-chart добавлены values для стейджинга и прода
- Установлен minikube
- Настроен CI/CD

### Шаги по разворачиванию сервиса в Minikube

1. Установить kubectl и Minikube согласно документации
   https://kubernetes.io/ru/docs/tasks/tools/install-minikube/
    Лучше, чтобы версия kubectl и minikube совпадали
2. Установить helm
3. Установить gitlab-ci-local `npm install -g gitlab-ci-local`
4. Запустить minikube с использованием драйвера docker `minikube start --driver=docker`
5. Выполнить make ci-stage для развёртывания сервиса на стейджинге
6. Выполнить make ci-stage для развёртывания сервиса на проде
7. Выполнить тесты

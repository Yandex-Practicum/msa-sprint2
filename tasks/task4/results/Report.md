1. Dockerfile/service:
    - Использована двухступенчатая сборка, сначала собирается бинарник, потом запуск сервиса
    - Переменная ENABLE_FEATURE_X управляет фича-флагом
    - добавлены эндпоинт /ready

2. Heml-chart:
    - Values: настроены два values для прода и стейджинга. В проде 3 реплики и больше ресурсов, в стейджинге 1 реплика, pullPolicy: never, добавлена ENV
    - Service: тип ClusterIP, проброс портов с 80 на 8080
    - Deployment: реплики берутся из values, добавлены livenessProbe и readinessProbe по /ping и /ready, выделяются ресурсы согласно values, добавлены ENV

3. CI/CD:
    - Обновлены стадии build, test, deploy, tag

4. Service Discovery через DNS + успешные проверки скриптов
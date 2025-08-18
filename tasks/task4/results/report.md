values.yaml:
    - добавлены resources,livenessProbe и readinessProbe по пути /ping
    - отдельно заведены  values.staging.yaml и values.prod.yaml для прод и стейдж окружений
deployment.yaml:
    - добавлены шаблоны для env, livenessProbe и readinessProbe

.gitlab-ci.yml:
    - наполнены стейджи

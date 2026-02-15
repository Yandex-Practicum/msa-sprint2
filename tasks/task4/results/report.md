## Внесенные изменения

### booking-service
- EXPOSE port 8080

### .gitlab-ci.yml
- добавлена стадия сборки tag
- во всех стадиях прописаны инструкции

### helm
- добавлены staging и prod версии values
- в values.yaml добавлены resources, env, livenessProbe, readinessProbe
- в deployment.yaml добавлены livenessProbe и readinessProbe
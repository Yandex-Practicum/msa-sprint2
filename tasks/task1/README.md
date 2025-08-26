## 🛠️ Подготовка окружения

1. Установите Docker и Docker Compose  
2. Создайте Docker-сеть (если ещё не создана):
   ```bash
   docker network create hotelio-net
   ```
3. Для удобства просмотра кода может понадобиться:
	a. Установите JDK 17  
	b. Установите Gradle (или используйте встроенную в Idea)
	c. Установить Idea или Visual Studio Code 
---

## 🚀 Сборка приложения (при необходимости)
```bash
./gradlew build
```
---

## 🚀 Запуск приложения

```bash
docker-compose up -d --build
```

Проверьте работоспособность:

```bash
curl http://localhost:8084/api/bookings
```

---

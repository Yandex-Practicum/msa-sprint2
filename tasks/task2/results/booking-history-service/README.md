# Database

## Generate a migration
```bash
ENVIRONMENT=local alembic -c alembic.ini \
revision --autogenerate -m "Comment"
```

## Apply a migration
ENVIRONMENT=local alembic -c alembic.ini \
upgrade head
#!/bin/sh

source .venv/bin/activate

# Run migrations
/app/.venv/bin/python -m alembic upgrade head

# Create root user
/app/.venv/bin/python create_root_user_script.py


# Start the application
exec python ./data/main.py
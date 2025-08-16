#!/bin/sh

source .venv/bin/activate

export PYTHONPATH="/app"

echo "🧪 Migrate..."
/app/.venv/bin/python -m alembic upgrade head

# Start the application
echo "🧪 Starting app..."
exec python ./data/main.py
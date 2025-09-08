import asyncio
import os
from logging.config import fileConfig
from typing import Any

from alembic import context
from dotenv import load_dotenv
from pydantic import PostgresDsn
from sqlalchemy import engine_from_config
from sqlalchemy import pool
# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
from sqlalchemy.engine.base import Connection
from sqlalchemy.ext.asyncio import AsyncEngine

config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
from source.database.models import Base

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


exclude_tables = config.get_main_option("exclude", "").split(",")


def include_object(object: Any, name: str, type_: str, *args, **kwargs) -> bool:
    is_table = type_ == "table"
    is_non_public_schema = is_table and object.schema and object.schema != "public"

    if type_ == "table" and (name in exclude_tables or is_non_public_schema):
        return False
    else:
        return True


def build_postgres_dsn() -> str:
    env_file_path = f".env.{os.getenv('ENVIRONMENT', 'environment is not set')}"
    load_dotenv(dotenv_path=env_file_path)
    dsn = str(
        PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=os.getenv("POSTGRES_USER"),
            password=os.getenv("POSTGRES_PASSWORD"),
            host=os.getenv("POSTGRES_HOST"),
            port=int(os.getenv("POSTGRES_PORT")),
            path=f"{os.getenv('POSTGRES_DB') or ''}",
        )
    )
    return dsn


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = build_postgres_dsn()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
        include_schemas=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode.
    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = build_postgres_dsn()

    connectable = AsyncEngine(
        engine_from_config(
            configuration,
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
            future=True,
            connect_args={"statement_cache_size": 0},
        ),
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())

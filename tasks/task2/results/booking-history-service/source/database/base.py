import re

from sqlalchemy.orm import registry, declared_attr

mapper_registry = registry()


def camel_to_snake(name: str) -> str:
    name = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name).lower()


@mapper_registry.as_declarative_base()
class Base:
    @declared_attr
    def __tablename__(cls) -> str:
        return camel_to_snake(cls.__name__)

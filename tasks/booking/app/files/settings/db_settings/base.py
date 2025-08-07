from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    repr_cols_num = 3
    repr_cols = tuple()

    def __repr__(self):
        """Returns database rows' data in human-readable format"""
        cols = []
        for idx, column in enumerate(self.__table__.columns.keys()):
            if column in self.repr_cols or idx < self.repr_cols_num:
                cols.append(f"{column}={getattr(self, column)}")

        return f"<{self.__class__.__name__} {','.join(cols)}>"

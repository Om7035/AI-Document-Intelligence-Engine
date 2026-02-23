"""
SQLAlchemy base class — NOT USED in current implementation.
Storage is handled by app.db.json_store (JSON-based).
"""
# from sqlalchemy.ext.declarative import as_declarative, declared_attr
#
# @as_declarative()
# class Base:
#     __name__: str
#     @declared_attr
#     def __tablename__(cls) -> str:
#         return cls.__name__.lower()

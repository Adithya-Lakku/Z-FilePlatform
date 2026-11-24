"""Shared dependencies used across all API routers."""

from typing import Annotated
import sqlalchemy.orm as _orm
from fastapi import Depends
from db import services as _services

# Reusable DB session dependency
DbSession = Annotated[_orm.Session, Depends(_services.get_db)]


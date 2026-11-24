"""Pydantic request models for the JSON API."""

from pydantic import BaseModel


class FolderCreateRequest(BaseModel):
    name: str
    parent_folder_id: str | None = None


class RenameRequest(BaseModel):
    new_name: str


class MoveRequest(BaseModel):
    new_parent_folder_id: str | None = None  # None = move to root


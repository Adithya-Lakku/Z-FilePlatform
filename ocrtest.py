from ai import ocr as _ocr
from db import services as _services
from db import schemas as _schemas
from db import database as _database
from typing import Annotated
import sqlalchemy.orm as _orm
from fastapi import FastAPI,UploadFile,HTTPException,Request,Form,Depends,File

db = _database.SessionLocal()
try:
    ocr_text = _ocr.extract_text("05bf7fe7-cfb5-42de-beb0-cd5d5fa9e850", db)
    print("OCR Output:\n", ocr_text)
finally:
    db.close()




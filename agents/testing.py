from db.database import SessionLocal
from db import services as _services

def list_files(folder_id:str|None):

    with SessionLocal() as db:
        folders, files = _services.get_folder_contents(
            folder_id, db
        )




   
list_files("ef44c2e5-03e2-4208-bb8d-5d32e9c0042f")




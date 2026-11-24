from langchain.agents import create_agent
from langchain.tools import ToolRuntime,tool
from db.database import SessionLocal
from db import services as _services



@tool('list_files',description="Lists files from given folder ID",return_direct = False)
def list_files(folder_id:str):

    with SessionLocal() as db:
        folders, files = _services.get_folder_contents(
            folder_id, db
        )

    return {
        "folders": [{

        

            "name" : f.name

        }
        for f in folders
        ],
        "files": [{

        

            "name" : f.filename

        }
        for f in files
        ]
    }

    

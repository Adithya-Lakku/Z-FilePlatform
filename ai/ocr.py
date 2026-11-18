
import subprocess
from db import services as _services

#image_path = r"/mnt/zac/Study/VS_CODE_STUFF/Learningfolders/tesseract_learn/Img2text/image2text/Screenshot_20261013_143052.png"
#temp = r"/mnt/zac/Study/VS_CODE_STUFF/Learningfolders/tesseract_learn/Img2text/image2text/temp"


def extract_text(file_id:str,db)->str:
    filepath = _services.get_file_path(file_id,db)
        
    result = subprocess.run(
        ["tesseract", str(filepath),"stdout"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=30
        
    )

    extracted_text = result.stdout
    # Decode bytes to string properly
    if isinstance(extracted_text, bytes):
        extracted_text = extracted_text.decode("utf-8", errors="ignore")

    # Now update metadata safely
    _services.updateMetadata(file_id, {"ocr_text": extracted_text}, db)

    return extracted_text if result.returncode == 0 else ""



import io
from PyPDF2 import PdfReader
from docx import Document


def extract_text_from_file(filename: str, content: bytes) -> str:
    """
    Extract text from uploaded file based on its extension.
    Supports: .txt, .pdf, .docx, .csv
    """
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext == "txt" or ext == "csv":
        return content.decode("utf-8", errors="ignore")

    elif ext == "pdf":
        return _extract_pdf(content)

    elif ext == "docx":
        return _extract_docx(content)

    else:
        return ""


def _extract_pdf(content: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(content))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception:
        return ""


def _extract_docx(content: bytes) -> str:
    try:
        doc = Document(io.BytesIO(content))
        text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        return text.strip()
    except Exception:
        return ""
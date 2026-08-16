import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel
from pypdf import PdfReader
import io
import docx

load_dotenv()
client=Groq(
 api_key=os.getenv("GROQ_API_KEY")
)

model="llama-3.3-70b-versatile"

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Experience(BaseModel):
 companey:str|None=None
 role:str|None=None
 duration:str|None=None
 description:str|None=None
 skills_used:list[str]=[]

class Resume(BaseModel):
 Name: str|None=None
 email: str|None=None
 phone:str|None=None

 Total_experience_years: float| None=None

 skills:list[str]=[]
 experience:list[Experience]=[]
 education:list[str]=[]
 projects:list[str]=[]
 certificates:list[str]=[]

resume_schema=Resume.model_json_schema()

class ChatRequest(BaseModel):
 question:str

def ask_candidate(question:str,resume:Resume):
 system_prompt=f"""
You are  AI assistent representing a job candidate.
Below is everything You Know about the Candidate.
{resume.model_dump_json(indent=2)}

Rules:

1.Answer only using the information.

2.Never Halusinate.

3.If information is unavilable,
say
"I dont have Enough of Information to answer that."

4.Be professional.

5.Answer as if HR interviewing this Candidate.
"""
 response=client.chat.completions.create(
  model=model,
  messages=[
   {
    "role":"system",
    "content":system_prompt
    },
    {
     "role":"user",
     "content":question
    }
  ]
 )
 return response.choices[0].message.content

def parse_resume(resume_text):
 system_prompt=f"""
You are  an expert Resume Parser

Extract Information from the resume based on its meaning.
not only based on exact section headings

Diffrent resumes may use diffrent headings

For example:
-Experience
-Professional Experience
-work History
-Employment
-Internships

They may all contain relavent experience

skills may also appear in the skills section,work experience,internship 
or Projects.

Return ONLY valid JSON matching schema:

{resume_schema}

Important rules:

1.Do not invent Information.
2.if a value is not available, return null.
3.If a list has no information, return empty list.
4.Include internships inside experiences
5.Extract skills mentioned across entaier resume
6.If a work experience or project listing has a project or organization name instead of a traditional company (e.g. 'AI Medical Chat Bot Final Year Project', 'Smart Shopper Price Comparing Tool', 'YouTube Movie Recommendation Tool'), map that project name to the 'companey' field so descriptions are properly linked.
"""
 User_prompt=f"""
Parse the Follwing resume: to genrate json
{resume_text}"""

 message_system={
  "role":"system",
  "content":system_prompt
 }

 message_user={
  "role":"user",
  "content":User_prompt
 }

 messages=[message_system,message_user]
 response_formate={
  "type":"json_object"
 }

 response=client.chat.completions.create(model=model,messages=messages,response_format=response_formate)
 raw_output=response.choices[0].message.content
 data=json.loads(raw_output)
 resume=Resume(**data)
 return resume


def read_pdf(file_path):
 reader=PdfReader(file_path)
 text=""
 for page in reader.pages:
  page_text=page.extract_text()
  if page_text:
   text+=page_text+"\n"
 return text

def read_pdf_bytes(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text

def read_docx_bytes(file_bytes: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_bytes))
    text = []
    for para in doc.paragraphs:
        text.append(para.text)
    return "\n".join(text)

# Caching and global state
_cached_resume = None

def get_cached_resume() -> Resume:
    global _cached_resume
    if _cached_resume is None:
        pdf_path = Path(__file__).parent / "Thontadaraya C.pdf"
        if not pdf_path.exists():
            raise FileNotFoundError(f"Resume PDF file not found at: {pdf_path}")
        resume_txt = read_pdf(pdf_path)
        _cached_resume = parse_resume(resume_txt)
    return _cached_resume

class MatchRequest(BaseModel):
    job_description: str

def match_candidate(job_description: str, resume: Resume) -> dict:
    system_prompt = f"""
You are an expert ATS (Applicant Tracking System) and hiring recruiter assistant.
Your task is to analyze the candidate's resume and match it against the provided Job Description (JD).

Candidate Resume Details:
{resume.model_dump_json(indent=2)}

Provide a structured comparison and match ranking in JSON format.
The JSON must follow this exact schema:
{{
  "match_score": int (0 to 100 representing percentage match based on skills, experience, and project alignment),
  "matched_skills": [string] (skills matching the JD requirements),
  "missing_skills": [string] (important skills in JD that candidate lacks or are not mentioned in the resume),
  "strengths": [string] (specific alignments, high-value experiences, or achievements),
  "gaps": [string] (areas where candidate does not meet JD or lacks depth),
  "verdict": string (a professional 2-3 sentence hiring recommendation/analysis)
}}

Return ONLY the valid JSON object. Do not include markdown formatting like ```json or any other commentary.
"""
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Compare with this Job Description:\n{job_description}"}
        ],
        response_format={"type": "json_object"}
    )
    raw_output = response.choices[0].message.content
    return json.loads(raw_output)

@app.get("/")
def home():
    try:
        get_cached_resume()
        return {
            "message": "resume_parsed",
            "status": "ready"
        }
    except Exception as e:
        return {
            "message": "failed to parse resume",
            "error": str(e)
        }

@app.get("/profile")
def get_profile():
    try:
        resume = get_cached_resume()
        return resume.model_dump()
    except Exception as e:
        return {
            "error": str(e)
        }

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        resume = get_cached_resume()
        answer = ask_candidate(request.question, resume)
        return {
            "answer": answer
        }
    except Exception as e:
        return {
            "error": str(e)
        }

@app.post("/match")
def match(request: MatchRequest):
    try:
        resume = get_cached_resume()
        result = match_candidate(request.job_description, resume)
        return result
    except Exception as e:
        return {
            "error": str(e)
        }

@app.post("/match-file")
async def match_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        filename = file.filename.lower()
        
        if filename.endswith(".pdf"):
            jd_text = read_pdf_bytes(content)
        elif filename.endswith(".docx") or filename.endswith(".doc"):
            jd_text = read_docx_bytes(content)
        elif filename.endswith(".txt"):
            jd_text = content.decode("utf-8")
        else:
            return {"error": "Unsupported file format. Please upload PDF, DOCX, or TXT."}
            
        if not jd_text.strip():
            return {"error": "The uploaded file is empty or could not be parsed."}
            
        resume = get_cached_resume()
        result = match_candidate(jd_text, resume)
        return result
    except Exception as e:
        return {
            "error": f"Failed to process file upload: {str(e)}"
        }

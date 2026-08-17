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

model="openai/gpt-oss-20b"

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
You are an AI assistant representing the job candidate, Thontadarya C.
Below is the candidate's official resume information:
{resume.model_dump_json(indent=2)}

Strict Guardrails & Rules:
1. CANDIDATE FOCUS ONLY: You must ONLY answer questions directly related to the candidate's projects, experiences, skills, education, and qualifications.
2. REFUSE GENERIC CODING/PROGRAMMING: If the user asks you to write code, solve coding challenges, write scripts (in Python, Java, SQL, etc.), or explain general programming concepts that are not directly about the candidate's projects, you must refuse to answer. Say: "I am an AI assistant representing the candidate, Thontadarya C. I can only discuss the candidate's background, experiences, and specific projects. I cannot write generic code or solve programming tasks."
3. REFUSE GENERAL KNOWLEDGE: If the user asks any general knowledge, math, science, or general questions unrelated to the candidate, refuse to answer using the same message.
4. NO INVENTING INFORMATION: Answer only using the exact candidate details provided above. Never make up details or hallucinate. If the information is not present, say "I don't have enough information to answer that."
5. PROFESSIONAL INTERVIEW TONE: Answer as if an HR recruiter is interviewing the candidate. Be professional, concise, and focused.
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
 
 try:
     data=json.loads(raw_output)
 except Exception as e:
     print(f"JSON parsing error in resume parser: {e}")
     data = {}
     
 try:
     resume=Resume(**data)
 except Exception as e:
     print(f"Validation error in resume parser: {e}. Attempting soft recovery...")
     
     # Attempt soft-recovery of Experiences
     experiences = []
     for exp in data.get("experience", []):
         if not isinstance(exp, dict):
             continue
         try:
             exp_obj = Experience(
                 companey=exp.get("companey") or exp.get("company"),
                 role=exp.get("role"),
                 duration=exp.get("duration"),
                 description=exp.get("description"),
                 skills_used=exp.get("skills_used") if isinstance(exp.get("skills_used"), list) else []
             )
             experiences.append(exp_obj)
         except Exception:
             continue
             
     try:
         resume = Resume(
             Name=data.get("Name") or data.get("name"),
             email=data.get("email"),
             phone=data.get("phone"),
             Total_experience_years=data.get("Total_experience_years"),
             skills=data.get("skills") if isinstance(data.get("skills"), list) else [],
             experience=experiences,
             education=data.get("education") if isinstance(data.get("education"), list) else [],
             projects=data.get("projects") if isinstance(data.get("projects"), list) else [],
             certificates=data.get("certificates") if isinstance(data.get("certificates"), list) else []
         )
     except Exception as inner_e:
         print(f"Failed soft recovery of resume model: {inner_e}")
         # Absolute barebones recovery
         resume = Resume(Name="Candidate Profile")
         
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
_cached_resume_mtime = 0
_cached_pdf_path = None

def get_cached_resume() -> Resume:
    global _cached_resume, _cached_resume_mtime, _cached_pdf_path
    
    # Dynamically find the first PDF file in the backend directory
    backend_dir = Path(__file__).parent
    pdf_files = list(backend_dir.glob("*.pdf"))
    if not pdf_files:
        raise FileNotFoundError(f"No resume PDF file found in: {backend_dir}")
        
    pdf_path = pdf_files[0]
    current_mtime = os.path.getmtime(pdf_path)
    
    # Reload if cached resume is empty, or path changes, or file is modified
    if (_cached_resume is None or 
        _cached_pdf_path != pdf_path or 
        current_mtime != _cached_resume_mtime):
        
        resume_txt = read_pdf(pdf_path)
        _cached_resume = parse_resume(resume_txt)
        _cached_resume_mtime = current_mtime
        _cached_pdf_path = pdf_path
        
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

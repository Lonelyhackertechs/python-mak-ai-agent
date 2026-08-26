import os
from contextvars import ContextVar

import jwt
import requests
from dotenv import load_dotenv

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from langchain_google_genai import (
    ChatGoogleGenerativeAI,
    GoogleGenerativeAIEmbeddings
)

from langchain.tools import tool
from langchain_classic.agents import (
    AgentExecutor,
    create_tool_calling_agent
)

from langchain_core.prompts import ChatPromptTemplate
from langchain_chroma import Chroma


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

JAVA_BASE = os.getenv("JAVA_BASE")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")


if not JAVA_BASE:
    raise RuntimeError("JAVA_BASE is not configured")

if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY is not configured")


# ============================================================
# AUTHENTICATED STUDENT CONTEXT
# ============================================================

# This stores the student number for the current request.
#
# Example:
#
# JWT
#   ↓
# 2600704111
#   ↓
# current_student_number
#   ↓
# tools
#
current_student_number = ContextVar(
    "current_student_number",
    default=None
)


def get_authenticated_student_number() -> str:
    """
    Get the student number belonging to the currently
    authenticated chat request.
    """

    student_number = current_student_number.get()

    if not student_number:
        raise RuntimeError(
            "No authenticated student is associated with this request."
        )

    return student_number


# ============================================================
# JWT
# ============================================================

def extract_student_number_from_token(token: str) -> str:
    """
    Extract the student number from the Makerere JWT.

    We already confirmed that the JWT contains the student's
    number.

    IMPORTANT:
    This version decodes the token without verifying its
    signature. That is acceptable for getting the integration
    working locally, but production should verify the JWT.
    """

    try:

        payload = jwt.decode(
            token,
            options={
                "verify_signature": False
            }
        )

    except jwt.InvalidTokenError as e:

        raise HTTPException(
            status_code=401,
            detail="Invalid JWT token"
        ) from e


    # Your JWT may use "sub".
    #
    # If your decoded token uses another field, change this
    # line to that field.

    student_number = payload.get("student_number")


    if not student_number:

        raise HTTPException(
            status_code=401,
            detail="Student number not found in JWT"
        )


    return str(student_number)


# ============================================================
# CHROMA / POLICY KNOWLEDGE BASE
# ============================================================

embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    google_api_key=GOOGLE_API_KEY
)


db = Chroma(
    persist_directory="./chroma_db",
    embedding_function=embeddings
)


retriever = db.as_retriever(
    search_kwargs={
        "k": 3
    }
)


# ============================================================
# POLICY TOOL
# ============================================================

@tool
def search_policy(question: str) -> str:
    """
    Search Makerere University fees policy and payment
    regulations.

    Use this for questions about:

    - tuition payment rules
    - 60% tuition requirement
    - 40% balance requirement
    - registration deadlines
    - de-registration
    - functional fees policy
    - payment methods
    - PRN payments
    - government sponsorship
    - HESFB
    - scholarships
    - fee policies and regulations

    Do NOT use this for a student's personal balance
    or personal payment status.
    """

    documents = retriever.invoke(question)

    if not documents:
        return "No relevant policy information was found."

    return "\n\n".join(
        document.page_content
        for document in documents
    )


# ============================================================
# CURRENT SEMESTER TOOL
# ============================================================

@tool
def get_current_semester(studentNumber: str) -> dict:
    """
    Get the authenticated student's current academic
    year, semester, study year and enrollment status.

    The studentNumber argument is retained for the
    LangChain tool schema, but the application ignores
    the value supplied by the model.

    The authenticated student's number comes from the
    JWT associated with the current request.
    """

    # IMPORTANT:
    # Do NOT trust the value Gemini gives us.

    authenticated_student = get_authenticated_student_number()


    response = requests.get(
        f"{JAVA_BASE}/student/fees/period",
        params={
            "studentNumber": authenticated_student
        },
        timeout=15
    )


    response.raise_for_status()

    return response.json()


# ============================================================
# FINANCIAL SUMMARY TOOL
# ============================================================

@tool
def get_financial_summary(studentNumber: str) -> dict:
    """
    Get the authenticated student's overall financial
    summary for the current semester.

    Returns:

    - totalAmount
    - totalPaid
    - totalDue
    - percentageCompletion

    Use this for:

    - total fees owed
    - overall balance
    - total amount paid
    - total fees
    - overall fee completion
    """

    authenticated_student = get_authenticated_student_number()


    response = requests.get(
        f"{JAVA_BASE}/student/fees/financial-summary",
        params={
            "studentNumber": authenticated_student
        },
        timeout=15
    )


    response.raise_for_status()

    return response.json()


# ============================================================
# FEES BREAKDOWN TOOL
# ============================================================

@tool
def get_fees_breakdown(studentNumber: str) -> dict:
    """
    Get the authenticated student's current semester
    fee breakdown.

    Separates:

    - tuition amount
    - tuition paid
    - tuition due
    - functional fees amount
    - functional fees paid
    - functional fees due

    Use this when the user asks about:

    - tuition
    - tuition balance
    - tuition paid
    - functional fees
    - functional fees balance
    - whether functional fees are fully paid
    - whether tuition is fully paid
    - fee breakdown
    """

    authenticated_student = get_authenticated_student_number()


    response = requests.get(
        f"{JAVA_BASE}/student/fees/breakdown",
        params={
            "studentNumber": authenticated_student
        },
        timeout=15
    )


    response.raise_for_status()

    return response.json()


# ============================================================
# TOOLS
# ============================================================

tools = [
    get_current_semester,
    get_financial_summary,
    get_fees_breakdown,
    search_policy
]


# ============================================================
# LLM
# ============================================================

llm = ChatGoogleGenerativeAI(
    model="gemini-3.6-flash",
    temperature=0,
    google_api_key=GOOGLE_API_KEY
)


# ============================================================
# PROMPT
# ============================================================

prompt = ChatPromptTemplate.from_messages([

    (
        "system",
        """
You are Makai, a Makerere University student assistant.

IMPORTANT SECURITY RULES:

1. Never invent student information.
2. Never invent financial amounts.
3. Never invent academic information.
4. For personal student information, ALWAYS use the appropriate API tool.
5. For personal financial questions, ALWAYS use the financial API tools.
6. For Makerere policies, regulations, deadlines, payment procedures,
   registration rules, sponsorship rules or general fees policy,
   use search_policy.
7. If the user asks about their personal balance, NEVER answer from
   the policy document.
8. If an API tool fails, say:
   "Could not fetch data."
   Do not guess.
9. The authenticated student has already been identified by the
   application.
10. NEVER ask the user for their student number.
11. NEVER attempt to change the student number.
12. Personal student tools operate only on the authenticated student.

TOOL ROUTING:

- Current semester/year/study year
  -> get_current_semester

- Overall amount owed/paid
  -> get_financial_summary

- Tuition vs functional fees
  -> get_fees_breakdown

- Makerere University fees policy/regulations
  -> search_policy

The application, not the language model, determines which student
the personal tools operate on.
"""
    ),

    (
        "human",
        "{input}"
    ),

    (
        "placeholder",
        "{agent_scratchpad}"
    )
])


# ============================================================
# AGENT
# ============================================================

agent = create_tool_calling_agent(
    llm,
    tools,
    prompt
)


executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True
)


# ============================================================
# FASTAPI
# ============================================================

from fastapi import FastAPI,Header,HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Makai AI Agent"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# CHAT REQUEST
# ============================================================

class ChatRequest(BaseModel):
    message: str


# ============================================================
# CHAT ENDPOINT
# ============================================================

@app.post("/chat")
def chat(
    request: ChatRequest,
    authorization: str = Header(...)
):

    # --------------------------------------------------------
    # 1. Make sure Authorization header exists
    # --------------------------------------------------------

    if not authorization.startswith("Bearer "):

        raise HTTPException(
            status_code=401,
            detail="Bearer token required"
        )


    # --------------------------------------------------------
    # 2. Extract JWT
    # --------------------------------------------------------

    token = authorization.split(
        " ",
        1
    )[1]


    # --------------------------------------------------------
    # 3. Extract student number from JWT
    # --------------------------------------------------------

    student_number = extract_student_number_from_token(
        token
    )


    # --------------------------------------------------------
    # 4. Set authenticated student for this request
    # --------------------------------------------------------

    student_context = current_student_number.set(
        student_number
    )


    # --------------------------------------------------------
    # 5. Run the agent
    # --------------------------------------------------------

    try:

        result = executor.invoke({
            "input": request.message,
            "studentNumber": student_number
        })


        output = result["output"]


        # Some Gemini responses can be returned as a list.
        if isinstance(output, list):

            output = "".join(
                item.get("text", "")
                for item in output
                if (
                    isinstance(item, dict)
                    and item.get("type") == "text"
                )
            )


        return {
            "response": output
        }
        



    finally:

        # ----------------------------------------------------
        # VERY IMPORTANT
        #
        # Do not leave the student's identity in the context
        # after this request finishes.
        # ----------------------------------------------------

        current_student_number.reset(student_context)


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port
    )

from flask import Flask, request, jsonify
import time

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_ollama import ChatOllama
from flask_cors import CORS


startup_start = time.perf_counter()

app = Flask(__name__)
CORS(app)


# STEP 1: LOAD EMBEDDING MODEL

model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-mpnet-base-v2"
)


# STEP 2: LOAD FAISS DATABASE

vector_store = FAISS.load_local(
    "tcs_faiss_index",
    model,
    allow_dangerous_deserialization=True
)


# STEP 3: INITIALIZE OLLAMA

llm = ChatOllama(
    model="llama3.2:3b",
    temperature=0,
    num_predict=100,
    num_ctx=2048
)


startup_time = time.perf_counter() - startup_start

print(f"\nApplication startup time: {startup_time:.2f} seconds")
print("TCS RAG Chatbot is ready!\n")


# HELPER FUNCTION: FAISS RETRIEVAL

def retrieve_documents(search_query, k=4):

    retrieval_start = time.perf_counter()

    results = vector_store.similarity_search(
        search_query,
        k=k
    )

    retrieval_time = time.perf_counter() - retrieval_start

    print(f"FAISS Retrieval Time: {retrieval_time:.2f} seconds")

    return results, retrieval_time


# STEP 4: ORIGINAL /ask API

@app.route("/ask", methods=["POST"])
def ask_question():

    total_start = time.perf_counter()

    data = request.get_json()

    if not data or not data.get("question"):
        return jsonify({
            "error": "Please provide a question"
        }), 400

    question = data.get("question")

    # FAISS retrieval
    results, retrieval_time = retrieve_documents(
        question,
        k=4
    )

    # Extract context
    context = ""

    for result in results:
        context += result.page_content[:1000] + "\n\n"

    # Create prompt
    prompt = f"""
You are a financial report analysis assistant.

Answer using ONLY the provided TCS annual report context.

IMPORTANT:
- Identify the exact financial metric.
- Do not confuse revenue with operating profit.
- Include financial years and values when available.
- Do not invent missing figures.
- If information is unavailable, clearly say so.
- Keep answers concise.

Context:
{context}

Question:
{question}

Answer:
"""

    # Generate answer
    llm_start = time.perf_counter()

    response = llm.invoke(prompt)

    llm_time = time.perf_counter() - llm_start

    if response.usage_metadata:
        print("Token Usage:", response.usage_metadata)

    total_time = time.perf_counter() - total_start

    print("\n========== /ASK PERFORMANCE ==========")
    print(f"FAISS Retrieval Time: {retrieval_time:.2f} seconds")
    print(f"Ollama Generation Time: {llm_time:.2f} seconds")
    print(f"Total Processing Time: {total_time:.2f} seconds")
    print("=====================================\n")

    return jsonify({
        "question": question,
        "answer": response.content
    })


# STEP 5: CHAT API

@app.route("/ask_chat", methods=["POST"])
def ask_chat():

    total_start = time.perf_counter()

    data = request.get_json()

    if not data or not data.get("question"):
        return jsonify({
            "error": "Please provide a question"
        }), 400

    question = data.get("question")

    if not isinstance(question, str) or not question.strip():
        return jsonify({
            "error": "Question must be a non-empty string"
        }), 400

    history = data.get("history", [])

    if not isinstance(history, list):
        history = []

    history = history[-6:]

    # Build conversation history
    conversation = ""
    previous_questions = []

    for message in history:

        if not isinstance(message, dict):
            continue

        role = message.get("role", "")
        message_text = message.get("text", "")

        if not isinstance(message_text, str):
            continue

        if role == "user":
            conversation += f"\nUser: {message_text}\n"
            previous_questions.append(message_text)

        elif role == "bot":
            conversation += f"\nAssistant: {message_text}\n"

    # Handle follow-up questions
    search_query = question

    follow_up_words = ["it", "that", "this", "same"]

    question_words = question.lower().split()

    is_follow_up = (
        any(word in question_words for word in follow_up_words)
        or "previous year" in question.lower()
        or "compare both" in question.lower()
        or "explain more" in question.lower()
    )

    if is_follow_up and previous_questions:
        search_query = previous_questions[-1] + " " + question

    print("\nSearch query:", search_query)

    # FAISS retrieval
    results, retrieval_time = retrieve_documents(
        search_query,
        k=10
    )

    # Extract context and source pages
    context = ""
    source_pages = []

    for result in results:

        
        page_number = result.metadata.get("page")

        if page_number is not None:
            source_pages.append(int(page_number) + 1)

    source_pages = sorted(set(source_pages))

    print("Retrieved report pages:", source_pages)

    # Create prompt
    prompt = f"""
You are a financial report analysis assistant.

Answer the latest question using ONLY the provided
TCS annual report context for factual information.

IMPORTANT:
- Focus on the latest user question.
- Use conversation history to understand follow-up questions.
- Do not treat previous AI answers as verified facts.
- Identify the exact financial metric requested.
- Do not confuse revenue with operating profit.
- Check the financial year carefully.
- Include values and financial years when available.
- Do not invent missing figures.
- If information is unavailable in the context,
  clearly say so.
- Keep answers concise.

Previous conversation:
{conversation}

TCS Annual Report Context:
{context}

Latest user question:
{question}

Answer:
"""

    # Generate answer
    llm_start = time.perf_counter()

    response = llm.invoke(prompt)

    llm_time = time.perf_counter() - llm_start

    total_time = time.perf_counter() - total_start

    # Performance information
    print("\n========== CHATBOT PERFORMANCE ==========")
    print(f"FAISS Retrieval Time: {retrieval_time:.2f} seconds")
    print(f"Ollama Generation Time: {llm_time:.2f} seconds")
    print(f"Total Processing Time: {total_time:.2f} seconds")
    print("=========================================\n")

    if response.usage_metadata:
        print("Token Usage:", response.usage_metadata)

    return jsonify({
        "question": question,
        "answer": response.content,
        "source_pages": source_pages
    })


# STEP 6: PRINT ROUTES

print("\nREGISTERED FLASK ROUTES:")

for rule in app.url_map.iter_rules():
    print(rule, rule.methods)


# STEP 7: RUN FLASK

if __name__ == "__main__":

    app.run(
        debug=True,
        use_reloader=False
    )

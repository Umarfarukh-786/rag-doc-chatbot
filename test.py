from langchain_ollama import ChatOllama

llm = ChatOllama(
    model="llama3.2:3b",
    temperature=0
)

print("Testing Ollama...")

response = llm.invoke("What is TCS?")

print("Response:", response.content)
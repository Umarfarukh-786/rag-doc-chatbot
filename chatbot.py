
import os

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS


# Step 1: Load TCS PDF
file_path = r"C:\Users\Asus\OneDrive\Desktop\flask\openai\tcs.pdf"
print("PDF exists:", os.path.exists(file_path))
loader = PyPDFLoader(file_path)
documents = loader.load()

print("PDF pages:", len(documents))


# Step 2: Split PDF into chunks
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=2500,
    chunk_overlap=500
)

chunks = text_splitter.split_documents(documents)

print("Total chunks:", len(chunks))


# Step 3: Create Hugging Face embeddings
model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-mpnet-base-v2"
)


# Step 4: Create FAISS database
vector_store = FAISS.from_documents(
    documents=chunks,
    embedding=model
)

# Save FAISS database
vector_store.save_local("tcs_faiss_index")

print("FAISS database created successfully!")

# Financial Document Analysis & Q&A Assistant (RAG)

An end-to-end Retrieval-Augmented Generation (RAG) web application designed to query complex, high-density corporate reports and financial statements (e.g., TCS Annual Report) with source citations.

---

## 🚀 Architecture Overview

- **Vector Database & Search:** FAISS (Facebook AI Similarity Search) with vector embeddings
- **Orchestration:** LangChain for context assembly, chunk retrieval, and prompt formatting
- **Backend:** Python / Flask REST API
- **Frontend:** React + Vite interactive chat interface
- **Deployment-Ready:** Decoupled client-server layout suitable for AWS S3/Amplify (UI) and AWS EC2/App Runner (API)

---

## 📂 Project Structure

```text
├── app.py                 # Flask server & query endpoints
├── chatbot.py             # LangChain RAG pipeline & similarity search logic
├── batchjob.py            # PDF text extraction & FAISS vectorstore creation script
├── frontend/              # React frontend application
├── .gitignore             # Configured to exclude heavy index files, PDFs, and secrets
└── README.md

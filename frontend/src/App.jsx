
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useEffect, useRef } from "react";

import {
  Send,
  Bot,
  User,
  FileText,
  Plus,
  MessageSquare,
  Trash2,
  Menu,
  X,
} from "lucide-react";

import "./App.css";

function App() {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);

  // Load saved conversations
  const [chats, setChats] = useState(() => {
    try {
      const savedChats = localStorage.getItem("tcs_chats");

      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);

        if (
          Array.isArray(parsedChats) &&
          parsedChats.length > 0 &&
          parsedChats.every(
            (chat) =>
              chat &&
              typeof chat.id === "number" &&
              typeof chat.title === "string" &&
              Array.isArray(chat.messages)
          )
        ) {
          return parsedChats;
        }
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }

    return [
      {
        id: Date.now(),
        title: "New Chat",
        messages: [],
      },
    ];
  });

  // Load selected conversation
  const [activeChatId, setActiveChatId] = useState(() => {
    try {
      const savedId = localStorage.getItem("tcs_active_chat");
      return savedId ? Number(savedId) : null;
    } catch (error) {
      console.error("Error loading active chat:", error);
      return null;
    }
  });

  // Save conversations
  useEffect(() => {
    try {
      localStorage.setItem("tcs_chats", JSON.stringify(chats));
    } catch (error) {
      console.error("Error saving chats:", error);
    }
  }, [chats]);

  // Save active chat selection
  useEffect(() => {
    if (chats.some((chat) => chat.id === activeChatId)) {
      localStorage.setItem(
        "tcs_active_chat",
        String(activeChatId)
      );
    } else if (chats.length > 0) {
      setActiveChatId(chats[0].id);
    }
  }, [activeChatId, chats]);

  // Get active conversation
  const activeChat = chats.find(
    (chat) => chat.id === activeChatId
  );

  // Automatically scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeChat?.messages, isLoading]);

  // Create new chat
  const createNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: "New Chat",
      messages: [],
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setQuestion("");
  };

  // Update messages
  const updateMessages = (chatId, message) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          const messages = [...chat.messages, message];

          const title =
            chat.title === "New Chat" && message.role === "user"
              ? message.text.slice(0, 30)
              : chat.title;

          return {
            ...chat,
            messages,
            title,
          };
        }

        return chat;
      })
    );
  };

  // Delete chat
  const deleteChat = (chatId) => {
    const remainingChats = chats.filter(
      (chat) => chat.id !== chatId
    );

    if (remainingChats.length === 0) {
      const newChat = {
        id: Date.now(),
        title: "New Chat",
        messages: [],
      };

      setChats([newChat]);
      setActiveChatId(newChat.id);
      setQuestion("");
    } else {
      setChats(remainingChats);

      if (activeChatId === chatId) {
        setActiveChatId(remainingChats[0].id);
        setQuestion("");
      }
    }
  };

  // Send question to Flask backend
  const sendMessage = async () => {
    if (!question.trim() || isLoading || !activeChat) {
      return;
    }

    const userQuestion = question.trim();
    const chatId = activeChatId;

    // Save previous conversation before adding new question
    const previousMessages = [...activeChat.messages];

    // Add user message to chat
    updateMessages(chatId, {
      role: "user",
      text: userQuestion,
    });

    setQuestion("");
    setIsLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/ask_chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: userQuestion,
            history: previousMessages,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong"
        );
      }

      // Add AI response
      updateMessages(chatId, {
        role: "bot",
        text: data.answer,
        sources: data.source_pages || [],
      });

    } catch (error) {
      console.error("Chat API error:", error);

      updateMessages(chatId, {
        role: "bot",
        text: "Error: " + error.message,
        sources: [],
      });

    } finally {
      setIsLoading(false);
    }
  };

  // Suggested question selection
  const selectSuggestion = (suggestedQuestion) => {
    setQuestion(suggestedQuestion);
  };

  return (
    <div className="app">

      {/* Sidebar */}
      <aside
        className={`sidebar ${
          sidebarOpen ? "open" : "closed"
        }`}
      >
        <div className="sidebar-header">
          <h2>TCS Report AI</h2>

          <button
            className="icon-button"
            onClick={() => setSidebarOpen(false)}
            title="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <button
          className="new-chat"
          onClick={createNewChat}
        >
          <Plus size={20} />
          New Chat
        </button>

        <div className="history-title">
          Chat History
        </div>

        <div className="chat-history">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`history-item ${
                activeChatId === chat.id ? "active" : ""
              }`}
            >
              <button
                className="history-select"
                onClick={() => {
                  setActiveChatId(chat.id);
                  setQuestion("");
                }}
              >
                <MessageSquare size={17} />
                <span>{chat.title}</span>
              </button>

              <button
                className="delete-chat"
                onClick={() => deleteChat(chat.id)}
                title="Delete chat"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <Bot size={20} />
          <span>Powered by Groq AI</span>
        </div>
      </aside>

      {/* Main Application */}
      <div className="main-content">

        {/* Header */}
        <header className="header">
          <div className="header-left">

            {!sidebarOpen && (
              <button
                className="icon-button"
                onClick={() => setSidebarOpen(true)}
                title="Open sidebar"
              >
                <Menu size={22} />
              </button>
            )}

            <div className="logo">
              <FileText size={25} />
              <h2>TCS Report AI</h2>
            </div>
          </div>

          <span className="status">
            AI Assistant
          </span>
        </header>

        {/* Chat Container */}
        <main className="chat-container">

          {/* Welcome Section and Suggested Questions */}
          {activeChat?.messages.length === 0 && (
            <div className="welcome">

              <div className="welcome-badge">
                <span className="welcome-badge-dot"></span>
                AI-POWERED RESEARCH ASSISTANT
              </div>

              <Bot size={45} />

              <h1>
                TCS Annual Report
                <span className="gradient-text">
                  {" "}Intelligence
                </span>
              </h1>

              <p>
                Explore financial insights, business performance,
                and company information through intelligent
                conversations with the TCS annual report.
              </p>

              <div className="suggestions">

                <button
                  onClick={() =>
                    selectSuggestion(
                      "What is TCS's business overview?"
                    )
                  }
                >
                  What is TCS's business overview?
                </button>

                <button
                  onClick={() =>
                    selectSuggestion(
                      "What was TCS's total revenue in FY 2025?"
                    )
                  }
                >
                  What was TCS's revenue in FY 2025?
                </button>

                <button
                  onClick={() =>
                    selectSuggestion(
                      "What are TCS's major business segments?"
                    )
                  }
                >
                  What are TCS's major business segments?
                </button>

                <button
                  onClick={() =>
                    selectSuggestion(
                      "What are the future growth opportunities for TCS?"
                    )
                  }
                >
                  What are TCS's future growth opportunities?
                </button>

              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="messages">

            {activeChat?.messages.map((message, index) => (
              <div
                className={`message ${message.role}`}
                key={index}
              >
                <div className="avatar">
                  {message.role === "user" ? (
                    <User />
                  ) : (
                    <Bot />
                  )}
                </div>

                <div className="message-content">

                  {message.role === "bot" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                    >
                      {message.text}
                    </ReactMarkdown>
                  ) : (
                    <p>{message.text}</p>
                  )}

                  {message.sources?.length > 0 && (
                    <small className="source-pages">
                      Source pages: {message.sources.join(", ")}
                    </small>
                  )}

                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="message bot">
                <div className="avatar">
                  <Bot />
                </div>

                <div className="message-content">
                  <p>Thinking...</p>
                </div>
              </div>
            )}

            {/* Scroll Target */}
            <div ref={messagesEndRef} />

          </div>

          {/* Input Area */}
          {!isLoading && activeChat && (
            <div className="input-area">

              <input
                type="text"
                placeholder="Ask anything about TCS..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
              />

              <button
                onClick={sendMessage}
                disabled={!question.trim()}
                title="Send message"
              >
                <Send size={20} />
              </button>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default App;

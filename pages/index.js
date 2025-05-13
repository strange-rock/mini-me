// =============================================================================
// Chat Agent with User & Agent Bubbles (React + Vercel)
//
// This React component renders a chat interface where users can type messages
// and receive responses from an agent via a serverless API endpoint on Vercel.
// Messages are displayed in styled chat bubbles to clearly differentiate between
// user messages (right-aligned) and agent messages (left-aligned).
//
// Key Features:
// - Maintains a conversation history.
// - Displays each message in a styled bubble.
// - Sends user messages to the API and appends the agent's response (rendered as Markdown) to the chat.
// - Automatically scrolls to the latest message in a scrollable parent container.
// - Animates the submit button while the agent is "thinking".
// - Provides detailed comments for ease of understanding.
//
// Author: Thomas J McLeish
// Date: March 2, 2025
// =============================================================================

// Import the chat configuration settings.
// includes the header title, description, and suggested prompts.
import chatConfig from "../config/config";
// Import React hooks for managing state and side effects.
import { useState, useEffect, useRef } from "react";
// Import react-markdown to render markdown content.
import ReactMarkdown from "react-markdown";
// Import UUID to generate session ID
import { v4 as uuidv4 } from "uuid";

/**
 * Retrieves or generates a session ID and stores it in sessionStorage.
 * Ensures it only runs on the client side and limits it to 32 characters.
 * @returns {string} The session ID.
 */
const getSessionId = () => {
  if (typeof window === "undefined") return ""; // Prevent SSR issues

  let sessionId = sessionStorage.getItem("sessionId");
  //if the id is greater than 32 characters, we need to generate a new one.
  sessionId = sessionId && sessionId.length <= 32 ? sessionId : null;

  if (!sessionId) {
    //the generated id is 36 characters long, so we need to remove the dashes and limit it to 32 characters.
    sessionId = uuidv4().replace(/-/g, "").slice(0, 32); // Ensure max 32 chars
    sessionStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
};

/**
 * Retrieves or generates a persistent user ID and stores it in localStorage.
 * Ensures it only runs on the client side and limits it to 32 characters.
 * @returns {string} The user ID.
 */
const getUserId = () => {
  if (typeof window === "undefined") return ""; // Prevent SSR issues

  let userId = localStorage.getItem("userId");
  //if the id is greater than 32 characters, we need to generate a new one.
  userId = userId && userId.length <= 32 ? userId : null;

  if (!userId) {
    //the generated id is 36 characters long, so we need to remove the dashes and limit it to 32 characters.
    userId = uuidv4().replace(/-/g, "").slice(0, 32); // Ensure max 32 chars
    localStorage.setItem("userId", userId);
  }
  return userId;
};

/**
 * AgentComponent renders a chat interface with user and agent bubbles.
 * It manages the conversation state, handles user input and API requests,
 * and renders responses as Markdown.
 *
 * @returns {JSX.Element} The rendered chat interface.
 */
export default function AgentComponent() {
  // State to store the user's current input from the text field.
  const [message, setMessage] = useState("");

  // State to store the conversation as an array of message objects.
  // Each message object has a role ("user" or "agent") and the message content.
  const [conversation, setConversation] = useState([]);

  // State to capture any errors during the API request.
  const [error, setError] = useState(null);

  // State to track if the agent is processing (loading state).
  const [isLoading, setIsLoading] = useState(false);

  // Create a ref to track the end of the messages container.
  const messagesEndRef = useRef(null);

  // Initialize session ID and user ID states.
  const [sessionId, setSessionId] = useState("");
  const [userId, setUserId] = useState("");

  // Initialize the hovered index state for suggested prompts.
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // State to track if the submit button is hovered.
  const [isSubmitHovered, setIsSubmitHovered] = useState(false);

  // Initialize click position state
  const [clickPosition, setClickPosition] = useState({ x: 50, y: 50 });

  // Add typing indicator state
  const [isTyping, setIsTyping] = useState(false);

  // Add state for cycling prompts
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  // Add state to track if prompts should be shown
  const [showPrompts, setShowPrompts] = useState(true);

  // Initialize session ID and user ID on the client side
  useEffect(() => {
    setSessionId(getSessionId());
    setUserId(getUserId());
  }, []);

  // Setup prompt cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromptIndex((prevIndex) => 
        (prevIndex + 1) % chatConfig.suggestedPrompts.length
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Scrolls the chat container to the bottom to ensure the latest message is visible.
   */
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      // Prevent page scroll
      const chatContainer = document.querySelector('.chat-container');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  };

  // Scroll to the latest message whenever the conversation updates.
  useEffect(() => {
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer && conversation.length > 0) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [conversation]);

  /**
   * Handles the form submission event.
   * @param {Event} e - The form submission event.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    submitMessage(message);
  };

  /**
   * Handles the submission of the chat input form.
   *
   * Prevents the default form submission behavior, updates the conversation
   * with the user's message, sends the message to the API, and appends the agent's
   * response to the conversation.
   *
   * @param {Event} e - The form submission event.
   * @returns {Promise<void>} A promise that resolves when the submission is complete.
   */
  const submitMessage = async (userInput) => {
    if (!userInput.trim()) return;
    setMessage("");
    setError(null);

    const userMessage = {
      role: "user",
      content: userInput.trim(),
    };

    setConversation((prev) => [...prev, userMessage]);

    const payload = {
      data: {
        message: userMessage,
      },
      stateful: true,
      stream: false,
      user_id: userId,
      session_id: sessionId,
      verbose: false,
    };

    try {
      setIsLoading(true);
      setIsTyping(true); // Show typing indicator

      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();

      // Simulate a small delay for typing animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsTyping(false); // Hide typing indicator

      const agentReply = data.output_data && data.output_data.content
        ? data.output_data.content
        : "No valid response received from agent.";

      const agentMessage = {
        role: "agent",
        content: agentReply,
      };

      setConversation((prev) => [...prev, agentMessage]);
      setMessage("");
    } catch (err) {
      console.error("Error fetching agent response:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Inline styles for chat bubbles based on the message role.
   *
   * @type {Object}
   * @property {Object} user - Styles for user messages (right-aligned, light green background).
   * @property {Object} agent - Styles for agent messages (left-aligned, light gray background).
   */
  const bubbleStyles = {
    user: {
      alignSelf: "flex-end",
      backgroundColor: "#393836",
      color: "#FFFFFF",
      padding: "12px 16px",
      borderRadius: "18px 18px 4px 18px",
      margin: "4px 0",
      maxWidth: "80%",
      fontSize: "14px",
      lineHeight: "150%",
      transform: "translateY(20px) scale(0.9)",
      opacity: 0,
      animation: "bubbleIn 0.3s ease-out forwards",
      fontFamily: "Switzer, sans-serif",
      boxShadow: "0px 9px 6px -6px rgba(57, 56, 54, 0.25)",
    },
    agent: {
      alignSelf: "flex-start",
      backgroundColor: "#F1EFF0",
      color: "#000000",
      padding: "12px 16px",
      borderRadius: "18px 18px 18px 4px",
      margin: "4px 0",
      maxWidth: "80%",
      fontSize: "14px",
      lineHeight: "150%",
      transform: "translateY(20px) scale(0.9)",
      opacity: 0,
      animation: "bubbleIn 0.3s ease-out forwards",
      fontFamily: "Switzer, sans-serif",
      boxShadow: "0px 9px 6px -6px rgba(57, 56, 54, 0.25)",
    },
  };

  /**
   * Handles the click event on a suggested prompt.
   * @param {Object} prompt - The prompt object containing text and autoSubmit flag.
   * @param {Event} event - The click event
   */
  const handlePromptClick = async (prompt) => {
    setShowPrompts(false); // Hide prompts after clicking
    await submitMessage(prompt); // Send the message
  };

  /**
   * Handles the mouseover event on a suggested prompt.
   * @param {*} index
   */
  const handlePromptMouseOver = (index) => {
    if (!isLoading) {
      setHoveredIndex(index);
    }
  };

  /**
   * Handles the mouseout event on a suggested prompt.
   */
  const handlePromptMouseOut = () => {
    setHoveredIndex(null);
  };

  return (
    <div
      style={{
        display: "flex",
        maxWidth: "600px",
        width: "100%",
        padding: "8px",
        flexDirection: "column",
        alignItems: "stretch",
        gap: "7px",
        alignSelf: "stretch",
        borderRadius: "24px",
        background: "#FFF",
        margin: "20px auto",
        border: "1px solid #EDEDED",
        boxShadow: "rgba(0, 0, 0, 0.2) 0px 0.482901px 1.25554px -2.25px, rgba(0, 0, 0, 0.02) 0px 4px 10.4px -4.5px, rgba(0, 0, 0, 0.18) 0px 0.602187px 0.602187px -1.25px, rgba(0, 0, 0, 0.16) 0px 2.28853px 2.28853px -2.5px, rgba(0, 0, 0, 0.06) 0px 10px 10px -3.75px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Switzer, sans-serif",
        boxSizing: "border-box",
        height: "480px", // Fixed height for main container
      }}
    >
      {/* Chat Container */}
      <div
        className="chat-container"
        style={{
          height: showPrompts && conversation.length === 0 ? "355px" : "412px", // Adjust height based on prompts visibility
          width: "100%",
          alignSelf: "stretch",
          borderRadius: "16px",
          background: "#FFFFFF",
          padding: "16px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxSizing: "border-box",
          transition: "height 0.3s ease", // Smooth height transition
        }}
      >
        {conversation.map((msg, index) => (
          <div
            key={index}
            style={{
              ...msg.role === "user" ? bubbleStyles.user : bubbleStyles.agent,
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {msg.role === "agent" ? (
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {isTyping && (
          <div
            style={{
              ...bubbleStyles.agent,
              animationDelay: '0s',
            }}
          >
            <div className="typing-indicator" style={{ padding: 0 }}>
              <div className="dot" style={{ background: '#393836' }}></div>
              <div className="dot" style={{ background: '#393836' }}></div>
              <div className="dot" style={{ background: '#393836' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Container */}
      <div style={{
        height: showPrompts && conversation.length === 0 ? "42px" : "0",
        display: "flex",
        alignItems: "center",
        opacity: showPrompts && conversation.length === 0 ? 1 : 0,
        transition: "opacity 0.3s ease, height 0.3s ease",
        pointerEvents: showPrompts && conversation.length === 0 ? "auto" : "none",
        overflow: "hidden",
        marginBottom: showPrompts && conversation.length === 0 ? "2px" : "0"
      }}>
        {showPrompts && conversation.length === 0 && (
          <div 
            style={{
              display: "inline-flex",
              height: "42px",
              borderRadius: "16px",
              background: "#393836",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontSize: "14px",
              padding: "0 16px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              alignSelf: "flex-start",
              transition: "transform 0.2s ease",
              '&:hover': {
                transform: "scale(1.02)",
              }
            }}
            onClick={() => handlePromptClick(chatConfig.suggestedPrompts[currentPromptIndex])}
          >
            <div key={currentPromptIndex} style={{ display: 'flex', gap: '4px' }}>
              {chatConfig.suggestedPrompts[currentPromptIndex].split(' ').map((word, index) => (
                <span
                  key={`${currentPromptIndex}-${index}`}
                  style={{
                    display: 'inline-block',
                    animation: `promptIn 0.3s cubic-bezier(0.15, 1.15, 0.6, 1.0) forwards`,
                    animationDelay: `${index * 0.05}s`,
                    opacity: 0
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Container */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        boxSizing: "border-box",
      }}>
        {/* Text Box */}
        <div
          style={{
            display: "flex",
            padding: "6px",
            justifyContent: "flex-end",
            alignItems: "flex-start",
            gap: "10px",
            flex: "1 0 calc(100% - 61px)", // 53px button width + 8px gap
            borderRadius: "16px",
            background: "#F1EFF0",
            boxSizing: "border-box",
          }}
        >
          <input
            type="text"
            id="message"
            placeholder={chatConfig.chatInputPlaceholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              padding: "12px",
              fontSize: "16px",
              color: "#000000",
              fontFamily: "Switzer, sans-serif",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSubmit}
          aria-label="Send prompt"
          data-testid="send-button"
          disabled={isLoading}
          style={{
            width: "53px",
            height: "53px",
            borderRadius: "16px",
            border: "1px solid #5B5B5B",
            background: "#393836",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isLoading ? "default" : "pointer",
            transition: "transform 0.2s ease, opacity 0.2s ease",
            transform: isSubmitHovered && !isLoading ? "scale(1.05)" : "scale(1)",
            opacity: isLoading ? 0.5 : 1,
            padding: 0,
            flexShrink: 0,
            boxSizing: "border-box",
          }}
          onMouseOver={() => !isLoading && setIsSubmitHovered(true)}
          onMouseOut={() => setIsSubmitHovered(false)}
        >
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '24px', height: '24px' }}>
            <g clipPath="url(#clip0_4086_8473)">
              <path fillRule="evenodd" clipRule="evenodd" d="M1.84647 7.15123C1.54566 7.21608 1.31498 7.45811 1.26464 7.7617C1.2143 8.06528 1.35452 8.36881 1.6183 8.52729L8.13474 12.4421L14.3544 8.08705C14.6938 7.84947 15.1614 7.93193 15.399 8.27123C15.6366 8.61054 15.5541 9.0782 15.2148 9.31578L8.99537 13.6707L10.4455 21.1339C10.5042 21.436 10.7415 21.6715 11.044 21.7281C11.3465 21.7846 11.6528 21.6506 11.8166 21.3901L22.7919 3.93893C22.9526 3.68349 22.9445 3.35665 22.7714 3.10947C22.5983 2.86228 22.294 2.7429 21.999 2.80649L1.84647 7.15123Z" fill="#F1EFF0"/>
            </g>
            <defs>
              <clipPath id="clip0_4086_8473">
                <rect width="24" height="24" />
              </clipPath>
            </defs>
          </svg>
        </button>
      </div>

      {/* Display error message if one occurs */}
      {error && (
        <div 
          style={{ 
            color: "#EF4444", 
            marginTop: "20px",
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            fontSize: "14px",
            animation: "fadeIn 0.3s ease-out forwards"
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Switzer:wght@400;500;600&display=swap');

        * {
          box-sizing: border-box;
        }

        /* Reset margins for all paragraphs */
        p {
          margin: 0;
          padding: 0;
        }

        /* Reset margins for paragraphs within chat bubbles */
        div > p {
          margin: 0;
          padding: 0;
        }

        /* Reset for ReactMarkdown output */
        :global(p) {
          margin: 0 !important;
          margin-block-start: 0 !important;
          margin-block-end: 0 !important;
          margin-inline-start: 0 !important;
          margin-inline-end: 0 !important;
          padding: 0;
        }

        .chat-container::-webkit-scrollbar {
          width: 6px;
        }
        .chat-container::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
          border-radius: 3px;
        }
        .chat-container::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.2);
          border-radius: 3px;
          transition: background-color 0.3s ease;
        }
        .chat-container::-webkit-scrollbar-thumb:hover {
          background-color: rgba(0,0,0,0.3);
        }
        .chat-container {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.2) rgba(0,0,0,0.05);
        }
        
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px;
        }
        
        .dot {
          width: 6px;
          height: 6px;
          background: #FFFFFF;
          border-radius: 50%;
          animation: typing 1s infinite;
        }
        
        .dot:nth-child(1) { animation-delay: 0s; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes typing {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        
        @keyframes bubbleIn {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes promptIn {
          0% {
            opacity: 0;
            transform: translateY(5px);
            filter: blur(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
      `}</style>
    </div>
  );
}

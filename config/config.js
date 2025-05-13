// config.js
// =============================================================================
// Chat Application Configuration
// =============================================================================
// This configuration file stores metadata and descriptions related to the Chat Agent component.
// The goal is to keep the main component clean and maintainable.
//
// Key Features:
// - Stores the descriptive header for the chat component.
// - Provides metadata such as the author and version.
// - Can be extended for additional configuration settings in the future.
// =============================================================================

const chatConfig = {
  flowURL:
    "https://api.zerowidth.ai/v1/process/IocJSfGIqpnNm2SZgjQq/ZTIHyiW164z3XuUqTsFC",
  header: {
    title: "Chat with Uttkarsh",
    description:
      "Explore more about me—my experiences, interests, and insights. Ask anything and dive deeper into what I do!",
  },
  suggestedPromptsTitle: "What would you like to know about me?",
  suggestedPrompts: [
    "Tell me about your projects and experience",
    "What are your interests and background?",
    "How would you describe your work style?",
  ],
  chatInputPlaceholder: "Go ahead, type something...",
  maxChatHeight: 200,
};

export default chatConfig;

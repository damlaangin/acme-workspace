"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FaRobot, FaUser, FaPaperPlane, FaArrowLeft, FaCog } from "react-icons/fa";
import { LuLoaderCircle } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import styles from "@/styles/app/dashboard/AiChat.module.scss";
import { useWorkspace } from "@/context/workspace-context";
import { botsService } from "@/lib/services/bots.service";
import { Bot } from "@/types/api";
import AiBreadcrumb from "@/components/app/ai/AiBreadcrumb";

interface Message {
  id: number;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

interface AiConfig {
  setupType?: "scratch" | "template";
  aiName?: string;
  mission?: string;
  responsibilities?: string[];
  workflow?: string[];
  rules?: string[];
  interactionStyle?: string;
}

const AiChatContent: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiConfig>({});
  const [loadingBot, setLoadingBot] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const applyConfig = useCallback((config: AiConfig) => {
    setAiConfig(config);
    const welcomeMessage: Message = {
      id: 0,
      content: `Hello! I'm ${config.aiName || "your AI assistant"}. ${
        config.mission ? `My mission is: ${config.mission.substring(0, 100)}...` : ""
      } How can I help you today?`,
      sender: "ai",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  const mapBotToConfig = useCallback((botData: Bot): AiConfig => {
    const config = botData.form_submission?.config;
    const parseMultilineField = (value?: string) =>
      value
        ? value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
        : undefined;

    return {
      setupType: botData.form_submission?.template ? "template" : "scratch",
      aiName: botData.name,
      mission: config?.objective,
      responsibilities: parseMultilineField(config?.sop),
      workflow: parseMultilineField(config?.context),
      rules: parseMultilineField(config?.instructions),
      interactionStyle: config?.notes,
    };
  }, []);

  const isChatReady = Boolean(aiConfig.aiName);
  const isSendDisabled = !inputValue.trim() || isTyping || !isChatReady;

  useEffect(() => {
    const configParam = searchParams.get("config");
    if (!configParam) return;

    try {
      const config = JSON.parse(decodeURIComponent(configParam));
      applyConfig(config);
      setBotError(null);
    } catch (error) {
      console.error("Error parsing AI config:", error);
      setBotError("Invalid AI configuration");
    }
  }, [searchParams, applyConfig]);

  useEffect(() => {
    const botIdValue = searchParams.get("botId");
    const botId = botIdValue ? Number(botIdValue) : null;
    const hasConfig = Boolean(searchParams.get("config"));

    if (!botId || Number.isNaN(botId) || !currentWorkspace || hasConfig) {
      return;
    }

    let isCancelled = false;

    const loadBotConfig = async () => {
      setLoadingBot(true);
      setBotError(null);
      try {
        const result = await botsService.getBot(currentWorkspace.id, botId);
        if (isCancelled) return;

        if (result.success && result.data) {
          applyConfig(mapBotToConfig(result.data));
        } else {
          setBotError(result.error?.message || "Failed to load AI agent");
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Error loading bot:", error);
          setBotError("Failed to load AI agent");
        }
      } finally {
        if (!isCancelled) {
          setLoadingBot(false);
        }
      }
    };

    loadBotConfig();

    return () => {
      isCancelled = true;
    };
  }, [searchParams, currentWorkspace, applyConfig, mapBotToConfig]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const simulateAiResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Simulate different responses based on the AI's configuration
    if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
      return `Hello there! I'm ${aiConfig.aiName || "your AI assistant"}. I'm here to help with ${aiConfig.responsibilities?.slice(0, 2).join(" and ") || "your needs"}. What can I do for you?`;
    }
    
    if (lowerMessage.includes("check-in") || lowerMessage.includes("checkin")) {
      return "I'd be happy to help with your check-in! For a smooth process, please have your booking confirmation ready. The property address is [Property Address], and check-in time is typically after 3 PM. Do you need the door code or have any specific questions?";
    }
    
    if (lowerMessage.includes("wifi") || lowerMessage.includes("internet")) {
      return "The WiFi network name is 'GuestNetwork' and the password is 'Welcome2024'. You'll find this information also available in the welcome booklet on the coffee table. Let me know if you have any connectivity issues!";
    }
    
    if (lowerMessage.includes("restaurant") || lowerMessage.includes("food")) {
      return "I'd love to recommend some great local dining options! For a fine dining experience, try 'The Garden Restaurant' just 5 minutes away. For casual dining, 'Local Bistro' has excellent reviews. Are you looking for any specific type of cuisine?";
    }
    
    if (lowerMessage.includes("emergency") || lowerMessage.includes("urgent")) {
      return "I understand this is urgent. For immediate emergencies, please call 911. For property-related urgent issues, I'm contacting our maintenance team right away. Can you please describe the specific problem you're experiencing?";
    }
    
    if (lowerMessage.includes("boiler") || lowerMessage.includes("heating") || lowerMessage.includes("hot water")) {
      return "I see you're having issues with the heating/hot water system. Let me help troubleshoot: 1) Check if the boiler power switch is on (usually in the utility closet), 2) Look for any error codes on the display, 3) Try adjusting the thermostat. I'm also notifying our maintenance team. Can you tell me what exactly isn't working?";
    }
    
    // Default response based on interaction style
    const styles = {
      professional: "I understand your inquiry. Let me provide you with the appropriate assistance.",
      friendly: "Thanks for reaching out! I'm here to help make your stay as comfortable as possible.",
      casual: "Hey there! No worries, I've got you covered.",
      helpful: "I'm here to help solve this for you. Let me provide you with the best solution."
    };
    
    const styleResponse = styles[aiConfig.interactionStyle as keyof typeof styles] || styles.helpful;
    return `${styleResponse} However, I might need a bit more context about "${userMessage}" to give you the most accurate help. Could you provide more details?`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !aiConfig.aiName) return;

    const userMessage: Message = {
      id: Date.now(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse: Message = {
        id: Date.now() + 1,
        content: simulateAiResponse(inputValue),
        sender: "ai",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles["ai-chat-container"]}>
      <AiBreadcrumb />
      <div className={styles["chat-header"]}>        
        <div className={styles["header-center"]}>
          <FaRobot className={styles["ai-icon"]} />
          <div className={styles["ai-info"]}>
            <h2>{aiConfig.aiName || "AI Assistant"}</h2>
            <span className={styles["ai-status"]}>Online • Testing Mode</span>
          </div>
        </div>
        
        <div className={styles["header-right"]}>
          <Button
            onClick={() => router.push("/dashboard/ai/ai-setup")}
            variant="ghost"
            className={styles["config-button"]}
          >
            <FaCog />
            Configure
          </Button>
        </div>
      </div>
      {botError && (
        <div className={styles["chat-error"]}>{botError}</div>
      )}

      <div className={styles["chat-messages"]}>
        {loadingBot && messages.length === 0 ? (
          <div className={styles["chat-loading"]}>
            <LuLoaderCircle className="animate-spin" />
            <p>Loading agent chat...</p>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`${styles["message"]} ${styles[`message--${message.sender}`]}`}
                >
                  <div className={styles["message-avatar"]}>
                    {message.sender === "ai" ? (
                      <FaRobot className={styles["avatar-icon"]} />
                    ) : (
                      <FaUser className={styles["avatar-icon"]} />
                    )}
                  </div>
                  
                  <div className={styles["message-content"]}>
                    <div className={styles["message-bubble"]}>
                      {message.content}
                    </div>
                    <div className={styles["message-time"]}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${styles["message"]} ${styles["message--ai"]}`}
              >
                <div className={styles["message-avatar"]}>
                  <FaRobot className={styles["avatar-icon"]} />
                </div>
                <div className={styles["message-content"]}>
                  <div className={styles["typing-indicator"]}>
                    <div className={styles["typing-dot"]}></div>
                    <div className={styles["typing-dot"]}></div>
                    <div className={styles["typing-dot"]}></div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className={styles["chat-input-container"]}>
        <div className={styles["input-wrapper"]}>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${aiConfig.aiName || "AI Assistant"}...`}
            className={styles["chat-input"]}
            rows={1}
            disabled={!isChatReady}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isSendDisabled}
            className={styles["send-button"]}
          >
            <FaPaperPlane />
          </Button>
        </div>
      </div>

      <div className={styles["test-info"]}>
        <Card className={styles["info-card"]}>
          <CardHeader>
            <CardTitle>Testing Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You're currently testing your AI configuration. Try asking about:</p>
            <ul>
              <li>Check-in procedures</li>
              <li>WiFi information</li>
              <li>Local restaurant recommendations</li>
              <li>Property maintenance issues</li>
              <li>Emergency situations</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AiChatContent;

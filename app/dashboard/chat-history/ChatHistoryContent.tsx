"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaClock, FaUser, FaRobot, FaStar } from "react-icons/fa";
import { LuLoaderCircle } from "react-icons/lu";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import styles from "@/styles/app/dashboard/ChatHistory.module.scss";

interface ChatMessage {
  id: number;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
}

interface ChatSession {
  id: number;
  agentName: string;
  startTime: string;
  endTime: string;
  duration: string;
  messageCount: number;
  rating?: number;
  messages: ChatMessage[];
}

const ChatHistoryContent: React.FC = () => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get('agentId');

  useEffect(() => {
    loadChatHistory();
  }, [agentId]);

  const loadChatHistory = () => {
    try {
      // Mock data - in real app, load from API
      const mockChatSessions: ChatSession[] = [
        {
          id: 1,
          agentName: 'PropertyBot',
          startTime: '2024-01-20T14:30:00Z',
          endTime: '2024-01-20T14:42:00Z',
          duration: '12m',
          messageCount: 8,
          rating: 5,
          messages: [
            { id: 1, content: 'Hi, I need help with check-in', sender: 'user', timestamp: '2024-01-20T14:30:00Z' },
            { id: 2, content: 'Hello! I\'d be happy to help you with check-in. Check-in time is at 3:00 PM. Are you arriving early or do you need the door code?', sender: 'ai', timestamp: '2024-01-20T14:30:15Z' },
            { id: 3, content: 'I need the door code please', sender: 'user', timestamp: '2024-01-20T14:31:00Z' },
            { id: 4, content: 'The door code is 1234#. The property is located at 123 Main Street. Is there anything else I can help you with?', sender: 'ai', timestamp: '2024-01-20T14:31:10Z' },
            { id: 5, content: 'Where can I park?', sender: 'user', timestamp: '2024-01-20T14:32:00Z' },
            { id: 6, content: 'Free parking is available behind the building. Look for spots marked with our property number. You can also park on the street but please check the signs for time limits.', sender: 'ai', timestamp: '2024-01-20T14:32:15Z' },
            { id: 7, content: 'Perfect, thank you!', sender: 'user', timestamp: '2024-01-20T14:33:00Z' },
            { id: 8, content: 'You\'re welcome! Enjoy your stay and don\'t hesitate to reach out if you have any other questions.', sender: 'ai', timestamp: '2024-01-20T14:33:10Z' }
          ]
        },
        {
          id: 2,
          agentName: 'PropertyBot',
          startTime: '2024-01-20T09:15:00Z',
          endTime: '2024-01-20T09:20:00Z',
          duration: '5m',
          messageCount: 3,
          rating: 4,
          messages: [
            { id: 1, content: 'What time is checkout?', sender: 'user', timestamp: '2024-01-20T09:15:00Z' },
            { id: 2, content: 'Checkout is at 11:00 AM. Please make sure to leave the keys on the kitchen counter and lock the door behind you.', sender: 'ai', timestamp: '2024-01-20T09:15:10Z' },
            { id: 3, content: 'Got it, thanks!', sender: 'user', timestamp: '2024-01-20T09:16:00Z' }
          ]
        },
        {
          id: 3,
          agentName: 'PropertyBot',
          startTime: '2024-01-19T16:45:00Z',
          endTime: '2024-01-19T17:03:00Z',
          duration: '18m',
          messageCount: 12,
          rating: 5,
          messages: [
            { id: 1, content: 'The boiler seems to be making strange noises', sender: 'user', timestamp: '2024-01-19T16:45:00Z' },
            { id: 2, content: 'I\'m sorry to hear about the boiler issue. Let me help you troubleshoot this. Can you describe the type of noise you\'re hearing?', sender: 'ai', timestamp: '2024-01-19T16:45:15Z' },
            // ... more messages would be here
          ]
        }
      ];

      setChatSessions(mockChatSessions);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar 
        key={i} 
        className={i < rating ? styles["star-filled"] : styles["star-empty"]} 
      />
    ));
  };

  if (loading) {
    return (
      <div className={styles["loading-container"]}>
        <div className={styles["loading-spinner"]}>
          <LuLoaderCircle className={`${styles["loading-icon"]} animate-spin`} />
          <p>Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["chat-history-container"]}>
      <div className={styles["header"]}>
        <div className={styles["header-content"]}>
          <h1>Chat History</h1>
          <p>View all conversations with your AI agents</p>
        </div>
      </div>

      <div className={styles["content-layout"]}>
        <div className={styles["sessions-sidebar"]}>
          <h3>Chat Sessions</h3>
          <div className={styles["sessions-list"]}>
            {chatSessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`${styles["session-item"]} ${
                  selectedSession?.id === session.id ? styles["selected"] : ""
                }`}
                onClick={() => setSelectedSession(session)}
              >
                <div className={styles["session-header"]}>
                  <div className={styles["session-agent"]}>
                    <FaRobot />
                    {session.agentName}
                  </div>
                  <div className={styles["session-time"]}>
                    <FaClock />
                    {formatDate(session.startTime)}
                  </div>
                </div>
                <div className={styles["session-stats"]}>
                  <span>{session.duration}</span>
                  <span>{session.messageCount} messages</span>
                  {session.rating && (
                    <div className={styles["session-rating"]}>
                      {renderStars(session.rating)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className={styles["chat-viewer"]}>
          {selectedSession ? (
            <Card className={styles["chat-card"]}>
              <CardHeader className={styles["chat-header"]}>
                <div className={styles["chat-title"]}>
                  <CardTitle>
                    Chat with {selectedSession.agentName}
                  </CardTitle>
                  <div className={styles["chat-meta"]}>
                    <span>{formatDate(selectedSession.startTime)}</span>
                    <span>Duration: {selectedSession.duration}</span>
                    {selectedSession.rating && (
                      <div className={styles["chat-rating"]}>
                        Rating: {renderStars(selectedSession.rating)}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className={styles["chat-content"]}>
                <div className={styles["messages-container"]}>
                  {selectedSession.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`${styles["message"]} ${
                        message.sender === 'user' ? styles["message-user"] : styles["message-ai"]
                      }`}
                    >
                      <div className={styles["message-avatar"]}>
                        {message.sender === 'user' ? <FaUser /> : <FaRobot />}
                      </div>
                      <div className={styles["message-content"]}>
                        <div className={styles["message-bubble"]}>
                          {message.content}
                        </div>
                        <div className={styles["message-time"]}>
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className={styles["empty-state"]}>
              <LuLoaderCircle className={styles["empty-icon"]} />
              <h3>Select a Chat Session</h3>
              <p>Choose a conversation from the left to view the complete chat history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistoryContent;

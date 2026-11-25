"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  FaSearch,
  FaUserCircle,
  FaPaperPlane,
  FaEllipsisV,
  FaPhone,
  FaVideo,
  FaInfo,
  FaRobot,
  FaUser,
} from "react-icons/fa";
import { LuLoaderCircle } from "react-icons/lu";
import { IoCheckmarkDoneSharp } from "react-icons/io5";

import { Card, CardContent } from "@/components/ui/card";
import styles from "@/styles/app/dashboard/Conversations.module.scss";
import { retrieveUserWorkspaceState } from "@/lib/server/workspace";
import { conversationsService } from "@/lib/services/conversations.service";
import { Conversation, Message } from "@/types/api";

const ConversationsContent: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations from API
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const wsId = await resolveWorkspaceId();
        if (!wsId) {
          setConversations([]);
          return;
        }
        const result = await conversationsService.getConversations(wsId);
        if (result.success && result.data) {
          const conversationsWithExtras = (result.data.results ?? []).map((conv) => {
            const raw = conv as any;
            const lastMessage = raw.lastMessage ?? raw.last_message ?? conv.lastMessage;
            const unreadCount =
              raw.unreadCount ?? raw.unread_count ?? conv.unreadCount ?? 0;
            return {
              ...conv,
              lastMessage,
              unreadCount,
            };
          });
          setConversations(conversationsWithExtras);
        } else {
          console.error(
            "Failed to load conversations:",
            result.error?.message ?? result.error
          );
        }
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, []);

  const resolveWorkspaceId = async (): Promise<number | null> => {
    if (workspaceId) return workspaceId;
    try {
      const { currentWorkspace } = await retrieveUserWorkspaceState();
      setWorkspaceId(currentWorkspace.id);
      return currentWorkspace.id;
    } catch (error) {
      console.error("Failed to resolve workspace:", error);
      return null;
    }
  };

  const loadMessages = async (conversationId: number) => {
    setLoadingMessages(true);
    try {
      const wsId = await resolveWorkspaceId();
      if (!wsId) {
        setMessages([]);
        return;
      }
      const result = await conversationsService.getMessages(wsId, conversationId);
      if (result.success && result.data) {
        const fetchedMessages = result.data.results ?? [];
        setMessages(fetchedMessages);
        if (fetchedMessages.length > 0) {
          const latest = fetchedMessages[fetchedMessages.length - 1];
          setConversations(prev =>
            prev.map(c =>
              c.id === conversationId ? { ...c, lastMessage: latest } : c
            )
          );
          setSelectedConversation(prev =>
            prev && prev.id === conversationId ? { ...prev, lastMessage: latest } : prev
          );
        }
      } else {
        console.error(
          "Failed to load messages:",
          result.error?.message ?? result.error
        );
        setMessages([]);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
    // Mark as read
    setConversations(prev => 
      prev.map(c => c.id === conversation.id ? { ...c, unreadCount: 0 } : c)
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const wsId = await resolveWorkspaceId();
      if (!wsId) return;
      const result = await conversationsService.createMessage(
        wsId,
        selectedConversation.id,
        {
          message: newMessage,
          conversation: selectedConversation.id,
        }
      );

      if (result.success && result.data) {
        const createdMessage = result.data;
        setMessages(prev => [...prev, createdMessage]);
        setConversations(prev =>
          prev.map(c =>
            c.id === selectedConversation.id ? { ...c, lastMessage: createdMessage } : c
          )
        );
        setSelectedConversation(prev =>
          prev && prev.id === selectedConversation.id
            ? { ...prev, lastMessage: createdMessage }
            : prev
        );
        setNewMessage("");
        
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        console.error(
          "Failed to send message:",
          result.error?.message ?? result.error
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage?.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    return `${date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    })}, ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}`;
  };

  const renderConversationAvatar = (conversation: Conversation) => {
    const lastMsg = conversation.lastMessage;
    const avatarImage = lastMsg?.sender_image ?? null;
    const fallbackName = lastMsg?.sender_name ?? conversation.name ?? "";
    const initial =
      fallbackName.trim().charAt(0).toUpperCase() || "U";

    if (avatarImage) {
      return (
        <img
          src={avatarImage}
          alt={`Avatar of ${lastMsg?.sender_name ?? conversation.name}`}
          className={styles.avatarImage}
        />
      );
    }

    return <span className={styles.avatarInitial}>{initial}</span>;
  };

  const renderMessageAvatar = (message: Message) => {
    const initial = message.sender_name
      ? message.sender_name.trim().charAt(0).toUpperCase() || "U"
      : "U";

    const iconType = message.is_bot ? "bot" : message.is_staff ? "staff" : null;

    return (
      <>
        {message.sender_image ? (
          <img
            src={message.sender_image}
            alt={`Avatar of ${message.sender_name}`}
            className={styles.avatarImage}
          />
        ) : (
          <span className={styles.avatarInitial}>{initial}</span>
        )}
        {iconType && (
          <span
            className={`${styles.avatarBadge} ${
              iconType === "bot" ? styles.botBadge : styles.staffBadge
            }`}
          >
            {iconType === "bot" ? <FaRobot /> : <FaUser />}
          </span>
        )}
      </>
    );
  };


  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <LuLoaderCircle
            className={`${styles.loadingSpinner} animate-spin`}
          />
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.conversationsLayout}
      >
        {/* Conversations Sidebar */}
        <div className={styles.conversationsSidebar}>
          <div className={styles.sidebarHeader}>
            <h2>Conversations</h2>
            <div className={styles.searchContainer}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.conversationsList}>
            {filteredConversations.map((conversation) => (
              <motion.div
                key={conversation.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`${styles.conversationItem} ${
                  selectedConversation?.id === conversation.id
                    ? styles.active
                    : ""
                }`}
                onClick={() => handleConversationSelect(conversation)}
              >
                <div className={styles.conversationAvatar}>
                  {renderConversationAvatar(conversation)}
                </div>
                <div className={styles.conversationInfo}>
                  <div className={styles.conversationHeader}>
                    <h4 className={styles.conversationName}>
                      {conversation.name}
                    </h4>
                    <span className={styles.conversationTime}>
                      {formatTime(conversation.updated_at)}
                    </span>
                  </div>
                  <div className={styles.conversationPreview}>
                    <p className={styles.propertyName}>
                      {conversation.property.name}
                    </p>
                    {conversation.lastMessage && (
                      <div className={styles.lastMessage}>
                        {conversation.lastMessage.is_bot && (
                          <FaRobot className={styles.botIcon} />
                        )}
                        {conversation.lastMessage.is_staff && (
                          <FaUser className={styles.staffIcon} />
                        )}
                        <span className={styles.messageText}>
                          {conversation.lastMessage.message}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {conversation.unreadCount && conversation.unreadCount > 0 && (
                  <div className={styles.unreadBadge}>
                    {conversation.unreadCount}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className={styles.chatArea}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className={styles.chatHeader}>
                <div className={styles.chatHeaderInfo}>
                  <div className={styles.chatAvatar}>
                    <FaUserCircle />
                  </div>
                  <div>
                    <h3>{selectedConversation.name}</h3>
                    <p className={styles.propertyInfo}>
                      {selectedConversation.property.name}
                    </p>
                  </div>
                </div>
                <div className={styles.chatActions}>
                  <button className={styles.actionButton}>
                    <FaPhone />
                  </button>
                  <button className={styles.actionButton}>
                    <FaVideo />
                  </button>
                  <button className={styles.actionButton}>
                    <FaInfo /> ehh
                  </button>
                  <button className={styles.actionButton}>
                    <FaEllipsisV />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className={styles.messagesArea}>
                {loadingMessages ? (
                  <div className={styles.messagesLoading}>
                    <LuLoaderCircle
                      className={`${styles.loadingSpinner} animate-spin`}
                    />
                    <p>Loading messages...</p>
                  </div>
                ) : (
                  <div className={styles.messagesList}>
                    {messages.map((message) => {
                      const messageContent = (
                        <div className={styles.messageContent}>
                          <div className={styles.messageHeader}>
                            <span className={styles.senderName}>
                              {message.sender_name}
                            </span>
                            <span className={styles.messageTime}>
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                          <div className={styles.messageBubble}>
                            <p>{message.message}</p>
                            {message.is_staff && (
                              <div className={styles.messageStatus}>
                                <IoCheckmarkDoneSharp
                                  className={styles.readIcon}
                                />
                              </div>
                            )}
                          </div>
                          {message.manuel_action_required && (
                            <div className={styles.actionRequired}>
                              <span>⚠️ Manual action required</span>
                            </div>
                          )}
                        </div>
                      );

                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`${styles.messageItem} ${
                            message.is_staff ? styles.sent : styles.received
                          }`}
                        >
                          {message.is_staff ? (
                            <>
                              {messageContent}
                              <div className={styles.messageAvatar}>
                                {renderMessageAvatar(message)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className={styles.messageAvatar}>
                                {renderMessageAvatar(message)}
                              </div>
                              {messageContent}
                            </>
                          )}
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className={styles.messageInput}>
                <Card>
                  <CardContent className={styles.inputCard}>
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleSendMessage()
                      }
                      className={styles.textInput}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className={styles.sendButton}
                    >
                      <FaPaperPlane />
                    </button>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <LuLoaderCircle className={styles.emptyIcon} />
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ConversationsContent;

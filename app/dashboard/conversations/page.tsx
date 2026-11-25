"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { FaUser, FaSearch } from "react-icons/fa";
import {
  LuBot,
  LuBrain,
  LuFrown,
  LuLightbulb,
  LuSmile,
  LuClipboardList,
  LuShield,
  LuRadar,
  LuPlus,
  LuGift,
  LuClock,
  LuCalendar,
  LuBan,
  LuPenLine,
  LuTrash2,
  LuX,
  LuSend,
  LuCirclePause,
  LuCirclePlay,
  LuLoaderCircle,
  LuDot,
} from "react-icons/lu";
import { FiFilter } from "react-icons/fi";
import { TbCheckbox } from "react-icons/tb";
import { HiOutlineExclamation } from "react-icons/hi";

import { Card, CardContent } from "@/components/ui/card";
import styles from "@/styles/app/dashboard/Conversations.module.scss";
import { retrieveUserWorkspaceState } from "@/lib/server/workspace";
import { conversationsService } from "@/lib/services/conversations.service";
import { propertiesService } from "@/lib/services/properties.service";
import {
  Conversation,
  ConversationAnalytics,
  Message,
  Property,
  RequestPreference,
} from "@/types/api";
import AiBreadcrumb from "@/components/app/ai/AiBreadcrumb";
import PageGreeting from "@/components/ui/PageGreeting";

type PauseDuration = "1_hour" | "8_hours" | "until_checkout" | "indefinitely";

const getConversationReservationId = (
  reservation: Conversation["reservation"]
) => {
  const reservationId = Number(reservation);
  return Number.isFinite(reservationId) ? reservationId : null;
};

const formatReadableLabel = (value?: string | null) =>
  value
    ? value
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "";

const decodeEscapedText = (value?: string | null) => {
  if (!value) return "";

  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    )
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
};

const normalizeConversation = (conversation: Conversation) => {
  const raw = conversation as any;
  return {
    ...conversation,
    lastMessage:
      raw.lastMessage ?? raw.last_message ?? conversation.lastMessage,
    unreadCount:
      raw.unreadCount ?? raw.unread_count ?? conversation.unreadCount ?? 0,
  };
};

export default function ConversationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [timeNow, setTimeNow] = useState(() => Date.now());
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });
  const [mobileView, setMobileView] = useState<"list" | "chat" | "ai">("list");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsPage, setConversationsPage] = useState(1);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] =
    useState(false);
  const [totalConversations, setTotalConversations] = useState(0);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState("");
  const [selectedPropertyFilterName, setSelectedPropertyFilterName] =
    useState("");
  const [draftPropertyFilter, setDraftPropertyFilter] = useState("");
  const [draftPropertyFilterName, setDraftPropertyFilterName] = useState("");
  const [propertySearchTerm, setPropertySearchTerm] = useState("");
  const [propertyOptions, setPropertyOptions] = useState<
    Pick<Property, "id" | "name">[]
  >([]);
  const [loadingPropertyOptions, setLoadingPropertyOptions] = useState(false);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [messageFilter, setMessageFilter] = useState<
    "all" | "bot" | "staff" | "guest" | "action_required"
  >("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationsListRef = useRef<HTMLDivElement>(null);
  const pauseMenuRef = useRef<HTMLDivElement>(null);
  const propertyMenuRef = useRef<HTMLDivElement | null>(null);
  const workspaceIdRef = useRef<number | null>(null);
  const workspaceIdRequestRef = useRef<Promise<number | null> | null>(null);
  const conversationsRequestRef = useRef(0);
  const loadingMoreConversationsRef = useRef(false);
  const messagesRequestRef = useRef(0);
  const specialRequestsRequestRef = useRef(0);
  const propertyOptionsLoadedRef = useRef(false);
  const pendingSelectionRef = useRef<number | null>(null);
  const shouldScrollToLatestRef = useRef(false);
  const scrollBehaviorRef = useRef<ScrollBehavior>("auto");
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);
  const [isBotPaused, setIsBotPaused] = useState(false);
  const [pauseSubmitting, setPauseSubmitting] = useState(false);
  const [resumeSubmitting, setResumeSubmitting] = useState(false);
  const [reservationLookupComplete, setReservationLookupComplete] =
    useState(false);
  const [conversationAnalytics, setConversationAnalytics] =
    useState<ConversationAnalytics | null>(null);
  const [loadingConversationAnalytics, setLoadingConversationAnalytics] =
    useState(false);
  const [specialRequests, setSpecialRequests] = useState<RequestPreference[]>(
    []
  );
  const [loadingSpecialRequests, setLoadingSpecialRequests] = useState(false);
  const [specialRequestInput, setSpecialRequestInput] = useState("");
  const [specialRequestSubmitting, setSpecialRequestSubmitting] =
    useState(false);
  const [editingSpecialRequestId, setEditingSpecialRequestId] = useState<
    number | string | null
  >(null);
  const [editingSpecialRequestText, setEditingSpecialRequestText] =
    useState("");
  const [specialRequestPendingIds, setSpecialRequestPendingIds] = useState<
    Set<string>
  >(() => new Set());
  const [suggestedDraft, setSuggestedDraft] = useState("");
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [isPropertyMenuOpen, setIsPropertyMenuOpen] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [selectedPropertyFilter]);

  const reservationParam = searchParams.get("id");
  const targetReservationId = reservationParam ? Number(reservationParam) : null;
  const hasReservationQuery =
    reservationParam !== null &&
    reservationParam !== "" &&
    Number.isFinite(targetReservationId);

  useEffect(() => {
    if (conversations.length === 0) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    setSelectedConversation((prev) => {
      const pendingSelectionId = pendingSelectionRef.current;
      if (pendingSelectionId && prev?.id === pendingSelectionId) {
        const pendingReservationId = getConversationReservationId(
          prev.reservation
        );
        if (!hasReservationQuery || pendingReservationId === targetReservationId) {
          pendingSelectionRef.current = null;
        } else {
          setReservationLookupComplete(true);
          return prev;
        }
      }

      if (hasReservationQuery && targetReservationId !== null) {
        const reservationMatch = conversations.find(
          (conv) => getConversationReservationId(conv.reservation) === targetReservationId
        );

        if (reservationMatch) {
          if (!prev || prev.id !== reservationMatch.id) {
            setMessageFilter("all");
            shouldScrollToLatestRef.current = true;
            scrollBehaviorRef.current = "auto";
            loadMessages(reservationMatch.id);
          }
          setReservationLookupComplete(true);
          return reservationMatch;
        }

        setReservationLookupComplete(false);
        setMessages([]);
        return null;
      }

      const match = prev
        ? conversations.find((conv) => conv.id === prev.id)
        : null;
      const next = match ?? conversations[0];
      if (!prev || !match) {
        setMessageFilter("all");
        shouldScrollToLatestRef.current = true;
        scrollBehaviorRef.current = "auto";
        loadMessages(next.id);
      }
      setReservationLookupComplete(true);
      return next;
    });
  }, [conversations, hasReservationQuery, targetReservationId]);

  useEffect(() => {
    if (!hasReservationQuery || !targetReservationId) {
      setReservationLookupComplete(true);
      return;
    }

    const existingMatch = conversations.find(
      (conv) => getConversationReservationId(conv.reservation) === targetReservationId
    );
    if (existingMatch) {
      setReservationLookupComplete(true);
      return;
    }

    let isCancelled = false;

    const loadConversationByReservation = async () => {
      const wsId = await resolveWorkspaceId();
      if (!wsId) {
        if (!isCancelled) setReservationLookupComplete(true);
        return;
      }

      const result = await conversationsService.getConversations(wsId, {
        reservation_id: targetReservationId,
        page: 1,
        page_size: 1,
        ordering: "-updated_at",
      });

      if (isCancelled) return;

      if (result.success && result.data?.results?.length) {
        const normalizedConversation = normalizeConversation(
          result.data.results[0]
        );

        setConversations((prev) => {
          if (prev.some((conv) => conv.id === normalizedConversation.id)) {
            return prev;
          }
          return [normalizedConversation, ...prev];
        });
      } else {
        setSelectedConversation(null);
        setMessages([]);
        setReservationLookupComplete(true);
      }
    };

    loadConversationByReservation();

    return () => {
      isCancelled = true;
    };
  }, [conversations, hasReservationQuery, targetReservationId]);

  useEffect(() => {
    setIsBotPaused(isPauseActive(selectedConversation?.pause_bot_until));
    setPauseMenuOpen(false);
  }, [selectedConversation?.id, selectedConversation?.pause_bot_until, timeNow]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeNow(Date.now());
    }, 10 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      loadConversations(true);
    }, 60_000);
    return () => clearInterval(interval);
  }, [selectedPropertyFilter]);

  useEffect(() => {
    if (!selectedConversation) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      loadMessages(selectedConversation.id, true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (!selectedConversation) {
      setConversationAnalytics(null);
      setSpecialRequests([]);
      setSpecialRequestInput("");
      setEditingSpecialRequestId(null);
      setEditingSpecialRequestText("");
      setSpecialRequestPendingIds(new Set());
      setNewMessage("");
      setSuggestedDraft("");
      setSummaryModalOpen(false);
      return;
    }

    let isCancelled = false;

    setNewMessage("");
    setSuggestedDraft("");
    setSummaryModalOpen(false);
    setSpecialRequestInput("");
    setEditingSpecialRequestId(null);
    setEditingSpecialRequestText("");
    setSpecialRequestPendingIds(new Set());

    const loadConversationAnalytics = async () => {
      setLoadingConversationAnalytics(true);
      try {
        const wsId = await resolveWorkspaceId();
        if (!wsId || isCancelled) return;

        const result = await conversationsService.getConversationAnalytics(
          wsId,
          selectedConversation.id
        );

        if (isCancelled) return;

        if (result.success && result.data) {
          setConversationAnalytics(result.data);
          const nextSuggestedDraft =
            result.data.response_suggestion?.status === "draft_ready" &&
            result.data.response_suggestion.draft
              ? decodeEscapedText(result.data.response_suggestion.draft)
              : "";
          setSuggestedDraft(nextSuggestedDraft);
        } else {
          console.error(
            "Failed to load conversation analytics:",
            result.error?.message ?? result.error
          );
          setConversationAnalytics(null);
          setNewMessage("");
          setSuggestedDraft("");
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Error loading conversation analytics:", error);
          setConversationAnalytics(null);
          setNewMessage("");
          setSuggestedDraft("");
        }
      } finally {
        if (!isCancelled) {
          setLoadingConversationAnalytics(false);
        }
      }
    };

    loadConversationAnalytics();

    return () => {
      isCancelled = true;
    };
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (!selectedConversation) return;
    loadSpecialRequests(selectedConversation.id);
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (
      !selectedConversation ||
      loadingMessages ||
      !shouldScrollToLatestRef.current
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: scrollBehaviorRef.current,
        block: "end",
      });
      shouldScrollToLatestRef.current = false;
      scrollBehaviorRef.current = "auto";
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, loadingMessages, selectedConversation]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const updateFromMatch = (matches: boolean) => {
      setIsMobile(matches);
      if (!matches) {
        setMobileView("list");
      }
    };

    updateFromMatch(mediaQuery.matches);
    const listener = (event: MediaQueryListEvent) => updateFromMatch(event.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", listener);
    } else {
      mediaQuery.addListener(listener);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", listener);
      } else {
        mediaQuery.removeListener(listener);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pauseMenuRef.current &&
        !pauseMenuRef.current.contains(event.target as Node)
      ) {
        setPauseMenuOpen(false);
      }
    };
    if (pauseMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pauseMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        propertyMenuRef.current &&
        !propertyMenuRef.current.contains(event.target as Node)
      ) {
        setIsPropertyMenuOpen(false);
      }
    };
    if (isPropertyMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPropertyMenuOpen]);

  useEffect(() => {
    if (!filtersModalOpen) return;
    if (propertyOptionsLoadedRef.current) return;

    let isCancelled = false;

    const loadPropertyOptions = async () => {
      setLoadingPropertyOptions(true);
      try {
        const wsId = await resolveWorkspaceId();
        if (!wsId || isCancelled) return;

        const result = await propertiesService.getAllProperties(wsId);

        if (isCancelled) return;

        if (result.success && result.data) {
          propertyOptionsLoadedRef.current = true;
          setPropertyOptions(
            result.data
              .map((property) => ({
                id: property.id,
                name: property.name,
              }))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
        } else {
          console.error(
            "Failed to load property filter options:",
            result.error?.message ?? result.error
          );
          setPropertyOptions([]);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Error loading property filter options:", error);
          setPropertyOptions([]);
        }
      } finally {
        if (!isCancelled) {
          setLoadingPropertyOptions(false);
        }
      }
    };

    loadPropertyOptions();

    return () => {
      isCancelled = true;
    };
  }, [filtersModalOpen]);

  const resolveWorkspaceId = async (): Promise<number | null> => {
    if (workspaceIdRef.current) return workspaceIdRef.current;
    if (!workspaceIdRequestRef.current) {
      workspaceIdRequestRef.current = retrieveUserWorkspaceState()
        .then(({ currentWorkspace }) => {
          workspaceIdRef.current = currentWorkspace.id;
          return currentWorkspace.id;
        })
        .catch((error) => {
          console.error("Failed to resolve workspace:", error);
          return null;
        })
        .finally(() => {
          workspaceIdRequestRef.current = null;
        });
    }

    return workspaceIdRequestRef.current;
  };

  const isPauseActive = (pauseUntil?: string | null) => {
    if (!pauseUntil) return false;

    const pauseDate = new Date(pauseUntil);
    if (Number.isNaN(pauseDate.getTime())) {
      return true;
    }

    return pauseDate.getTime() > timeNow;
  };

  const buildConversationListFilters = (page: number) => ({
    page,
    page_size: 20,
    ordering: "-updated_at",
    property_id: selectedPropertyFilter
      ? Number(selectedPropertyFilter)
      : undefined,
  });

  const loadConversations = async (silent = false) => {
    const requestId = ++conversationsRequestRef.current;
    try {
      if (!silent) setLoading(true);
      setConversationsPage(1);
      const wsId = await resolveWorkspaceId();
      if (!wsId) {
        if (requestId === conversationsRequestRef.current) {
          setConversations([]);
          setHasMoreConversations(false);
          setTotalConversations(0);
        }
        return;
      }
      const result = await conversationsService.getConversations(
        wsId,
        buildConversationListFilters(1)
      );

      if (requestId !== conversationsRequestRef.current) return;

      if (result.success && result.data) {
        const conversationsWithExtras = (result.data.results ?? []).map(
          normalizeConversation
        );
        setConversations(conversationsWithExtras);
        setTotalConversations(result.data.count ?? 0);
        setHasMoreConversations(
          conversationsWithExtras.length < (result.data.count ?? 0)
        );
      } else {
        console.error(
          "Failed to load conversations:",
          result.error?.message ?? result.error
        );
      }
    } catch (error) {
      if (requestId === conversationsRequestRef.current) {
        console.error("Error loading conversations:", error);
      }
    } finally {
      if (requestId === conversationsRequestRef.current && !silent) {
        setLoading(false);
      }
    }
  };

  const handlePauseBot = async (duration: PauseDuration) => {
    if (!selectedConversation || pauseSubmitting) return;
    setPauseSubmitting(true);
    try {
      const wsId = await resolveWorkspaceId();
      if (!wsId) return;
      const result = await conversationsService.pauseBot(wsId, selectedConversation.id, {
        duration,
      });
      if (result.success) {
        setIsBotPaused(true);
        setPauseMenuOpen(false);
      } else {
        console.error("Failed to pause bot:", result.error?.message ?? result.error);
      }
    } catch (error) {
      console.error("Error pausing bot:", error);
    } finally {
      setPauseSubmitting(false);
    }
  };

  const handleResumeBot = async () => {
    if (!selectedConversation || resumeSubmitting) return;
    setResumeSubmitting(true);
    try {
      const wsId = await resolveWorkspaceId();
      if (!wsId) return;
      const result = await conversationsService.resumeBot(wsId, selectedConversation.id);
      if (result.success) {
        setIsBotPaused(false);
      } else {
        console.error("Failed to resume bot:", result.error?.message ?? result.error);
      }
    } catch (error) {
      console.error("Error resuming bot:", error);
    } finally {
      setResumeSubmitting(false);
    }
  };

  const loadMessages = async (conversationId: number, silent = false) => {
    const requestId = ++messagesRequestRef.current;
    try {
      if (!silent) setLoadingMessages(true);
      const wsId = await resolveWorkspaceId();
      if (!wsId) {
        if (requestId === messagesRequestRef.current) {
          setMessages([]);
        }
        return;
      }
      const result = await conversationsService.getMessages(wsId, conversationId, {
        page_size: 200,
        ordering: "created_at",
      });

      if (requestId !== messagesRequestRef.current) return;

      if (result.success && result.data) {
        const fetchedMessages = result.data.results ?? [];
        setMessages(fetchedMessages);
        if (fetchedMessages.length > 0) {
          const latest = fetchedMessages[fetchedMessages.length - 1];
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === conversationId ? { ...conv, lastMessage: latest } : conv
            )
          );
          setSelectedConversation((prev) =>
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
      if (requestId === messagesRequestRef.current) {
        console.error("Error loading messages:", error);
        setMessages([]);
      }
    } finally {
      if (!silent) {
        setLoadingMessages(false);
      }
    }
  };

  const setSpecialRequestPending = (
    requestId: number | string,
    isPending: boolean
  ) => {
    const key = String(requestId);
    setSpecialRequestPendingIds((prev) => {
      const next = new Set(prev);
      if (isPending) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const loadSpecialRequests = async (conversationId: number) => {
    const requestId = ++specialRequestsRequestRef.current;
    try {
      setLoadingSpecialRequests(true);
      const wsId = await resolveWorkspaceId();
      if (!wsId) {
        if (requestId === specialRequestsRequestRef.current) {
          setSpecialRequests([]);
        }
        return;
      }

      const result = await conversationsService.getConversationRequests(
        wsId,
        conversationId,
        {
          page_size: 100,
          ordering: "-created_at",
        }
      );

      if (requestId !== specialRequestsRequestRef.current) return;

      if (result.success && result.data) {
        setSpecialRequests(result.data.results ?? []);
      } else {
        console.error(
          "Failed to load conversation requests:",
          result.error?.message ?? result.error
        );
        setSpecialRequests([]);
      }
    } catch (error) {
      if (requestId === specialRequestsRequestRef.current) {
        console.error("Error loading conversation requests:", error);
        setSpecialRequests([]);
      }
    } finally {
      if (requestId === specialRequestsRequestRef.current) {
        setLoadingSpecialRequests(false);
      }
    }
  };

  const handleAddSpecialRequest = async () => {
    const text = specialRequestInput.trim();
    if (!text || !selectedConversation || specialRequestSubmitting) return;

    try {
      setSpecialRequestSubmitting(true);
      const wsId = await resolveWorkspaceId();
      if (!wsId) return;

      const result = await conversationsService.createConversationRequest(
        wsId,
        selectedConversation.id,
        {
          text,
          evidence: text,
          source: "host",
          is_resolved: false,
        }
      );

      if (result.success && result.data) {
        setSpecialRequests((prev) => [result.data!, ...prev]);
        setSpecialRequestInput("");
      } else {
        console.error(
          "Failed to create conversation request:",
          result.error?.message ?? result.error
        );
      }
    } catch (error) {
      console.error("Error creating conversation request:", error);
    } finally {
      setSpecialRequestSubmitting(false);
    }
  };

  const handleStartEditSpecialRequest = (item: RequestPreference) => {
    setEditingSpecialRequestId(item.id);
    setEditingSpecialRequestText(item.text);
  };

  const handleCancelEditSpecialRequest = () => {
    setEditingSpecialRequestId(null);
    setEditingSpecialRequestText("");
  };

  const handleSaveSpecialRequest = async (item: RequestPreference) => {
    const text = editingSpecialRequestText.trim();
    if (!text || !selectedConversation) return;

    setSpecialRequestPending(item.id, true);
    try {
      const wsId = await resolveWorkspaceId();
      if (!wsId) return;

      const result = await conversationsService.partialUpdateConversationRequest(
        wsId,
        selectedConversation.id,
        item.id,
        { text }
      );

      if (result.success && result.data) {
        setSpecialRequests((prev) =>
          prev.map((request) =>
            request.id === item.id ? result.data! : request
          )
        );
        handleCancelEditSpecialRequest();
      } else {
        console.error(
          "Failed to update conversation request:",
          result.error?.message ?? result.error
        );
      }
    } catch (error) {
      console.error("Error updating conversation request:", error);
    } finally {
      setSpecialRequestPending(item.id, false);
    }
  };

  const handleResolveSpecialRequest = async (item: RequestPreference) => {
    if (!selectedConversation || item.is_resolved) return;

    setSpecialRequestPending(item.id, true);
    try {
      const wsId = await resolveWorkspaceId();
      if (!wsId) return;

      const result = await conversationsService.partialUpdateConversationRequest(
        wsId,
        selectedConversation.id,
        item.id,
        { is_resolved: true }
      );

      if (result.success && result.data) {
        setSpecialRequests((prev) =>
          prev.map((request) =>
            request.id === item.id ? result.data! : request
          )
        );
      } else {
        console.error(
          "Failed to resolve conversation request:",
          result.error?.message ?? result.error
        );
      }
    } catch (error) {
      console.error("Error resolving conversation request:", error);
    } finally {
      setSpecialRequestPending(item.id, false);
    }
  };

  const handleDeleteSpecialRequest = async (item: RequestPreference) => {
    if (!selectedConversation) return;

    setSpecialRequestPending(item.id, true);
    try {
      const wsId = await resolveWorkspaceId();
      if (!wsId) return;

      const result = await conversationsService.deleteConversationRequest(
        wsId,
        selectedConversation.id,
        item.id
      );

      if (result.success) {
        setSpecialRequests((prev) =>
          prev.filter((request) => request.id !== item.id)
        );
        if (editingSpecialRequestId === item.id) {
          handleCancelEditSpecialRequest();
        }
      } else {
        console.error(
          "Failed to delete conversation request:",
          result.error?.message ?? result.error
        );
      }
    } catch (error) {
      console.error("Error deleting conversation request:", error);
    } finally {
      setSpecialRequestPending(item.id, false);
    }
  };

  const loadMoreConversations = async () => {
    if (loadingMoreConversationsRef.current || !hasMoreConversations) return;
    loadingMoreConversationsRef.current = true;
    const baseRequestId = conversationsRequestRef.current;
    const nextPage = conversationsPage + 1;
    try {
      setLoadingMoreConversations(true);
      const wsId = await resolveWorkspaceId();
      if (!wsId) return;
      const result = await conversationsService.getConversations(
        wsId,
        buildConversationListFilters(nextPage)
      );
      if (baseRequestId !== conversationsRequestRef.current) return;
      if (result.success && result.data) {
        const conversationsWithExtras = (result.data.results ?? []).map(
          normalizeConversation
        );
        const totalCount = result.data.count ?? totalConversations;
        setTotalConversations(totalCount);
        setConversations((prev) => {
          const merged = [...prev, ...conversationsWithExtras];
          setHasMoreConversations(merged.length < totalCount);
          return merged;
        });
        setConversationsPage(nextPage);
      }
    } catch (error) {
      console.error("Error loading more conversations:", error);
    } finally {
      loadingMoreConversationsRef.current = false;
      setLoadingMoreConversations(false);
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    if (selectedConversation?.id === conversation.id) return;
    pendingSelectionRef.current = conversation.id;
    setSelectedConversation(conversation);
    setMessageFilter("all");
    shouldScrollToLatestRef.current = true;
    scrollBehaviorRef.current = "auto";
    loadMessages(conversation.id);
    const nextReservationId = getConversationReservationId(
      conversation.reservation
    );
    router.replace(
      nextReservationId
        ? `/dashboard/conversations?id=${nextReservationId}`
        : "/dashboard/conversations"
    );
    if (isMobile) {
      setMobileView("chat");
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c))
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
        setMessages((prev) => [...prev, createdMessage]);
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversation.id
              ? { ...conv, lastMessage: createdMessage }
              : conv
          )
        );
        setSelectedConversation((prev) =>
          prev && prev.id === selectedConversation.id
            ? { ...prev, lastMessage: createdMessage }
            : prev
        );
        setNewMessage("");

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

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const activeConversationFilterCount = selectedPropertyFilter ? 1 : 0;
  const filteredPropertyOptions = useMemo(() => {
    const query = propertySearchTerm.trim().toLowerCase();
    if (!query) return propertyOptions;
    return propertyOptions.filter((property) =>
      property.name.toLowerCase().includes(query)
    );
  }, [propertyOptions, propertySearchTerm]);
  const filteredConversations = useMemo(
    () =>
      conversations.filter((conv) => {
        return (
          !normalizedSearchTerm ||
          conv.name.toLowerCase().includes(normalizedSearchTerm) ||
          conv.property.name.toLowerCase().includes(normalizedSearchTerm) ||
          Boolean(
            conv.lastMessage?.message
              .toLowerCase()
              .includes(normalizedSearchTerm)
          )
        );
      }),
    [conversations, normalizedSearchTerm]
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
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

  const filterMessageByStatus = (message: Message) => {
    switch (messageFilter) {
      case "bot":
        return message.is_bot;
      case "staff":
        return message.is_staff;
      case "guest":
        return !message.is_bot && !message.is_staff;
      case "action_required":
        return Boolean(message.manuel_action_required);
      case "all":
      default:
        return true;
    }
  };

  const visibleMessages = useMemo(
    () => messages.filter(filterMessageByStatus),
    [messages, messageFilter]
  );
  const sentimentTrend =
    conversationAnalytics?.satisfaction?.satisfaction_trend
      ?.toLowerCase()
      .includes("declin")
      ? "down"
      : "up";
  const sentimentValue = Math.max(
    0,
    Math.min(
      100,
      Number(
        conversationAnalytics?.satisfaction?.overall_satisfaction ??
          conversationAnalytics?.satisfaction?.final_satisfaction ??
          conversationAnalytics?.sentiments?.[0]?.score ??
          0
      )
    )
  );
  const isTrendDown = sentimentTrend === "down";
  const sentimentLabel = conversationAnalytics?.satisfaction
    ? "Overall Satisfaction"
    : "Live Sentiment";
  const trendText =
    conversationAnalytics?.satisfaction?.satisfaction_trend ||
    (isTrendDown ? "Trending Down" : "Trending Up");
  const isPropertyBotPaused = isPauseActive(
    selectedConversation?.property?.pause_bot_until
  );
  const isDetailsPaused = isBotPaused || isPropertyBotPaused;
  const showDetailsSidebar = Boolean(
    selectedConversation && conversations.length > 0
  );
  const hasUnavailableReservationSelection =
    hasReservationQuery &&
    reservationLookupComplete &&
    !selectedConversation;
  const displayIssues = conversationAnalytics?.issues ?? [];
  const displayRisks = useMemo(
    () => [
      ...(conversationAnalytics?.risks ?? []).map((risk) => ({
        id: `risk-${risk.id}`,
        title: formatReadableLabel(risk.risk_type),
        detail: risk.evidence || risk.recommended_action || risk.risk_level,
        score: Math.max(0, Math.min(100, Number(risk.risk_score ?? 0))),
        tone:
          String(risk.risk_level).toLowerCase() === "high" ||
          Number(risk.risk_score ?? 0) >= 70
            ? "danger"
            : "warn",
      })),
      ...(conversationAnalytics?.financial_risks ?? []).map((risk) => ({
        id: `financial-risk-${risk.id}`,
        title: formatReadableLabel(risk.risk_type),
        detail:
          risk.recommendation ||
          risk.evidence ||
          `${risk.amount} ${risk.currency}`,
        score: Math.max(0, Math.min(100, Number(risk.risk_score ?? 0))),
        tone:
          String(risk.exposure_level).toLowerCase() === "high" ||
          Number(risk.risk_score ?? 0) >= 70
            ? "danger"
            : "warn",
      })),
    ],
    [conversationAnalytics?.risks, conversationAnalytics?.financial_risks]
  );
  const personalityTags = useMemo(
    () =>
      Array.from(
        new Set(
          [
            conversationAnalytics?.guest_profile?.personality_type,
            conversationAnalytics?.guest_profile?.communication_style,
            ...(conversationAnalytics?.guest_profile?.tone_descriptors
              ? (
                  Array.isArray(
                    conversationAnalytics.guest_profile.tone_descriptors
                  )
                    ? conversationAnalytics.guest_profile.tone_descriptors
                    : conversationAnalytics.guest_profile.tone_descriptors.split(
                        ","
                      )
                )
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              : []),
          ]
            .map((tag) => tag?.trim())
            .filter(Boolean)
        )
      ),
    [conversationAnalytics?.guest_profile]
  );
  const urgencyLevel = conversationAnalytics?.analysis?.urgency?.trim() ?? "";
  const showUrgencySegment = Boolean(
    urgencyLevel && urgencyLevel.toLowerCase() !== "none"
  );
  const requiresImmediateAction = Boolean(
    conversationAnalytics?.analysis?.requires_immediate_action
  );
  const requiredEscalation = Boolean(
    conversationAnalytics?.analysis?.required_escalation
  );

  const renderSummaryText = (text: string) => {
    const renderInlineText = (line: string, lineKey: string) =>
      line.split(/(\*\*.+?\*\*)/g).map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={`${lineKey}-strong-${index}`}>{part.slice(2, -2)}</strong>;
        }

        return <React.Fragment key={`${lineKey}-text-${index}`}>{part}</React.Fragment>;
      });

    return text.split("\n").map((line, index) => {
      const lineKey = `summary-line-${index}`;
      const bulletMatch = line.match(/^\s*\*\s+(.*)$/);

      if (!line.trim()) {
        return <div key={lineKey} className={styles.summaryModalSpacer} />;
      }

      if (bulletMatch) {
        return (
          <div key={lineKey} className={styles.summaryModalBullet}>
            <LuDot className={styles.summaryModalBulletIcon} />
            <span>{renderInlineText(bulletMatch[1], lineKey)}</span>
          </div>
        );
      }

      return (
        <div key={lineKey} className={styles.summaryModalLine}>
          {renderInlineText(line, lineKey)}
        </div>
      );
    });
  };

  const handleConversationScroll = () => {
    const list = conversationsListRef.current;
    if (!list || loadingMoreConversations || !hasMoreConversations) return;
    const nearBottom =
      list.scrollTop + list.clientHeight >= list.scrollHeight - 40;
    if (nearBottom) {
      loadMoreConversations();
    }
  };

  const messageFilterOptions: Array<{
    id: typeof messageFilter;
    label: string;
  }> = [
    { id: "all", label: "All" },
    { id: "bot", label: "Bot Replies" },
    { id: "staff", label: "Staff Replies" },
    { id: "guest", label: "Guest Messages" },
    { id: "action_required", label: "Needs Action" },
  ];

  const renderConversationAvatar = (conversation: Conversation) => {
    const lastMsg = conversation.lastMessage;
    const guestImage = lastMsg?.sender_image;
    const propertyImage = conversation.property?.images?.[0]?.image;
    const guestName = lastMsg?.sender_name ?? conversation.name ?? "";
    const guestInitial = guestName.trim().charAt(0).toUpperCase() || "U";

    return (
      <div className={styles.avatarWrapper}>
        {propertyImage ? (
          <img
            src={propertyImage}
            alt={`Property ${conversation.property?.name}`}
            className={styles.propertyImage}
          />
        ) : (
          <div className={styles.avatarInitial}>{guestInitial}</div>
        )}

        <div className={styles.guestOverlay}>
          {guestImage ? (
            <img
              src={guestImage}
              alt={`Guest ${guestName}`}
              className={styles.guestImage}
            />
          ) : (
            <span className={styles.guestInitial}>{guestInitial}</span>
          )}
        </div>
      </div>
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
    <>
      <div className={styles.pageHeader}>
        <PageGreeting
          subtitle="Guest Messages"
          className={styles.pageHeaderText}
        />
        <div className={styles.pageHeaderNav}>
          <AiBreadcrumb />
        </div>
      </div>
      <div className={styles.container}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.conversationsLayout}
        >
          {/* Left Sidebar */}
          <div
            className={`${styles.conversationsSidebar} ${
              isMobile && mobileView !== "list" ? styles.mobileHidden : ""
            }`}
          >
          <div className={styles.sidebarHeader}>
            <button
              type="button"
              className={styles.sidebarFilterButton}
              onClick={() => {
                setDraftPropertyFilter(selectedPropertyFilter);
                setDraftPropertyFilterName(selectedPropertyFilterName);
                setPropertySearchTerm("");
                setIsPropertyMenuOpen(false);
                setFiltersModalOpen(true);
              }}
            >
              <FiFilter aria-hidden="true" />
              <span>Filter</span>
              {activeConversationFilterCount > 0 && (
                <span className={styles.sidebarFilterCount}>
                  {activeConversationFilterCount}
                </span>
              )}
            </button>
            {/* 
            <div className={styles.searchContainer}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search on Chat"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.searchFilters}>
              {messageFilterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMessageFilter(option.id)}
                  className={`${styles.filterChip} ${
                    messageFilter === option.id
                      ? styles.filterChipActive
                      : styles.filterChipInactive
                  }`}
                  aria-pressed={messageFilter === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div> 
            */}
          </div>

          <div
            className={styles.conversationsList}
            ref={conversationsListRef}
            onScroll={handleConversationScroll}
          >
            {filteredConversations.map((conversation) => (
              <motion.div
                key={conversation.id}
                whileHover={{ scale: 1.01 }}
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
                  <p className={styles.propertyName}>
                    {conversation.property.name}
                  </p>
                </div>
                {Number(conversation.unreadCount) > 0 && (
                  <div className={styles.unreadBadge}>
                    {conversation.unreadCount}
                  </div>
                )}
              </motion.div>
            ))}
            {hasMoreConversations && (
              <button
                type="button"
                className={styles.loadMore}
                onClick={loadMoreConversations}
                disabled={loadingMoreConversations}
              >
                {loadingMoreConversations ? "Loading..." : "Load More"}
              </button>
            )}
          </div>
        </div>


        {/* Chat Area */}
        <div
          className={`${styles.chatArea} ${
            isMobile && mobileView !== "chat" ? styles.mobileHidden : ""
          }`}
        >
          {isMobile && selectedConversation ? (
            <div className={styles.mobileTopBar}>
              <button
                type="button"
                className={styles.mobileBackButton}
                onClick={() => setMobileView("list")}
              >
                Go Back
              </button>
              <button
                type="button"
                className={styles.mobileAiButton}
                onClick={() => setMobileView("ai")}
              >
                <span className={styles.detailsHeaderIcon}>
                  <LuBot />
                </span>
                AI
              </button>
            </div>
          ) : null}
          {selectedConversation ? (
            <>
              <div className={styles.chatHeader}>
                <div className={styles.chatHeaderInfo}>
                  <div className={styles.chatAvatar}>
                    {renderConversationAvatar(selectedConversation)}
                  </div>
                  <div className={styles.chatHeaderText}>
                    <span>
                      {selectedConversation.name.length > 35
                        ? `${selectedConversation.name.substring(0, 35)}...`
                        : selectedConversation.name}
                    </span>
                    <p className={styles.propertyInfo}>
                      {selectedConversation.property.name.length > 35
                        ? `${selectedConversation.property.name.substring(
                            0,
                            40
                          )}...`
                        : selectedConversation.property.name}
                    </p>
                  </div>
                </div>
              </div>

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
                    {visibleMessages.map((message) => {
                      const messageContent = (
                        <div className={styles.messageContent}>
                          <div
                            className={`${styles.messageBubble} ${
                              message.is_bot && message.is_staff
                                ? styles.bubbleBoth
                                : message.is_bot
                                  ? styles.bubbleBot
                                  : message.is_staff
                                    ? styles.bubbleStaff
                                    : styles.bubbleGuest
                            }`}
                          >
                            <div className={styles.messageMeta}>
                              <span className={styles.senderName}>
                                {message.sender_name}
                              </span>
                            </div>
                            <p>{message.message}</p>
                            <span className={styles.messageTime}>
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                          {message.manuel_action_required && (
                            <div className={styles.actionRequired}>
                              <span>
                                <HiOutlineExclamation />
                                Manual action required
                              </span>
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
                            message.is_bot || message.is_staff
                              ? styles.sent
                              : styles.received
                          }`}
                        >
                          {messageContent}
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className={styles.messageInput}>
                {suggestedDraft ? (
                  <button
                    type="button"
                    className={styles.suggestedReplyBubble}
                    onClick={() => setNewMessage(suggestedDraft)}
                  >
                    <span className={styles.suggestedReplyLabel}>
                      Suggested reply
                    </span>
                    <span className={styles.suggestedReplyText}>
                      {suggestedDraft}
                    </span>
                  </button>
                ) : null}
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
                    {newMessage.trim() ? (
                      <button
                        type="button"
                        onClick={() => setNewMessage("")}
                        className={styles.clearButton}
                        aria-label="Clear message"
                      >
                        <LuX />
                      </button>
                    ) : null}
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className={styles.sendButton}
                    >
                      <LuSend />
                    </button>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <LuLoaderCircle className={styles.emptyIcon} />
              <span>
                {hasUnavailableReservationSelection
                  ? "Please Select A Chat to View"
                  : "Select a conversation"}
              </span>
              <p>
                {hasUnavailableReservationSelection
                  ? "No Chat Available"
                  : "Choose a conversation from the sidebar to start messaging"}
              </p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        {showDetailsSidebar ? (
        <div
          className={`${styles.detailsSidebar} ${
            isDetailsPaused ? styles.detailsSidebarPaused : ""
          } ${isMobile && mobileView !== "ai" ? styles.mobileHidden : ""}
          `}
        >
          {isMobile ? (
            <div className={styles.mobileTopBar}>
              <button
                type="button"
                className={styles.mobileBackButton}
                onClick={() => setMobileView("chat")}
              >
                Go Back
              </button>
            </div>
          ) : null}
          <div className={styles.detailsHeader}>
            <div className={styles.detailsHeaderInfo}>
              <span className={styles.detailsHeaderIcon}>
                <LuBot />
              </span>
              <div>
                <p className={styles.detailsHeaderTitle}>
                  {conversationAnalytics?.analysis?.required_escalation
                    ? "Escalation Recommended"
                    : "Auto-Pilot Active"}
                </p>
                <p className={styles.detailsHeaderSub}>
                  {loadingConversationAnalytics
                    ? "Loading analytics..."
                    : conversationAnalytics
                      ? "Analytics ready"
                      : "Analytics unavailable"}
                </p>
              </div>
            </div>
            <div className={styles.pauseMenu} ref={pauseMenuRef}>
              <button
                className={styles.detailsHeaderAction}
                type="button"
                onClick={() => {
                  if (isBotPaused) {
                    handleResumeBot();
                  } else {
                    setPauseMenuOpen((prev) => !prev);
                  }
                }}
                aria-expanded={pauseMenuOpen}
                disabled={!selectedConversation || pauseSubmitting || resumeSubmitting}
              >
                {isBotPaused ? (
                  <LuCirclePlay aria-hidden="true" />
                ) : (
                  <LuCirclePause aria-hidden="true" />
                )}
                {isBotPaused ? "Resume AI" : "Pause AI"}
              </button>
              {pauseMenuOpen && !isBotPaused && (
                <div className={styles.pauseMenuPanel}>
                  <p className={styles.pauseMenuTitle}>Pause Duration</p>
                  <button
                    className={styles.pauseMenuItem}
                    type="button"
                    onClick={() => handlePauseBot("1_hour")}
                    disabled={pauseSubmitting}
                  >
                    <LuClock className={styles.pauseMenuIconWarn} />
                    1 Hour
                  </button>
                  <button
                    className={styles.pauseMenuItem}
                    type="button"
                    onClick={() => handlePauseBot("8_hours")}
                    disabled={pauseSubmitting}
                  >
                    <LuClock className={styles.pauseMenuIconWarn} />
                    8 Hours
                  </button>
                  <button
                    className={styles.pauseMenuItem}
                    type="button"
                    onClick={() => handlePauseBot("until_checkout")}
                    disabled={pauseSubmitting}
                  >
                    <LuCalendar className={styles.pauseMenuIcon} />
                    Until Checkout
                  </button>
                  <div className={styles.pauseMenuDivider} />
                  <button
                    className={`${styles.pauseMenuItem} ${styles.pauseMenuStop}`}
                    type="button"
                    onClick={() => handlePauseBot("indefinitely")}
                    disabled={pauseSubmitting}
                  >
                    <LuBan className={styles.pauseMenuIconStop} />
                    Stop Indefinitely
                  </button>
                </div>
              )}
            </div>
          </div>

          <div
            className={`${styles.detailsContent} ${
              isDetailsPaused ? styles.detailsContentPaused : ""
            }`}
            aria-hidden={isDetailsPaused}
          >
            {isDetailsPaused ? (
              <div className={styles.detailsPausedOverlay}>
                <div className={styles.detailsPausedCard}>
                  <span className={styles.detailsPausedIcon}>
                    <LuCirclePause />
                  </span>
                  {isBotPaused ? (
                    <>
                      <p className={styles.detailsPausedTitle}>Conversation AI is paused</p>
                      <p className={styles.detailsPausedText}>
                        Resume the bot to unlock guest insights and conversation
                        analysis.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className={styles.detailsPausedTitle}>Property bot is paused</p>
                      <p className={styles.detailsPausedText}>
                        This property&apos;s bot is paused. Resume it from the AI Overview
                        page or the Properties page to unlock these details.
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : null}

          <div className={styles.guest360Card}>
            <div className={styles.guest360Header}>
              <div className={styles.guest360Title}>
                <span className={styles.guest360Icon}>
                  <LuBrain />
                </span>
                <span>Guest 360°</span>
              </div>
              <div className={styles.guest360Badges}>
                {conversationAnalytics?.guest_profile?.loyalty_tier ? (
                  <span className={styles.guest360Badge}>
                    {conversationAnalytics.guest_profile.loyalty_tier}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              className={`${styles.sentimentCard} ${
                isTrendDown ? styles.trendDown : styles.trendUp
              }`}
            >
              <div className={styles.sentimentHeader}>
                <div>
                  <p className={styles.sentimentLabel}>{sentimentLabel}</p>
                  <div className={styles.sentimentValueRow}>
                    <span className={styles.sentimentValue}>
                      {sentimentValue}%
                    </span>
                    <span className={styles.sentimentIcon}>
                      {isTrendDown ? <LuFrown /> : <LuSmile />}
                    </span>
                  </div>
                </div>
                <span
                  className={`${styles.trendBadge} ${
                    isTrendDown ? styles.trendBadgeDown : styles.trendBadgeUp
                  }`}
                >
                  {trendText}
                </span>
              </div>
              <div className={styles.sentimentChart} aria-hidden="true">
                <svg viewBox="0 0 240 90" preserveAspectRatio="none">
                  <path
                    d="M0 25 C 40 18, 70 36, 100 40 C 130 46, 165 60, 200 48 C 215 42, 228 38, 240 40 L240 90 L0 90 Z"
                    className={styles.sentimentArea}
                  />
                  <path
                    d="M0 25 C 40 18, 70 36, 100 40 C 130 46, 165 60, 200 48 C 215 42, 228 38, 240 40"
                    className={styles.sentimentLine}
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className={styles.personalityCard}>
            <div className={styles.personalityHeader}>
              <span className={styles.personalityIcon}>
                <FaUser />
              </span>
              <span>Detected Personality</span>
            </div>
            <span className={styles.personalityName}>
              {conversationAnalytics?.guest_profile?.label ||
                conversationAnalytics?.guest_profile?.personality_type ||
                "Unknown"}
            </span>
            <div className={styles.personalityTags}>
              {personalityTags.length > 0 ? (
                personalityTags.slice(0, 3).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))
              ) : (
                <span>Awaiting profile analysis</span>
              )}
            </div>
            <div className={styles.personalityTip}>
              <span className={styles.personalityTipIcon}>
                <LuLightbulb />
              </span>
              <p>
                {conversationAnalytics?.guest_profile
                  ?.recommended_engagement_style ||
                  "No engagement guidance available yet."}
              </p>
            </div>
          </div>

          {showUrgencySegment ? (
            <div className={styles.urgencyCard}>
              <div className={styles.urgencyHeader}>
                <span className={styles.urgencyTitle}>
                  <span className={styles.urgencyIcon}>
                    <HiOutlineExclamation />
                  </span>
                  <span>Urgency</span>
                </span>
                <span className={styles.urgencyBadge}>Level {urgencyLevel}</span>
              </div>
              <div className={styles.urgencyFlags}>
                <span
                  className={`${styles.urgencyFlag} ${
                    requiresImmediateAction
                      ? styles.urgencyFlagActive
                      : styles.urgencyFlagMuted
                  }`}
                >
                  {requiresImmediateAction
                    ? "Immediate action required"
                    : "No immediate action"}
                </span>
                <span
                  className={`${styles.urgencyFlag} ${
                    requiredEscalation
                      ? styles.urgencyFlagActive
                      : styles.urgencyFlagMuted
                  }`}
                >
                  {requiredEscalation
                    ? "Escalation required"
                    : "No escalation required"}
                </span>
              </div>
              {conversationAnalytics?.analysis?.urgency_reason ? (
                <p className={styles.urgencyReason}>
                  {conversationAnalytics.analysis.urgency_reason}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className={styles.detailsSection}>
            <div className={styles.detailsSectionHeader}>
              <div>
                <span className={styles.detailsSectionIcon}>
                  <LuClipboardList />
                </span>
                <span>Special Requests</span>
              </div>
            </div>
            <div className={styles.specialRequestInputRow}>
              <input
                type="text"
                placeholder="Add a special request"
                className={styles.specialRequestInput}
                value={specialRequestInput}
                disabled={!selectedConversation || specialRequestSubmitting}
                onChange={(event) => setSpecialRequestInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleAddSpecialRequest();
                  }
                }}
              />
              <button
                className={styles.sectionAddButton}
                type="button"
                aria-label="Add special request"
                disabled={
                  !selectedConversation ||
                  specialRequestSubmitting ||
                  !specialRequestInput.trim()
                }
                onClick={handleAddSpecialRequest}
              >
                {specialRequestSubmitting ? (
                  <LuLoaderCircle className={styles.spinIcon} />
                ) : (
                  <LuPlus />
                )}
              </button>
            </div>
            <div className={styles.specialRequestList}>
              {loadingSpecialRequests ? (
                <div className={styles.requestItem}>
                  <div className={styles.requestContent}>
                    <p className={styles.requestTitle}>Loading requests...</p>
                  </div>
                </div>
              ) : specialRequests.length > 0 ? (
                specialRequests.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.requestItem} ${
                      item.is_resolved ? styles.requestDone : ""
                    } ${
                      editingSpecialRequestId === item.id
                        ? styles.requestItemEditing
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className={`${styles.requestCheck} ${
                        item.is_resolved ? styles.requestCheckDone : ""
                      }`}
                      aria-label="Resolve request"
                      disabled={
                        item.is_resolved ||
                        specialRequestPendingIds.has(String(item.id))
                      }
                      onClick={() => handleResolveSpecialRequest(item)}
                    >
                      {specialRequestPendingIds.has(String(item.id)) ? (
                        <LuLoaderCircle className={styles.spinIcon} />
                      ) : (
                        <TbCheckbox />
                      )}
                    </button>
                    <div className={styles.requestContent}>
                      {editingSpecialRequestId === item.id ? (
                        <input
                          type="text"
                          className={styles.specialRequestEditInput}
                          value={editingSpecialRequestText}
                          disabled={specialRequestPendingIds.has(
                            String(item.id)
                          )}
                          onChange={(event) =>
                            setEditingSpecialRequestText(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              handleSaveSpecialRequest(item);
                            }
                            if (event.key === "Escape") {
                              handleCancelEditSpecialRequest();
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <p className={styles.requestTitle}>{item.text}</p>
                      )}
                      <span className={styles.requestTag}>
                        {item.source || "Detected"}
                      </span>
                    </div>
                    <div className={styles.requestActions}>
                      {editingSpecialRequestId === item.id ? (
                        <>
                          <button
                            type="button"
                            aria-label="Save request"
                            disabled={
                              specialRequestPendingIds.has(String(item.id)) ||
                              !editingSpecialRequestText.trim()
                            }
                            onClick={() => handleSaveSpecialRequest(item)}
                          >
                            <LuSend />
                          </button>
                          <button
                            type="button"
                            aria-label="Cancel editing request"
                            disabled={specialRequestPendingIds.has(
                              String(item.id)
                            )}
                            onClick={handleCancelEditSpecialRequest}
                          >
                            <LuX />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-label="Edit request"
                            disabled={specialRequestPendingIds.has(
                              String(item.id)
                            )}
                            onClick={() => handleStartEditSpecialRequest(item)}
                          >
                            <LuPenLine />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete request"
                            disabled={specialRequestPendingIds.has(
                              String(item.id)
                            )}
                            onClick={() => handleDeleteSpecialRequest(item)}
                          >
                            <LuTrash2 />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.requestItem}>
                  <div className={styles.requestContent}>
                    <p className={styles.requestTitle}>
                      No requests or preferences detected yet.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.detailsSection}>
            <div className={styles.detailsSectionHeader}>
              <div>
                <span className={styles.detailsSectionIcon}>
                  <LuShield />
                </span>
                <span>Risk Assessment</span>
              </div>
            </div>
            <div className={styles.riskList}>
              {displayRisks.length > 0 ? (
                displayRisks.map((risk) => (
                  <div key={risk.id} className={styles.riskItem}>
                    <div
                      className={
                        risk.tone === "danger"
                          ? styles.riskIconDanger
                          : styles.riskIconWarn
                      }
                    >
                      !
                    </div>
                    <div className={styles.riskMeta}>
                      <p>{risk.title}</p>
                      <span>{risk.detail}</span>
                    </div>
                    <div
                      className={
                        risk.tone === "danger"
                          ? styles.riskScoreDanger
                          : styles.riskScoreWarn
                      }
                    >
                      {risk.score}% <small>Prob.</small>
                    </div>
                  </div>
                ))
              ) : displayIssues.length > 0 ? (
                displayIssues.map((issue) => (
                  <div key={issue.id} className={styles.riskItem}>
                    <div
                      className={
                        String(issue.severity).toLowerCase() === "high"
                          ? styles.riskIconDanger
                          : styles.riskIconWarn
                      }
                    >
                      !
                    </div>
                    <div className={styles.riskMeta}>
                      <p>{formatReadableLabel(issue.category)}</p>
                      <span>{issue.summary || issue.affected_area}</span>
                    </div>
                    <div
                      className={
                        String(issue.severity).toLowerCase() === "high"
                          ? styles.riskScoreDanger
                          : styles.riskScoreWarn
                      }
                    >
                      {issue.severity}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.riskItem}>
                  <div className={styles.riskMeta}>
                    <p>No active risks detected</p>
                    <span>Analytics will appear here when available.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 
          <div className={styles.detailsSection}>
            <div className={styles.detailsSectionHeader}>
              <div>
                <span className={styles.detailsSectionIcon}>
                  <LuRadar />
                </span>
                <span>Opportunity Radar</span>
              </div>
            </div>
            <div className={styles.opportunityCard}>
              <div className={styles.opportunityHeader}>
                <span>Recommended Offer</span>
                <span className={styles.opportunityPrice}>$60</span>
              </div>
              <span>Late Checkout</span>
              <p>Flight is at 8 PM tomorrow</p>
              <div className={styles.opportunityMeter}>
                <div className={styles.opportunityMeterBar}>
                  <div className={styles.opportunityMeterFill} />
                </div>
                <span>90% Likely</span>
              </div>
              <button className={styles.opportunityButton} type="button">
                <LuGift />
                Send Offer Now
              </button>
            </div>
          </div> 
          */}

          <div className={styles.detailsSection}>
            <div className={styles.detailsSectionHeader}>
              <div>
                <span>Thread Summary</span>
              </div>
              <button
                type="button"
                className={styles.summaryDetailBadge}
                onClick={() => setSummaryModalOpen(true)}
                disabled={!conversationAnalytics && !loadingConversationAnalytics}
              >
                Detail
              </button>
            </div>
            <div className={styles.threadSummaryCard}>
              {loadingConversationAnalytics
                ? "Loading conversation analysis..."
                : conversationAnalytics?.analysis?.summary ||
                  "No conversation summary available yet."}
            </div>
          </div>
          </div>
        </div>
        ) : null}
      </motion.div>
    </div>
    {filtersModalOpen ? (
      <div
        className={styles.filtersModalOverlay}
        role="presentation"
        onClick={() => setFiltersModalOpen(false)}
      >
        <div
          className={styles.filtersModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="conversation-filters-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className={styles.filtersModalHeader}>
            <span id="conversation-filters-title">Filter</span>
            <button
              type="button"
              className={styles.filtersModalClose}
              aria-label="Close filters"
              onClick={() => setFiltersModalOpen(false)}
            >
              <LuX aria-hidden="true" />
            </button>
          </div>
          <div className={styles.filtersModalBody}>
            <div className={styles.filtersModalField}>
              <span>Properties</span>
              <div className={styles.propertySelect} ref={propertyMenuRef}>
                <div className={styles.propertyPills}>
                  {draftPropertyFilter ? (
                    <span className={styles.propertyPill}>
                      {draftPropertyFilterName || "Unknown"}
                      <button
                        type="button"
                        className={styles.propertyPillRemove}
                        onClick={() => {
                          setDraftPropertyFilter("");
                          setDraftPropertyFilterName("");
                        }}
                        aria-label="Remove property"
                      >
                        ×
                      </button>
                    </span>
                  ) : (
                    <span className={styles.propertyPlaceholder}>
                      Search property (e.g. Seaside Villa)...
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={propertySearchTerm}
                  onChange={(event) => setPropertySearchTerm(event.target.value)}
                  onFocus={() => setIsPropertyMenuOpen(true)}
                  className={styles.propertyInput}
                  aria-label="Search property"
                />
                {isPropertyMenuOpen && (
                  <div className={styles.propertyMenu}>
                  {loadingPropertyOptions ? (
                    <div className={styles.propertyEmpty}>
                      Loading properties...
                    </div>
                  ) : filteredPropertyOptions.length > 0 ? (
                    filteredPropertyOptions.map((property) => (
                      <button
                        type="button"
                        key={property.id}
                        className={`${styles.propertyOption} ${
                          draftPropertyFilter === String(property.id)
                            ? styles.propertyOptionSelected
                            : ""
                        }`}
                        onClick={() => {
                          if (draftPropertyFilter === String(property.id)) {
                            setDraftPropertyFilter("");
                            setDraftPropertyFilterName("");
                          } else {
                            setDraftPropertyFilter(String(property.id));
                            setDraftPropertyFilterName(property.name);
                          }
                          setPropertySearchTerm("");
                          setIsPropertyMenuOpen(false);
                        }}
                      >
                        <span>{property.name}</span>
                        {draftPropertyFilter === String(property.id) ? (
                          <span>✓</span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <div className={styles.propertyEmpty}>
                      No properties found.
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>
          </div>
          <div className={styles.filtersModalFooter}>
            <button
              type="button"
              className={styles.filtersModalClear}
              onClick={() => {
                setDraftPropertyFilter("");
                setDraftPropertyFilterName("");
                setPropertySearchTerm("");
              }}
              disabled={!draftPropertyFilter}
            >
              Clear Filter
            </button>
            <button
              type="button"
              className={styles.filtersModalApply}
              onClick={() => {
                setSelectedPropertyFilter(draftPropertyFilter);
                setSelectedPropertyFilterName(draftPropertyFilterName);
                setFiltersModalOpen(false);
              }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    ) : null}
    {summaryModalOpen ? (
      <div
        className={styles.summaryModalOverlay}
        role="presentation"
        onClick={() => setSummaryModalOpen(false)}
      >
        <div
          className={styles.summaryModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detailed-summary-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className={styles.summaryModalHeader}>
            <h3 id="detailed-summary-title">Detailed Summary</h3>
            <button
              type="button"
              className={styles.summaryModalClose}
              aria-label="Close detailed summary"
              onClick={() => setSummaryModalOpen(false)}
            >
              <LuX />
            </button>
          </div>
          <div className={styles.summaryModalText}>
            {renderSummaryText(
              loadingConversationAnalytics
                ? "Loading conversation analysis..."
                : conversationAnalytics?.summary ||
                    "No detailed summary available yet."
            )}
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}

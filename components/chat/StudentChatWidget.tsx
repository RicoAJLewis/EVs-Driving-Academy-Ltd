"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ChatMessage, ChatThread } from "@/types/academy";
import { useAcademy } from "@/components/academy/AcademyProvider";

type ChatThreadRow = {
  id: string;
  student_id: string;
  admin_id: string | null;
  student_name: string | null;
  student_email: string | null;
  status: "open" | "archived";
  last_message: string | null;
  last_message_at: string | null;
  student_unread_count: number | null;
  admin_unread_count: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_by_admin_at: string | null;
};

type ChatMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  receiver_id: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function logChatDiagnostic({
  step,
  error,
  currentUser,
  payload
}: {
  step: string;
  error: unknown;
  currentUser: ReturnType<typeof useAcademy>["currentUser"];
  payload?: Record<string, unknown> | null;
}) {
  const supabaseError = error as SupabaseErrorLike | null;

  console.error("EV Academy student chat failure", {
    step,
    message:
      supabaseError?.message ||
      (error instanceof Error ? error.message : "Unknown chat error"),
    code: supabaseError?.code ?? null,
    details: supabaseError?.details ?? null,
    hint: supabaseError?.hint ?? null,
    currentUser: currentUser
      ? {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role,
          profileRole: currentUser.profileRole ?? null
        }
      : null,
    payload: payload ?? null
  });
}

function mapThread(row: ChatThreadRow): ChatThread {
  return {
    id: row.id,
    studentId: row.student_id,
    adminId: row.admin_id,
    studentName: row.student_name || "EV Academy Student",
    studentEmail: row.student_email || "",
    status: row.status,
    lastMessage: row.last_message || "",
    lastMessageAt: row.last_message_at,
    studentUnreadCount: row.student_unread_count ?? 0,
    adminUnreadCount: row.admin_unread_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedByAdminAt: row.deleted_by_admin_at
  };
}

function mapMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at
  };
}

function formatChatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function StudentChatWidget() {
  const { currentUser, isReady } = useAcademy();
  const [isOpen, setIsOpen] = useState(false);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const supabase = useMemo(() => getSupabaseClient(), []);
  const shouldShow = Boolean(isReady && currentUser && currentUser.role !== "admin");

  const loadThread = useCallback(async () => {
    if (!supabase || !currentUser || currentUser.role === "admin") {
      return null;
    }

    const { data, error: threadError } = await supabase
      .from("chat_threads")
      .select(
        "id, student_id, admin_id, student_name, student_email, status, last_message, last_message_at, student_unread_count, admin_unread_count, created_at, updated_at, archived_at, deleted_by_admin_at"
      )
      .eq("student_id", currentUser.id)
      .is("deleted_by_admin_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (threadError) {
      logChatDiagnostic({
        step: "find existing chat thread",
        error: threadError,
        currentUser,
        payload: { student_id: currentUser.id }
      });
      setError("Unable to load your chat right now.");
      return null;
    }

    const mappedThread = data ? mapThread(data as ChatThreadRow) : null;
    setThread(mappedThread);
    return mappedThread;
  }, [currentUser, supabase]);

  const loadMessages = useCallback(
    async (threadId: string) => {
      if (!supabase) {
        return;
      }

      const { data, error: messagesError } = await supabase
        .from("chat_messages")
        .select("id, thread_id, sender_id, receiver_id, body, created_at, read_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        logChatDiagnostic({
          step: "load chat messages",
          error: messagesError,
          currentUser,
          payload: { thread_id: threadId }
        });
        setError("Unable to load your chat right now.");
        return;
      }

      setMessages(((data ?? []) as ChatMessageRow[]).map(mapMessage));
    },
    [currentUser, supabase]
  );

  const markThreadRead = useCallback(
    async (threadId: string) => {
      if (!supabase) {
        return;
      }

      const { error: readError } = await supabase.rpc("mark_chat_thread_read", {
        thread_id_input: threadId
      });

      if (readError) {
        logChatDiagnostic({
          step: "mark student thread read",
          error: readError,
          currentUser,
          payload: { thread_id_input: threadId }
        });
        return;
      }

      setThread((current) =>
        current?.id === threadId ? { ...current, studentUnreadCount: 0 } : current
      );
    },
    [currentUser, supabase]
  );

  const refreshChat = useCallback(
    async (markRead = false) => {
      if (!shouldShow) {
        return;
      }

      setIsLoading(true);
      setError("");
      try {
        const loadedThread = await loadThread();

        if (loadedThread) {
          await loadMessages(loadedThread.id);
          if (markRead) {
            await markThreadRead(loadedThread.id);
          }
        } else {
          setMessages([]);
        }
      } catch (refreshError) {
        logChatDiagnostic({
          step: "refresh student chat",
          error: refreshError,
          currentUser,
          payload: null
        });
        setError("Unable to load your chat right now.");
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser, loadMessages, loadThread, markThreadRead, shouldShow]
  );

  useEffect(() => {
    if (!shouldShow) {
      setThread(null);
      setMessages([]);
      return;
    }

    void refreshChat(isOpen);
    const intervalId = window.setInterval(() => {
      void refreshChat(isOpen);
    }, 12000);

    return () => window.clearInterval(intervalId);
  }, [isOpen, refreshChat, shouldShow]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [isOpen, messages]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.trim()) {
      return;
    }

    setIsSending(true);
    setError("");

    try {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        logChatDiagnostic({
          step: "get current user",
          error: authError ?? new Error("No authenticated Supabase user."),
          currentUser,
          payload: null
        });
        throw new Error("Please log in before sending a message.");
      }

      const payload = { message_body: draft.trim() };
      const { error: sendError } = await supabase.rpc(
        "send_student_chat_message",
        payload
      );

      if (sendError) {
        logChatDiagnostic({
          step: "send student chat message rpc",
          error: sendError,
          currentUser,
          payload: {
            bodyPreview: draft.trim().slice(0, 120),
            authUserId: authData.user.id,
            authUserEmail: authData.user.email ?? null
          }
        });
        throw sendError;
      }

      setDraft("");
      await refreshChat(true);
    } catch (sendError) {
      if (!(sendError as SupabaseErrorLike | null)?.message) {
        logChatDiagnostic({
          step: "send message unexpected failure",
          error: sendError,
          currentUser,
          payload: { bodyPreview: draft.trim().slice(0, 120) }
        });
      }
      setError("Unable to send your message right now.");
    } finally {
      setIsSending(false);
    }
  };

  if (!shouldShow) {
    return null;
  }

  const unreadCount = thread?.studentUnreadCount ?? 0;

  return (
    <div className="student-chat-widget" aria-live="polite">
      {isOpen ? (
        <section className="student-chat-panel" aria-label="Chat with EV">
          <div className="student-chat-header">
            <div>
              <strong>Chat with EV</strong>
              <span>Ask a question and we'll reply here.</span>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close chat">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="student-chat-messages">
            {isLoading && messages.length === 0 ? (
              <>
                <div className="student-chat-bubble is-admin" aria-hidden="true">
                  <Skeleton width="100%" height="0.85rem" />
                  <Skeleton width="68%" height="0.85rem" />
                </div>
                <div className="student-chat-bubble is-mine" aria-hidden="true">
                  <Skeleton width="100%" height="0.85rem" />
                  <Skeleton width="54%" height="0.85rem" />
                </div>
              </>
            ) : messages.length === 0 ? (
              <p className="student-chat-empty">
                Send us a message and EVs Driving Academy will reply soon.
              </p>
            ) : (
              messages.map((message) => {
                const isMine = message.senderId === currentUser?.id;

                return (
                  <article
                    key={message.id}
                    className={`student-chat-bubble ${isMine ? "is-mine" : "is-admin"}`}
                  >
                    <p>{message.body}</p>
                    <time dateTime={message.createdAt}>
                      {formatChatTime(message.createdAt)}
                    </time>
                  </article>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {error ? <p className="student-chat-error">{error}</p> : null}

          <form className="student-chat-form" onSubmit={sendMessage}>
            <label className="sr-only" htmlFor="student-chat-message">
              Message
            </label>
            <textarea
              id="student-chat-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write your message..."
              rows={2}
            />
            <button type="submit" disabled={isSending || !draft.trim()}>
              <Send size={16} aria-hidden="true" />
              {isSending ? "Sending" : "Send"}
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="student-chat-button"
        onClick={() => {
          setIsOpen(true);
          if (thread) {
            void markThreadRead(thread.id);
          }
        }}
      >
        <MessageCircle size={19} aria-hidden="true" />
        <span>Chat with EV</span>
        {unreadCount > 0 ? <strong>{unreadCount}</strong> : null}
      </button>
    </div>
  );
}

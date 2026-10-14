"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
  fileName?: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
}

const STORAGE_KEY = "smartops.conversations.v1";
const NEW_CHAT_TITLE = "Percakapan baru";

function createConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: NEW_CHAT_TITLE,
    updatedAt: Date.now(),
    messages: [],
  };
}

function getConversationTitle(text: string, fileName?: string) {
  const title = text.trim() || fileName || NEW_CHAT_TITLE;
  return title.length > 34 ? `${title.slice(0, 34)}…` : title;
}

function getFileIcon(name: string) {
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return "🖼️";
  if (/\.pdf$/i.test(name)) return "📄";
  return "📎";
}

export default function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [readyConversationId, setReadyConversationId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottom = useRef(true);
  const forceScroll = useRef(false);
  const scrollFrame = useRef<number | null>(null);
  const pendingPromptScroll = useRef(false);
  const holdAtPrompt = useRef(false);

  const scrollToPositionSmoothly = useCallback((requestedTop: number) => {
    const container = messagesRef.current;
    if (!container) return;
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);

    const start = container.scrollTop;
    const target = Math.max(0, Math.min(requestedTop, container.scrollHeight - container.clientHeight));
    const distance = target - start;
    if (distance <= 1) return;

    const duration = Math.min(900, Math.max(420, distance * 0.45));
    const startedAt = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      container.scrollTop = start + distance * eased;
      if (progress < 1) scrollFrame.current = requestAnimationFrame(animate);
      else scrollFrame.current = null;
    };
    scrollFrame.current = requestAnimationFrame(animate);
  }, []);

  const scrollToBottomSmoothly = useCallback(() => {
    const container = messagesRef.current;
    if (container) {
      scrollToPositionSmoothly(container.scrollHeight - container.clientHeight);
    }
  }, [scrollToPositionSmoothly]);

  useEffect(() => {
    let saved: Conversation[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        saved = parsed.filter(
          (item): item is Conversation =>
            typeof item?.id === "string" &&
            typeof item?.title === "string" &&
            Array.isArray(item?.messages),
        );
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }

    const initial = saved.length ? saved : [createConversation()];
    setConversations(initial);
    setActiveId(initial[0].id);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // Keep the current chat usable if browser storage is unavailable or full.
    }
  }, [conversations, hydrated]);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ??
    conversations[0];
  const messages = activeConversation?.messages ?? [];
  const visibleConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!query) return sorted;
    return sorted.filter((conversation) =>
      conversation.title.toLowerCase().includes(query),
    );
  }, [conversations, search]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    if (pendingPromptScroll.current) {
      pendingPromptScroll.current = false;
      const lastMessage = container.querySelector<HTMLElement>(
        `[data-message-index="${messages.length - 1}"]`,
      );
      if (lastMessage) {
        const target = container.scrollTop + lastMessage.getBoundingClientRect().top - container.getBoundingClientRect().top - 20;
        scrollToPositionSmoothly(target);
      }
      return;
    }
    if (holdAtPrompt.current) return;
    if (forceScroll.current || shouldStickToBottom.current) {
      scrollToBottomSmoothly();
    }
    forceScroll.current = false;
  }, [activeId, messages.length, loadingChatId, scrollToBottomSmoothly, scrollToPositionSmoothly]);

  const updateConversation = (
    conversationId: string,
    update: (conversation: Conversation) => Conversation,
  ) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId ? update(conversation) : conversation,
      ),
    );
  };

  const startNewChat = () => {
    const conversation = createConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setInput("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMobileHistoryOpen(false);
    shouldStickToBottom.current = true;
    holdAtPrompt.current = false;
    setReadyConversationId(null);
    forceScroll.current = true;
  };

  const selectConversation = (conversationId: string) => {
    setActiveId(conversationId);
    setInput("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMobileHistoryOpen(false);
    shouldStickToBottom.current = true;
    holdAtPrompt.current = false;
    setReadyConversationId(null);
    forceScroll.current = true;
  };

  const deleteConversation = (conversationId: string) => {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    if (!window.confirm(`Hapus “${conversation.title}”?`)) return;

    const remaining = conversations.filter((item) => item.id !== conversationId);
    if (remaining.length === 0) {
      const fresh = createConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
    } else {
      setConversations(remaining);
      if (activeId === conversationId) setActiveId(remaining[0].id);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleSend = async (suggestedText?: string) => {
    if (!activeConversation || loadingChatId) return;
    const messageText = suggestedText?.trim() || input.trim();
    if (!messageText && !file) return;

    const conversationId = activeConversation.id;
    const finalMessageText = messageText || "Jelaskan isi file ini.";
    const selectedFile = file;
    const userMessage: Message = {
      role: "user",
      content: finalMessageText,
      fileName: selectedFile?.name,
    };
    const priorMessages = activeConversation.messages;
    const nextMessages = [...priorMessages, userMessage];

    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      title:
        conversation.messages.length === 0
          ? getConversationTitle(finalMessageText, selectedFile?.name)
          : conversation.title,
      updatedAt: Date.now(),
      messages: nextMessages,
    }));
    setInput("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoadingChatId(conversationId);
    holdAtPrompt.current = true;
    pendingPromptScroll.current = true;
    setReadyConversationId(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
      if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL belum diatur.");

      const formData = new FormData();
      formData.append("message", finalMessageText);
      formData.append(
        "history",
        JSON.stringify(
          priorMessages.map(({ role, content }) => ({ role, content })),
        ),
      );
      if (selectedFile) formData.append("file", selectedFile);

      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || `Server merespons ${response.status}.`);
      }
      if (typeof data.reply !== "string") {
        throw new Error("Server tidak mengirim balasan yang bisa dibaca.");
      }

      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        updatedAt: Date.now(),
        messages: [...conversation.messages, { role: "assistant", content: data.reply }],
      }));
      setReadyConversationId(conversationId);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        updatedAt: Date.now(),
        messages: [
          ...conversation.messages,
          {
            role: "assistant",
            content: `Maaf, pesan gagal diproses. ${detail}`,
          },
        ],
      }));
      setReadyConversationId(conversationId);
    } finally {
      setLoadingChatId(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-white/55">
      {mobileHistoryOpen && (
        <button
          aria-label="Tutup riwayat chat"
          className="fixed inset-0 z-30 bg-slate-900/25 lg:hidden"
          onClick={() => setMobileHistoryOpen(false)}
        />
      )}

      <aside
        className={`${
          mobileHistoryOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"
        } w-[min(84vw,310px)] shrink-0 flex-col border-r border-sky-100 bg-white/95 p-4 shadow-xl backdrop-blur-xl lg:relative lg:z-auto lg:flex lg:w-72 lg:shadow-none`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-800">Riwayat chat</h2>
            <p className="mt-1 text-xs text-slate-400">Tersimpan di browser ini</p>
          </div>
          <button
            onClick={() => setMobileHistoryOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Tutup riwayat"
          >
            ✕
          </button>
        </div>

        <button
          onClick={startNewChat}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
        >
          <span className="text-lg leading-none">＋</span> Chat baru
        </button>

        <label className="mb-3 block">
          <span className="sr-only">Cari riwayat</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari percakapan..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {visibleConversations.length === 0 ? (
            <p className="px-3 py-5 text-center text-sm text-slate-400">
              Belum ada percakapan.
            </p>
          ) : (
            visibleConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group flex items-center gap-1 rounded-xl border px-2 py-1.5 transition ${
                  conversation.id === activeConversation?.id
                    ? "border-sky-100 bg-sky-50"
                    : "border-transparent hover:bg-slate-50"
                }`}
              >
                <button
                  onClick={() => selectConversation(conversation.id)}
                  className="min-w-0 flex-1 px-1 py-2 text-left"
                >
                  <span className="block truncate text-sm font-medium text-slate-700">
                    {conversation.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-400">
                    {conversation.messages.at(-1)?.content || "Belum ada pesan"}
                  </span>
                </button>
                <button
                  onClick={() => deleteConversation(conversation.id)}
                  aria-label={`Hapus ${conversation.title}`}
                  title="Hapus percakapan"
                  className="rounded-lg px-2 py-1.5 text-slate-300 opacity-100 transition hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <p className="mt-3 border-t border-slate-100 px-1 pt-3 text-[11px] leading-relaxed text-slate-400">
          Riwayat hanya tersimpan di browser dan perangkat ini.
        </p>
      </aside>

      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-sky-100/70 px-4 py-2.5 lg:hidden">
          <button
            onClick={() => setMobileHistoryOpen(true)}
            aria-label="Buka riwayat chat"
            className="rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-sky-700 shadow-sm"
          >
            ☰ Riwayat
          </button>
          <span className="min-w-0 truncate text-sm font-medium text-slate-600">
            {activeConversation?.title ?? NEW_CHAT_TITLE}
          </span>
        </div>

        <div
          ref={messagesRef}
          onScroll={(event) => {
            const element = event.currentTarget;
            shouldStickToBottom.current =
              element.scrollHeight - element.scrollTop - element.clientHeight < 120;
          }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6"
        >
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-end gap-6">
            {messages.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
                <div className="relative">
                  <div className="absolute inset-0 scale-150 rounded-full bg-sky-100 opacity-60 blur-2xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-sky-100 bg-white text-sky-500 shadow-lg shadow-sky-100/60">
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-700">How can I assist you today?</p>
                  <p className="mt-1 text-sm text-slate-400">Upload a file or type a message to begin.</p>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={`${activeConversation?.id}-${index}`}
                data-message-index={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[94%] rounded-3xl px-5 py-4 shadow-sm sm:max-w-[86%] sm:px-7 ${
                    message.role === "user"
                      ? "rounded-br-sm bg-gradient-to-br from-sky-500 to-blue-500 text-white"
                      : "rounded-bl-sm border border-sky-100 bg-white text-slate-800"
                  }`}
                >
                  {message.fileName && (
                    <div className={`mb-3 flex w-fit items-center gap-2 rounded-xl border px-3 py-2 text-sm ${message.role === "user" ? "border-white/20 bg-white/10" : "border-sky-100 bg-sky-50 text-sky-800"}`}>
                      <span className="text-lg">{getFileIcon(message.fileName)}</span>
                      <span className="max-w-56 truncate font-medium">{message.fileName}</span>
                    </div>
                  )}
                  {message.role === "assistant" ? (
                    <div className="markdown-body break-words">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          input: ({ node, type, checked, ...props }) => {
                            if (type !== "checkbox") return <input type={type} {...props} />;
                            return (
                              <input
                                type="checkbox"
                                checked={Boolean(checked)}
                                readOnly
                                onClick={(event) => {
                                  event.preventDefault();
                                  const listItem = event.currentTarget.closest("li");
                                  const option = listItem?.textContent
                                    ?.replace(/^\s*\[[ xX]\]\s*/, "")
                                    .trim();
                                  if (option) void handleSend(option);
                                }}
                                aria-label="Pilih topik ini dan kirim ke AI"
                                title="Klik untuk membahas topik ini"
                                className="mr-2 h-4 w-4 cursor-pointer accent-sky-500"
                              />
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                      {message.content}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {loadingChatId === activeConversation?.id && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-3xl rounded-bl-sm border border-sky-100 bg-white px-5 py-4 shadow-sm">
                  {[0, 1, 2].map((dot) => (
                    <span key={dot} className="loading-dot h-2 w-2 rounded-full bg-sky-400" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {readyConversationId === activeConversation?.id && holdAtPrompt.current && (
          <button
            onClick={() => {
              holdAtPrompt.current = false;
              setReadyConversationId(null);
              shouldStickToBottom.current = true;
              scrollToBottomSmoothly();
            }}
            className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full border border-sky-200 bg-white/95 px-4 py-2 text-sm font-medium text-sky-700 shadow-lg shadow-sky-100 transition hover:bg-sky-50"
          >
            ✨ Jawaban AI sudah siap · lihat
          </button>
        )}

        <div className="shrink-0 px-4 pb-4 pt-3 sm:px-6 sm:pb-6">
          <div className="mx-auto max-w-4xl">
            {file && (
              <div className="mb-2 flex items-center gap-3 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 shadow-sm">
                <span className="text-2xl">{getFileIcon(file.name)}</span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-700">{file.name}</span>
                  <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="rounded-full px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  aria-label="Hapus lampiran"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 rounded-3xl border border-sky-200 bg-white px-3 py-2 shadow-[0_8px_30px_-10px_rgba(114,196,238,0.2)] transition focus-within:border-sky-400 focus-within:shadow-sky-100 sm:gap-3 sm:px-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={Boolean(loadingChatId)}
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500 transition hover:bg-sky-100 disabled:opacity-50"
                title="Unggah gambar atau PDF"
                aria-label="Unggah file"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
                rows={1}
                disabled={Boolean(loadingChatId)}
                className="mb-0.5 max-h-32 min-h-10 flex-1 resize-y bg-transparent py-2.5 text-[15px] leading-5 text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
              />
              <button
                onClick={() => void handleSend()}
                disabled={Boolean(loadingChatId) || (!input.trim() && !file)}
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-md shadow-sky-200 transition hover:scale-105 disabled:scale-100 disabled:opacity-40 disabled:shadow-none"
                aria-label="Kirim pesan"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Enter untuk mengirim · Shift+Enter untuk baris baru
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

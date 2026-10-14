"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
  fileName?: string;
  filePreview?: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);

    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFile((prev) => {
          if (prev && prev.name === selected.name) {
            return Object.assign(prev, { preview: ev.target?.result as string });
          }
          return prev;
        });
      };
      reader.readAsDataURL(selected);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!input.trim() && !file) return;

    const userMsg: Message = {
      role: "user",
      content: input,
      fileName: file?.name,
      filePreview: file?.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const formData = new FormData();
      formData.append("message", input || "Jelaskan isi file ini.");
      if (file) formData.append("file", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/chat`,
        { method: "POST", body: formData }
      );

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Gagal terhubung ke server." },
      ]);
    } finally {
      setLoading(false);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      scrollToBottom();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getFileIcon = (name: string) => {
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return "🖼️";
    if (/\.pdf$/i.test(name)) return "📄";
    return "📎";
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-glow animate-pulse opacity-50 rounded-full blur-xl scale-150"></div>
              <div className="relative w-20 h-20 rounded-3xl bg-white border border-ice-dark shadow-[0_10px_40px_-10px_rgba(114,196,238,0.3)] flex items-center justify-center text-soft-dark rotate-3">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">How can I assist you today?</p>
              <p className="text-sm text-gray-400 mt-1">Upload a file or type a message to begin.</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] sm:max-w-[85%] rounded-3xl px-5 py-4 sm:px-7 sm:py-5 shadow-sm ${
                msg.role === "user"
                  ? "bg-gradient-iconic text-white rounded-br-sm"
                  : "bg-white border border-ice-dark text-gray-800 rounded-bl-sm"
              }`}
            >
              {/* File attachment preview in user message */}
              {msg.filePreview && (
                <img
                  src={msg.filePreview}
                  alt="attachment"
                  className="rounded-xl mb-3 max-h-48 border border-white/20 shadow-sm"
                />
              )}
              {msg.fileName && !msg.filePreview && (
                <div className={`flex items-center gap-2 text-sm mb-3 rounded-xl px-3 py-2 border w-fit ${msg.role === 'user' ? 'bg-white/10 border-white/20 text-white' : 'bg-ice-light border-ice-dark text-soft-dark'}`}>
                  <span className="text-lg">{getFileIcon(msg.fileName)}</span>
                  <span className="truncate font-medium">{msg.fileName}</span>
                </div>
              )}

              {/* Message content */}
              {msg.role === "assistant" ? (
                <div className="prose prose-slate max-w-none text-[15px] leading-relaxed 
                  prose-p:leading-relaxed prose-p:mb-4 last:prose-p:mb-0
                  prose-headings:font-semibold prose-headings:text-gray-800 prose-headings:mt-7 prose-headings:mb-4
                  prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                  prose-strong:font-semibold prose-strong:text-gray-900
                  prose-ul:list-outside prose-ul:pl-5 prose-ul:my-4 prose-ul:list-disc
                  prose-ol:list-outside prose-ol:pl-5 prose-ol:my-4 prose-ol:list-decimal
                  prose-li:marker:text-soft-dark prose-li:pl-1 prose-li:my-1.5
                  prose-pre:bg-ice-light prose-pre:border prose-pre:border-ice-dark prose-pre:text-gray-700 prose-pre:rounded-xl prose-pre:my-4
                  prose-code:text-soft-dark prose-code:bg-ice-light/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-medium before:prose-code:content-none after:prose-code:content-none
                  prose-table:border-collapse prose-table:w-full prose-table:my-6 prose-table:text-sm
                  prose-tr:border-b prose-tr:border-ice-dark/50 last:prose-tr:border-0
                  prose-td:py-3 prose-td:px-4 prose-td:align-top
                  prose-th:py-3 prose-th:px-4 prose-th:text-left prose-th:bg-ice-light/30 prose-th:font-semibold prose-th:text-gray-700
                  prose-a:text-soft-dark hover:prose-a:text-soft">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-ice-dark rounded-3xl rounded-bl-sm px-5 py-4 shadow-sm flex items-center gap-2">
              <div className="loading-dot w-2 h-2 rounded-full bg-soft" />
              <div className="loading-dot w-2 h-2 rounded-full bg-soft" />
              <div className="loading-dot w-2 h-2 rounded-full bg-soft" />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* File preview bar */}
      {file && (
        <div className="px-6 pb-2">
          <div className="inline-flex items-center gap-3 bg-white border border-ice-dark shadow-sm rounded-2xl px-4 py-2.5">
            {file.type.startsWith("image/") ? (
              <img
                src={URL.createObjectURL(file)}
                alt="preview"
                className="w-12 h-12 rounded-xl object-cover border border-ice"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-ice-light text-soft-dark flex items-center justify-center text-2xl border border-ice-dark">
                {getFileIcon(file.name)}
              </div>
            )}
            <div className="flex flex-col mr-2">
              <span className="text-[13px] font-semibold text-gray-700 truncate max-w-[200px]">
                {file.name}
              </span>
              <span className="text-[11px] font-medium text-gray-400">
                {(file.size / 1024).toFixed(0)} KB
              </span>
            </div>
            <button
              onClick={removeFile}
              className="w-7 h-7 rounded-full bg-gray-50 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-400 transition-colors border border-gray-100"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 px-6 pb-6 pt-2">
        <div className="flex items-end gap-3 bg-white rounded-3xl border border-ice-dark shadow-[0_8px_30px_-10px_rgba(114,196,238,0.15)] px-4 py-3 focus-within:border-soft focus-within:shadow-[0_8px_30px_-10px_rgba(114,196,238,0.25)] transition-all duration-300">
          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full bg-ice hover:bg-ice-dark flex items-center justify-center text-soft-dark transition-colors shrink-0 mb-0.5"
            title="Upload file"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Text input */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            rows={1}
            className="flex-1 bg-transparent resize-none text-[15px] text-gray-800 placeholder-gray-400 outline-none py-2.5 max-h-32 mb-0.5"
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={loading || (!input.trim() && !file)}
            className="w-10 h-10 rounded-full bg-gradient-iconic shadow-iconic disabled:opacity-50 disabled:shadow-none hover:scale-105 flex items-center justify-center text-white transition-all duration-300 shrink-0 mb-0.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-0.5"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

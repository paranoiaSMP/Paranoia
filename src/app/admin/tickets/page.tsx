"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Ticket as TicketIcon, 
  MessageSquare, 
  Send, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  User, 
  Shield, 
  ShieldCheck, 
  Search,
  Filter,
  RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface TicketMessage {
  id: string;
  authorName: string;
  authorRole: "USER" | "STAFF" | "SYSTEM";
  authorImage?: string;
  content: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  ticketId: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  userImage?: string;
  minecraftName?: string;
  minecraftUuid?: string;
  category: string;
  title: string;
  description: string;
  details?: string;
  status: "OPEN" | "CLAIMED" | "CLOSED";
  claimedBy?: string;
  closedBy?: string;
  closedAt?: string;
  transcript?: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export default function AdminTicketsPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        if (selectedTicket) {
          const fresh = data.find((t: Ticket) => t.id === selectedTicket.id);
          if (fresh) setSelectedTicket(fresh);
        }
      }
    } catch {
      toast.error("Erreur lors du chargement des tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleClaim = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim" })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket(updated);
        toast.success("Ticket pris en charge !");
        fetchTickets();
      }
    } catch {
      toast.error("Erreur lors de la prise en charge");
    }
  };

  const handleClose = async () => {
    if (!selectedTicket || !confirm("Clôturer ce ticket ?")) return;
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket(updated);
        toast.success("Ticket clôturé !");
        fetchTickets();
      }
    } catch {
      toast.error("Erreur lors de la fermeture");
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setReplying(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyText.trim(),
          authorName: session?.user?.name || "Staff Paranoïa"
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket(updated);
        setReplyText("");
        fetchTickets();
      }
    } catch {
      toast.error("Erreur d'envoi du message");
    } finally {
      setReplying(false);
    }
  };

  const downloadTranscript = (ticket: Ticket) => {
    if (!ticket.transcript) return;
    const blob = new Blob([ticket.transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `log-${ticket.ticketId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchId = t.ticketId.toLowerCase().includes(term);
      const matchUser = t.userName.toLowerCase().includes(term);
      const matchMc = t.minecraftName?.toLowerCase().includes(term);
      const matchCat = t.category.toLowerCase().includes(term);
      const matchDesc = t.description.toLowerCase().includes(term);
      return matchId || matchUser || matchMc || matchCat || matchDesc;
    }
    return true;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "OPEN").length,
    claimed: tickets.filter(t => t.status === "CLAIMED").length,
    closed: tickets.filter(t => t.status === "CLOSED").length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--card-border)] pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-fuchsia-500/20 rounded-2xl text-fuchsia-400">
            <TicketIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold font-outfit text-[var(--text-color)] tracking-tight uppercase">
              Gestion des Tickets
            </h2>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Suivi et réponse aux demandes des utilisateurs et signalements.
            </p>
          </div>
        </div>

        <button
          onClick={fetchTickets}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-bg)] hover:bg-[var(--icon-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--text-color)] transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Actualiser
        </button>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusFilter("ALL")}
          className={cn(
            "p-4 rounded-2xl border cursor-pointer transition-all",
            statusFilter === "ALL" ? "bg-fuchsia-500/15 border-fuchsia-500" : "bg-[var(--surface-bg)] border-[var(--card-border)]"
          )}
        >
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</p>
          <p className="text-2xl font-black font-outfit text-[var(--text-color)] mt-1">{stats.total}</p>
        </div>

        <div 
          onClick={() => setStatusFilter("OPEN")}
          className={cn(
            "p-4 rounded-2xl border cursor-pointer transition-all",
            statusFilter === "OPEN" ? "bg-emerald-500/15 border-emerald-500" : "bg-[var(--surface-bg)] border-[var(--card-border)]"
          )}
        >
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Ouverts</p>
          <p className="text-2xl font-black font-outfit text-emerald-400 mt-1">{stats.open}</p>
        </div>

        <div 
          onClick={() => setStatusFilter("CLAIMED")}
          className={cn(
            "p-4 rounded-2xl border cursor-pointer transition-all",
            statusFilter === "CLAIMED" ? "bg-amber-500/15 border-amber-500" : "bg-[var(--surface-bg)] border-[var(--card-border)]"
          )}
        >
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">En cours</p>
          <p className="text-2xl font-black font-outfit text-amber-400 mt-1">{stats.claimed}</p>
        </div>

        <div 
          onClick={() => setStatusFilter("CLOSED")}
          className={cn(
            "p-4 rounded-2xl border cursor-pointer transition-all",
            statusFilter === "CLOSED" ? "bg-zinc-500/15 border-zinc-500" : "bg-[var(--surface-bg)] border-[var(--card-border)]"
          )}
        >
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fermés</p>
          <p className="text-2xl font-black font-outfit text-zinc-400 mt-1">{stats.closed}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un ticket (ID, pseudo, catégorie, description)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface-bg)] border border-[var(--card-border)] text-sm text-[var(--text-color)] focus:outline-none focus:border-fuchsia-500"
          />
        </div>
      </div>

      {/* Main Grid: List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Tickets List */}
        <div className={cn("space-y-3", selectedTicket ? "lg:col-span-5" : "lg:col-span-12")}>
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[var(--surface-bg)] border border-[var(--card-border)] text-[var(--color-text-secondary)] text-sm">
              Aucun ticket ne correspond à ces critères.
            </div>
          ) : (
            filteredTickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4",
                    isSelected 
                      ? "bg-fuchsia-600/10 border-fuchsia-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]" 
                      : "bg-[var(--surface-bg)] border-[var(--card-border)] hover:border-fuchsia-500/30"
                  )}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-fuchsia-400">{t.ticketId}</span>
                      {t.status === "OPEN" && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">
                          Ouvert
                        </span>
                      )}
                      {t.status === "CLAIMED" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase">
                          Claim ({t.claimedBy})
                        </span>
                      )}
                      {t.status === "CLOSED" && (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-[9px] font-black uppercase">
                          Fermé
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-sm text-[var(--text-color)] truncate">{t.category}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">
                      Par <span className="text-[var(--text-color)] font-medium">{t.userName}</span> {t.minecraftName ? `(MC: ${t.minecraftName})` : ""}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Ticket Thread */}
        {selectedTicket && (
          <div className="lg:col-span-7 bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-2xl p-6 flex flex-col h-[700px] shadow-xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--card-border)]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[var(--text-color)]">{selectedTicket.category}</h3>
                  <span className="font-mono text-xs font-bold text-fuchsia-400">{selectedTicket.ticketId}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mt-1">
                  <span>Créé par <strong className="text-[var(--text-color)]">{selectedTicket.userName}</strong></span>
                  {selectedTicket.minecraftName && (
                    <span className="text-purple-300 font-mono">| MC: {selectedTicket.minecraftName}</span>
                  )}
                  {selectedTicket.claimedBy && (
                    <span className="text-amber-400 font-bold">| Claim: {selectedTicket.claimedBy}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {selectedTicket.status === "OPEN" && (
                  <button
                    onClick={handleClaim}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Prendre en charge
                  </button>
                )}

                {selectedTicket.status !== "CLOSED" ? (
                  <button
                    onClick={handleClose}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Clôturer
                  </button>
                ) : (
                  <button
                    onClick={() => downloadTranscript(selectedTicket)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Transcript .txt
                  </button>
                )}

                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--text-color)] hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
              {selectedTicket.details && (
                <div className="p-3.5 rounded-xl bg-black/20 border border-[var(--card-border)] text-xs text-[var(--color-text-secondary)] space-y-1">
                  <p className="font-bold uppercase tracking-wider text-fuchsia-400">Informations complémentaires</p>
                  <p className="whitespace-pre-wrap">{selectedTicket.details}</p>
                </div>
              )}

              {selectedTicket.messages.map((m) => {
                const isStaff = m.authorRole === "STAFF";
                const isSystem = m.authorRole === "SYSTEM";

                if (isSystem) {
                  return (
                    <div key={m.id} className="text-center my-2">
                      <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-white/5 text-[var(--color-text-secondary)] border border-white/10">
                        {m.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      isStaff ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs",
                      isStaff ? "bg-fuchsia-600 text-white" : "bg-zinc-800 text-zinc-300"
                    )}>
                      {isStaff ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>

                    <div className="space-y-1">
                      <div className={cn("flex items-center gap-2 text-[10px]", isStaff ? "justify-end" : "justify-start")}>
                        <span className="font-bold text-[var(--text-color)]">{m.authorName}</span>
                        {isStaff && (
                          <span className="px-1.5 py-0.2 rounded bg-fuchsia-500/20 text-fuchsia-400 text-[8px] font-black uppercase">
                            Staff
                          </span>
                        )}
                        <span className="text-[var(--color-text-secondary)]">
                          {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className={cn(
                        "p-3 rounded-xl text-xs leading-relaxed whitespace-pre-wrap",
                        isStaff 
                          ? "bg-fuchsia-600 text-white rounded-tr-none" 
                          : "bg-black/30 text-[var(--text-color)] border border-[var(--card-border)] rounded-tl-none"
                      )}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input */}
            {selectedTicket.status !== "CLOSED" ? (
              <form onSubmit={handleSendReply} className="pt-3 border-t border-[var(--card-border)] flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Répondre en tant que Staff..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/20 border border-[var(--card-border)] text-xs text-[var(--text-color)] focus:outline-none focus:border-fuchsia-500"
                />
                <button
                  type="submit"
                  disabled={replying || !replyText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Répondre
                </button>
              </form>
            ) : (
              <div className="pt-3 border-t border-[var(--card-border)] text-center text-xs text-[var(--color-text-secondary)] font-bold">
                Ticket archivé et fermé.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

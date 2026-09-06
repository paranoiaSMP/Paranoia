"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import Image from "next/image";
import { 
  Ticket as TicketIcon, 
  PlusCircle, 
  MessageSquare, 
  Send, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  User, 
  Shield, 
  FileText, 
  ChevronRight,
  Sparkles
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

const CATEGORIES = [
  "Signalement joueur",
  "Bug / Problème technique",
  "Question au staff",
  "Suggestion d'amélioration",
  "Demande d'aide / Support",
  "Autre"
];

export default function TicketsPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [minecraftName, setMinecraftName] = useState("");
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const fetchTickets = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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
      if (!silent) toast.error("Impossible de charger les tickets");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(() => {
      fetchTickets(true);
    }, 3500);
    return () => clearInterval(interval);
  }, [session, selectedTicket?.id]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Veuillez détailler votre demande.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          minecraftName: minecraftName.trim() || undefined,
          description: description.trim(),
          details: details.trim() || undefined,
          userName: session?.user?.name || undefined
        })
      });

      if (!res.ok) throw new Error();
      const newTicket = await res.json();
      toast.success("Ticket ouvert avec succès !");
      setModalOpen(false);
      setDescription("");
      setDetails("");
      setMinecraftName("");
      setCategory(CATEGORIES[0]);
      await fetchTickets();
      setSelectedTicket(newTicket);
    } catch {
      toast.error("Erreur lors de l'ouverture du ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setReplying(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyText.trim(),
          authorName: session?.user?.name || "Utilisateur"
        })
      });

      if (!res.ok) throw new Error();
      const updated = await res.json();
      setSelectedTicket(updated);
      setReplyText("");
      fetchTickets();
    } catch {
      toast.error("Erreur d'envoi du message");
    } finally {
      setReplying(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket || !confirm("Fermer ce ticket ? Un transcript sera archivé.")) return;
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket(updated);
        toast.success("Ticket fermé !");
        fetchTickets();
      }
    } catch {
      toast.error("Erreur lors de la fermeture");
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-slide-up">
      {/* Hero Panel Box matching Discord Embed */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl mb-12">
        <div className="relative w-full h-48 sm:h-72 md:h-80 overflow-hidden">
          <Image
            src="https://files.catbox.moe/g1etwk.png"
            alt="Paranoia Studio Tickets"
            fill
            priority
            unoptimized
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg)] via-[var(--card-bg)]/40 to-transparent" />
        </div>

        <div className="p-6 sm:p-10 md:p-12 relative z-10 -mt-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[var(--card-border)]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-bold uppercase tracking-wider mb-3">
                <TicketIcon className="w-3.5 h-3.5" /> Support Officiel
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-outfit font-black text-[var(--text-color)] tracking-tight">
                SYSTÈME DE TICKETS
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-2 max-w-2xl text-sm sm:text-base">
                Bienvenue dans le système de tickets de Paranoia Studio. Notre équipe est à votre écoute pour traiter tout signalement, bug ou demande d'aide.
              </p>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-sm sm:text-base shadow-[0_0_25px_rgba(168,85,247,0.35)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            >
              <PlusCircle className="w-5 h-5" />
              Ouvrir un ticket
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
            <div className="space-y-3">
              <h3 className="font-bold text-[var(--text-color)] flex items-center gap-2 text-base">
                <AlertCircle className="w-4 h-4 text-fuchsia-400" />
                À quoi servent les tickets ?
              </h3>
              <ul className="text-xs sm:text-sm text-[var(--color-text-secondary)] space-y-1.5 pl-2">
                <li>— Signaler un joueur ou un comportement inapproprié</li>
                <li>— Signaler un problème technique ou un bug</li>
                <li>— Poser une question au staff</li>
                <li>— Faire une suggestion pour améliorer le serveur</li>
                <li>— Demander de l’aide sur le serveur ou le Discord</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-[var(--text-color)] flex items-center gap-2 text-base">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Comment ça fonctionne ?
              </h3>
              <ol className="text-xs sm:text-sm text-[var(--color-text-secondary)] space-y-1.5 pl-2 list-decimal list-inside">
                <li>Appuie sur le bouton <span className="text-fuchsia-400 font-bold">"Ouvrir un ticket"</span>.</li>
                <li>Décris clairement ta demande et fournis les détails.</li>
                <li>Un membre du staff prendra ta demande en charge rapidement.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Content Layout: Tickets List + Active Ticket View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Tickets List */}
        <div className={cn("space-y-4", selectedTicket ? "lg:col-span-5" : "lg:col-span-12")}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-outfit text-[var(--text-color)] flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-fuchsia-400" />
              Vos Tickets ({tickets.length})
            </h2>
            <button
              onClick={fetchTickets}
              className="text-xs text-[var(--color-text-secondary)] hover:text-fuchsia-400 font-bold transition-colors"
            >
              Actualiser
            </button>
          </div>

          {loading ? (
            <div className="p-8 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center text-[var(--color-text-secondary)]">
              Chargement des tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-10 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center space-y-3">
              <TicketIcon className="w-10 h-10 text-[var(--color-text-secondary)] mx-auto opacity-40" />
              <p className="text-[var(--text-color)] font-bold">Aucun ticket pour le moment</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Vous n'avez ouvert aucun ticket de support. Cliquez sur "Ouvrir un ticket" pour contacter l'équipe.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={cn(
                      "p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4",
                      isSelected
                        ? "bg-fuchsia-600/10 border-fuchsia-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                        : "bg-[var(--card-bg)] border-[var(--card-border)] hover:border-fuchsia-500/40"
                    )}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-fuchsia-400">{t.ticketId}</span>
                        {t.status === "OPEN" && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                            Ouvert
                          </span>
                        )}
                        {t.status === "CLAIMED" && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase">
                            En cours
                          </span>
                        )}
                        {t.status === "CLOSED" && (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-[10px] font-black uppercase">
                            Fermé
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-sm text-[var(--text-color)] truncate">{t.category}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">{t.description}</p>
                    </div>

                    <ChevronRight className={cn("w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition-transform", isSelected && "text-fuchsia-400 translate-x-1")} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Detailed Conversation Thread */}
        {selectedTicket && (
          <div className="lg:col-span-7 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[2rem] p-6 sm:p-8 flex flex-col h-[700px] shadow-2xl">
            {/* Ticket Header */}
            <div className="flex items-start justify-between gap-4 pb-6 border-b border-[var(--card-border)]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold font-outfit text-[var(--text-color)]">{selectedTicket.category}</h3>
                  <span className="font-mono text-xs font-bold text-fuchsia-400">{selectedTicket.ticketId}</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Ouvert le {new Date(selectedTicket.createdAt).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })} par <span className="font-bold text-[var(--text-color)]">{selectedTicket.userName}</span>
                </p>
                {selectedTicket.minecraftName && (
                  <div className="flex items-center gap-2 mt-2">
                    <img
                      src={`https://vzge.me/face/512/${encodeURIComponent(selectedTicket.minecraftName)}.png`}
                      alt="MC Avatar"
                      className="w-5 h-5 rounded-md"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <span className="text-xs font-mono font-bold text-purple-300">
                      MC: {selectedTicket.minecraftName}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {selectedTicket.status === "CLOSED" ? (
                  <button
                    onClick={() => downloadTranscript(selectedTicket)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Transcript
                  </button>
                ) : (
                  <button
                    onClick={handleCloseTicket}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Fermer
                  </button>
                )}
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--text-color)] hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-2">
              {selectedTicket.details && (
                <div className="p-4 rounded-2xl bg-[var(--surface-bg)] border border-[var(--card-border)] text-xs text-[var(--color-text-secondary)] space-y-1">
                  <p className="font-bold uppercase tracking-wider text-fuchsia-400">Informations complémentaires</p>
                  <p className="whitespace-pre-wrap">{selectedTicket.details}</p>
                </div>
              )}

              {selectedTicket.messages.map((m) => {
                const isUser = m.authorRole === "USER";
                const isStaff = m.authorRole === "STAFF";
                const isSystem = m.authorRole === "SYSTEM";

                if (isSystem) {
                  return (
                    <div key={m.id} className="text-center my-3">
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/5 text-[var(--color-text-secondary)] border border-white/10">
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
                      isUser ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs",
                      isStaff ? "bg-fuchsia-600 text-white" : "bg-zinc-800 text-zinc-300"
                    )}>
                      {isStaff ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className={cn("flex items-center gap-2 text-[11px]", isUser ? "justify-end" : "justify-start")}>
                        <span className="font-bold text-[var(--text-color)]">{m.authorName}</span>
                        {isStaff && (
                          <span className="px-1.5 py-0.2 rounded bg-fuchsia-500/20 text-fuchsia-400 text-[9px] font-black uppercase">
                            Staff
                          </span>
                        )}
                        <span className="text-[var(--color-text-secondary)]">
                          {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className={cn(
                        "p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                        isUser 
                          ? "bg-fuchsia-600 text-white rounded-tr-none" 
                          : "bg-[var(--surface-bg)] text-[var(--text-color)] border border-[var(--card-border)] rounded-tl-none"
                      )}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Bar */}
            {selectedTicket.status !== "CLOSED" ? (
              <form onSubmit={handleSendMessage} className="pt-4 border-t border-[var(--card-border)] flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Écrivez votre réponse..."
                  className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-bg)] border border-[var(--card-border)] text-sm text-[var(--text-color)] focus:outline-none focus:border-fuchsia-500"
                />
                <button
                  type="submit"
                  disabled={replying || !replyText.trim()}
                  className="px-5 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-bold text-sm flex items-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="pt-4 border-t border-[var(--card-border)] text-center text-xs text-[var(--color-text-secondary)] font-bold">
                Ce ticket est fermé. Aucun nouveau message ne peut être envoyé.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[2.5rem] w-full max-w-xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-6 border-b border-[var(--card-border)]">
              <div>
                <h3 className="text-2xl font-bold font-outfit text-[var(--text-color)]">
                  Ouvrir un ticket
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Remplissez ce formulaire pour transmettre votre demande au staff.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--text-color)] hover:bg-white/5"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-6 mt-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                  Type de demande *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--surface-bg)] border border-[var(--card-border)] text-sm text-[var(--text-color)] font-medium focus:outline-none focus:border-fuchsia-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                  Votre pseudo Minecraft (Optionnel)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={minecraftName}
                    onChange={(e) => setMinecraftName(e.target.value)}
                    placeholder="Ex: Notch"
                    className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-bg)] border border-[var(--card-border)] text-sm text-[var(--text-color)] focus:outline-none focus:border-fuchsia-500"
                  />
                  {minecraftName.trim() && (
                    <div className="w-12 h-12 rounded-xl border border-[var(--card-border)] bg-black/40 overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={`https://vzge.me/bust/512/${encodeURIComponent(minecraftName.trim())}.png`}
                        alt="Preview Skin"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                  Description de la demande *
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Expliquez en détail votre problème ou votre question..."
                  className="w-full px-4 py-3 rounded-xl bg-[var(--surface-bg)] border border-[var(--card-border)] text-sm text-[var(--text-color)] focus:outline-none focus:border-fuchsia-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                  Informations complémentaires / Preuves
                </label>
                <textarea
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Coordonnées, liens vidéos ou images, logs..."
                  className="w-full px-4 py-3 rounded-xl bg-[var(--surface-bg)] border border-[var(--card-border)] text-sm text-[var(--text-color)] focus:outline-none focus:border-fuchsia-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--card-border)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-[var(--color-text-secondary)] hover:text-[var(--text-color)] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all"
                >
                  {submitting ? "Envoi..." : "Envoyer le ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

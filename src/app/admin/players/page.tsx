"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Users, Loader2, Ban, ShieldCheck } from "lucide-react";
import toast from 'react-hot-toast';

type Player = {
  id: string;
  minecraftName: string;
  status: string;
};

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/players");
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error("Failed to fetch players:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minecraftName: newPlayerName.trim() }),
      });

      if (res.ok) {
        setNewPlayerName("");
        fetchPlayers();
        toast.success("Joueur ajouté avec succès !");
      } else {
        const msg = await res.text();
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      setError("Erreur de connexion");
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlayer = (id: string) => {
    const confirmDelete = window.confirm("Êtes-vous sûr de vouloir supprimer ce joueur ?");
    if (!confirmDelete) return;

    const execute = async () => {
        try {
          const res = await fetch(`/api/players?id=${id}`, { method: "DELETE" });
          if (res.ok) {
            toast.success("Joueur supprimé !");
            fetchPlayers();
          } else toast.error("Erreur lors de la suppression.");
        } catch (e) {
          console.error(e);
          toast.error("Erreur serveur");
        }
    };
    execute();
  };

  const handleToggleBan = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "BANNED" ? "ACTIVE" : "BANNED";
    try {
      setLoading(true);
      const res = await fetch("/api/players", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        toast.success(newStatus === "BANNED" ? "Joueur banni !" : "Joueur débanni !");
        fetchPlayers();
      } else {
        toast.error("Erreur lors de la mise à jour du statut.");
      }
    } catch (e) {
      toast.error("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-12">
      <div className="flex items-center gap-4 border-b border-[var(--card-border)] pb-6">
        <div className="p-3 bg-blue-500/20 rounded-2xl">
          <Users className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h2 className="text-3xl font-bold font-outfit text-[var(--text-color)]">Base de Joueurs</h2>
          <p className="text-[var(--color-text-secondary)]">Gérez les joueurs enregistrés sur le serveur.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        {/* Form Column */}
        <div className="xl:col-span-1">
          <div className="bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--card-border)] sticky top-8">
            <h3 className="text-xl font-bold text-[var(--text-color)] mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" /> Ajouter un Joueur
            </h3>
            <form onSubmit={handleAddPlayer} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 uppercase tracking-widest">Pseudo Minecraft</label>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-[var(--text-color)] outline-none focus:border-blue-500 transition-all shadow-inner"
                  placeholder="Ex: Notch"
                  disabled={loading}
                />
              </div>
              {error && <p className="text-red-400 text-xs font-medium bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}
              <button 
                type="submit" 
                disabled={loading || !newPlayerName.trim()} 
                className="w-full btn-primary py-4 flex items-center justify-center gap-2 font-black uppercase tracking-wider"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {loading ? "Traitement..." : "Enregistrer"}
              </button>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="xl:col-span-2">
          <div className="bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--card-border)]">
            <h3 className="text-xl font-bold text-[var(--text-color)] mb-6">Joueurs Actuels ({players.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {players.map(player => (
                <div key={player.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 flex items-center justify-between group hover:border-blue-500/30 transition-all hover:bg-[#16161f]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[var(--surface-bg)] rounded-xl flex items-center justify-center overflow-hidden border border-[var(--card-border)] group-hover:border-blue-500/20 transition-colors">
                      <img src={`https://vzge.me/bust/512/${player.minecraftName}.png`} alt={player.minecraftName} className="w-10 h-10 object-contain drop-shadow-md" />
                    </div>
                    <div>
                        <span className="font-black text-[var(--text-color)] uppercase tracking-tight flex items-center gap-2">
                          {player.minecraftName}
                          {player.status === "BANNED" && (
                            <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded border border-red-500/30 font-bold tracking-widest">
                              BANNI
                            </span>
                          )}
                        </span>
                        <p className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-widest">{player.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleToggleBan(player.id, player.status)} 
                      className={`transition-all p-3 rounded-xl hover:bg-opacity-20 ${player.status === "BANNED" ? "text-green-500 hover:bg-green-500/10" : "text-orange-500 hover:bg-orange-500/10"}`}
                      title={player.status === "BANNED" ? "Débannir" : "Bannir"}
                    >
                      {player.status === "BANNED" ? <ShieldCheck className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={() => handleDeletePlayer(player.id)} 
                      className="text-[var(--color-text-secondary)] hover:text-red-500 transition-all p-3 rounded-xl hover:bg-red-500/10"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {players.length === 0 && !loading && (
                <p className="text-[var(--color-text-secondary)] col-span-full py-12 text-center border border-dashed border-[var(--card-border)] rounded-2xl italic">
                  Aucun joueur enregistré. Utilisez le formulaire pour commencer.
                </p>
              )}
              {loading && players.length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center gap-4 text-blue-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="font-bold uppercase tracking-widest text-xs">Synchronisation...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Trash2, Users, Sparkles, Loader2, PackageOpen, Zap, Info, X, UserX } from "lucide-react";
import toast from 'react-hot-toast';
import { cn } from "@/lib/utils";

export default function AdminModerationPage() {
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [godCardId, setGodCardId] = useState("");
  const [godPlayerId, setGodPlayerId] = useState("");
  const [godBoxType, setGodBoxType] = useState("standard");
  const [godBoxAmount, setGodBoxAmount] = useState(1);

  const [selectedUserEconomy, setSelectedUserEconomy] = useState<any>(null);
  const [economyActionAmount, setEconomyActionAmount] = useState<number>(1);
  const [economyActionType, setEconomyActionType] = useState<"set_coins" | "set_booster">("set_coins");
  const [economyBoxType, setEconomyBoxType] = useState<string>("standard");
  const [isUpdatingEconomy, setIsUpdatingEconomy] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resU, resC] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/cards")
      ]);
      if (resU.ok) setAppUsers(await resU.json());
      if (resC.ok) setCards(await resC.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGodAction = async (action: string) => {
    if (action.includes("ALL") && !window.confirm(`Action critique : ${action}. Confirmer ?`)) return;
    try {
      const user = appUsers.find(u => u.id === godPlayerId);
      const res = await fetch("/api/admin/cards/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, cardId: godCardId, minecraftName: user?.minecraftName, userId: godPlayerId })
      });
      if (res.ok) toast.success("Action exécutée !");
      else toast.error(await res.text());
    } catch (e) { toast.error("Erreur"); }
  };

  const handleGiveBox = async () => {
    if (!godPlayerId) return toast.error("Sélectionnez un utilisateur");
    try {
      const res = await fetch("/api/admin/cards/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GIVE_BOX", userId: godPlayerId, boxType: godBoxType, amount: godBoxAmount, cardId: "box" })
      });
      if (res.ok) toast.success("Box distribuée !");
      else toast.error(await res.text());
    } catch (e) { toast.error("Erreur"); }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        fetchData();
        toast.success("Rôle mis à jour");
      }
    } catch (err) { toast.error("Erreur"); }
  };

  const handleEconomyAction = async () => {
    if (!selectedUserEconomy) return;
    setIsUpdatingEconomy(true);
    try {
      const res = await fetch("/api/admin/users/economy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserEconomy.id, action: economyActionType, amount: economyActionAmount, boxType: economyBoxType }),
      });
      if (res.ok) {
        toast.success("Économie mise à jour");
        setSelectedUserEconomy(null);
        fetchData();
      }
    } catch (err) { toast.error("Erreur"); }
    finally { setIsUpdatingEconomy(false); }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmed = window.confirm(`⚠️ ATTENTION : Vous êtes sur le point de supprimer définitivement le compte de "${userName}".\n\nCela supprimera :\n- Son compte Discord lié\n- Toutes ses cartes\n- Tous ses boosters\n- Tous ses ParaCoins\n\nCette action est IRRÉVERSIBLE. Confirmer ?`);
    if (!confirmed) return;

    const doubleConfirm = window.confirm(`Dernière confirmation : Supprimer "${userName}" pour toujours ?`);
    if (!doubleConfirm) return;

    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`Compte de ${userName} supprimé définitivement.`);
        fetchData();
      } else {
        const msg = await res.text();
        toast.error(msg);
      }
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-4 border-b border-[var(--card-border)] pb-8">
        <div className="p-3 bg-red-500/20 rounded-2xl text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold font-outfit text-[var(--text-color)] tracking-tight uppercase">Modération & Système</h2>
          <p className="text-[var(--color-text-secondary)]">Gestion des inventaires, rôles et économie globale.</p>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-red-950/10 border border-red-500/20 p-8 rounded-[2.5rem] relative overflow-hidden space-y-8">
            <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldAlert className="w-32 h-32 text-red-500" /></div>
            <h3 className="text-xl font-black text-[var(--text-color)] uppercase tracking-tighter flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-red-500" /> Card Manager (GOD MODE)
            </h3>
            
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2 ml-1">Carte Cible</label>
                        <select value={godCardId} onChange={e => setGodCardId(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-[var(--text-color)] outline-none focus:border-red-500">
                            <option value="">-- Choisir une carte --</option>
                            {cards.map(c => <option key={c.id} value={c.id}>{c.title} ({c.rarity})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2 ml-1">Joueur Cible</label>
                        <select value={godPlayerId} onChange={e => setGodPlayerId(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-[var(--text-color)] outline-none focus:border-red-500">
                            <option value="">-- Choisir un utilisateur --</option>
                            {appUsers.filter(u => u.minecraftName).map(u => <option key={u.id} value={u.id}>{u.name} ({u.minecraftName})</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <button onClick={() => handleGodAction("GIVE")} disabled={!godCardId || !godPlayerId} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[var(--text-color)] font-bold py-3 rounded-xl transition-all text-[10px] uppercase">Donner</button>
                    <button onClick={() => handleGodAction("REMOVE")} disabled={!godCardId || !godPlayerId} className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-[var(--text-color)] font-bold py-3 rounded-xl transition-all text-[10px] uppercase">Retirer</button>
                    <button onClick={() => handleGodAction("GIVE_ALL")} disabled={!godCardId} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-[var(--text-color)] font-bold py-3 rounded-xl transition-all text-[10px] uppercase">Give All</button>
                    <button onClick={() => handleGodAction("WIPE_ALL")} disabled={!godCardId} className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-[var(--text-color)] font-bold py-3 rounded-xl transition-all text-[10px] uppercase">Wipe All</button>
                    <button onClick={() => handleGodAction("WIPE_PLAYER")} disabled={!godPlayerId} className="bg-black border border-red-900 text-red-500 font-bold py-3 rounded-xl transition-all text-[10px] uppercase">Wipe Inv</button>
                </div>
            </div>
        </div>

        <div className="bg-indigo-950/10 border border-indigo-500/20 p-8 rounded-[2.5rem] space-y-8">
            <h3 className="text-xl font-black text-[var(--text-color)] uppercase tracking-tighter flex items-center gap-3">
                <PackageOpen className="w-5 h-5 text-indigo-400" /> Distribution de Boosters
            </h3>
            <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2 ml-1">Type de Box</label>
                    <select value={godBoxType} onChange={e => setGodBoxType(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-[var(--text-color)] outline-none focus:border-indigo-500">
                        <option value="standard">Box Standard</option>
                        <option value="premium">Box Premium</option>
                        <option value="mythic">Box Mythique</option>
                    </select>
                </div>
                <div className="w-24">
                    <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-2 ml-1">Qte</label>
                    <input type="number" min="1" value={godBoxAmount} onChange={e => setGodBoxAmount(parseInt(e.target.value))} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-[var(--text-color)] outline-none" />
                </div>
                <button onClick={handleGiveBox} disabled={!godPlayerId} className="px-8 bg-indigo-600 hover:bg-indigo-500 text-[var(--text-color)] font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20">Attribuer</button>
            </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--card-border)] overflow-hidden">
          <div className="p-8 border-b border-[var(--card-border)] bg-[var(--surface-bg)]">
            <h3 className="text-xl font-bold text-[var(--text-color)] flex items-center gap-3">
                <Users className="w-5 h-5 text-[var(--color-text-secondary)]" /> Registre des Utilisateurs ({appUsers.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-[var(--surface-bg)] text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-[0.2em]">
                    <tr>
                        <th className="px-8 py-4">Utilisateur</th>
                        <th className="px-8 py-4">Inscription</th>
                        <th className="px-8 py-4">Rôle</th>
                        <th className="px-8 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {appUsers.map(user => (
                        <tr key={user.id} className="group hover:bg-[var(--surface-bg)] transition-colors">
                            <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                    {user.image ? <img src={user.image} referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = "https://cdn.discordapp.com/embed/avatars/0.png" }} className="w-10 h-10 rounded-full border border-[var(--card-border)] shadow-lg" /> : <div className="w-10 h-10 rounded-full bg-[var(--icon-bg)] border border-[var(--card-border)] flex items-center justify-center text-xs">?</div>}
                                    <div>
                                        <p className="font-bold text-[var(--text-color)]">{user.name || "Anonyme"}</p>
                                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{user.minecraftName || "Non lié"}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-5 text-sm text-[var(--color-text-secondary)] font-medium">
                                {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-8 py-5">
                                <select 
                                    value={user.role} 
                                    onChange={e => handleRoleChange(user.id, e.target.value)}
                                    className={cn(
                                        "bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none transition-all",
                                        user.role === 'ADMIN' ? "text-red-400 border-red-500/30" : user.role === 'MODERATOR' ? "text-purple-400 border-purple-500/30" : "text-[var(--color-text-secondary)]"
                                    )}
                                >
                                    <option value="MEMBER">MEMBER</option>
                                    <option value="MODERATOR">MODERATOR</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </td>
                            <td className="px-8 py-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => setSelectedUserEconomy(user)} className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-[var(--text-color)] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Économie</button>
                                  <button onClick={() => handleDeleteUser(user.id, user.name || user.minecraftName || 'Anonyme')} className="bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white p-2 rounded-xl transition-all group" title="Supprimer le compte">
                                    <UserX className="w-4 h-4" />
                                  </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
      </div>

      {/* Economy Modal */}
      {selectedUserEconomy && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 dark:bg-black/90 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[3rem] p-10 max-w-md w-full shadow-[0_0_100px_rgba(0,0,0,0.8)] space-y-8 animate-slide-up">
                  <div className="flex justify-between items-start">
                    <div>
                        <h4 className="text-2xl font-black text-[var(--text-color)] uppercase tracking-tighter">{selectedUserEconomy.name}</h4>
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Ajustement Économique</p>
                    </div>
                    <button onClick={() => setSelectedUserEconomy(null)} className="p-2 bg-[var(--icon-bg)] rounded-full hover:bg-[var(--icon-bg)] text-[var(--color-text-secondary)] transition-colors"><X className="w-6 h-6" /></button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[var(--surface-bg)] p-4 rounded-2xl border border-[var(--card-border)]">
                        <p className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase mb-2">Coins</p>
                        <p className="text-2xl font-black text-[var(--text-color)]">{selectedUserEconomy.paraCoins || 0}</p>
                      </div>
                      <div className="bg-[var(--surface-bg)] p-4 rounded-2xl border border-[var(--card-border)]">
                        <p className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase mb-2">Boosters</p>
                        <p className="text-lg font-black text-indigo-400">
                            {selectedUserEconomy.boxes?.reduce((acc: number, b: any) => acc + b.amount, 0) || 0}
                        </p>
                      </div>
                  </div>

                  <div className="space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-3">Action</label>
                          <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => setEconomyActionType("set_coins")} className={cn("py-3 rounded-xl text-[10px] font-black uppercase transition-all", economyActionType === "set_coins" ? "bg-white text-black" : "bg-[var(--icon-bg)] text-[var(--color-text-secondary)]")}>PARA COINS</button>
                              <button onClick={() => setEconomyActionType("set_booster")} className={cn("py-3 rounded-xl text-[10px] font-black uppercase transition-all", economyActionType === "set_booster" ? "bg-white text-black" : "bg-[var(--icon-bg)] text-[var(--color-text-secondary)]")}>BOOSTERS</button>
                          </div>
                      </div>

                      {economyActionType === "set_booster" && (
                          <div className="animate-slide-up">
                              <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-3">Type de Booster</label>
                              <select value={economyBoxType} onChange={e => setEconomyBoxType(e.target.value)} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-[var(--text-color)] outline-none">
                                  <option value="standard">Standard</option>
                                  <option value="premium">Premium</option>
                                  <option value="legendary">Légendaire</option>
                                  <option value="mythic">Mythique</option>
                              </select>
                          </div>
                      )}

                      <div>
                          <label className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest mb-3">Nouvelle Valeur</label>
                          <input type="number" min="0" value={economyActionAmount} onChange={e => setEconomyActionAmount(parseInt(e.target.value))} className="w-full bg-[var(--surface-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-2xl font-black text-[var(--text-color)] outline-none text-center" />
                      </div>
                  </div>

                  <button onClick={handleEconomyAction} disabled={isUpdatingEconomy} className="w-full btn-primary py-5 uppercase font-black tracking-[0.2em] shadow-2xl">
                      {isUpdatingEconomy ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Appliquer les changements"}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}

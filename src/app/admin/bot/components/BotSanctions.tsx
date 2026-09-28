"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Warn = {
  id: string;
  userId: string;
  reason: string;
  authorId: string;
  createdAt: string;
};

export default function BotSanctions() {
  const [warns, setWarns] = useState<Warn[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWarns = async () => {
    try {
      const res = await fetch("/api/admin/bot/warns");
      if (res.ok) {
        setWarns(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarns();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet avertissement ?")) return;
    try {
      const res = await fetch(/api/admin/bot/warns?id= + id, { method: "DELETE" });
      if (res.ok) {
        setWarns(warns.filter(w => w.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-sm text-neutral-500">Chargement des sanctions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-bold text-white tracking-tight">Registre des Avertissements</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          GÃ©rez les sanctions (/warn) appliquÃ©es sur le serveur Discord.
        </p>
      </div>

      {warns.length === 0 ? (
        <div className="p-4 bg-black/20 rounded-xl border border-[var(--card-border)] text-sm text-neutral-400">
          Aucun avertissement enregistrÃ©.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--card-border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 border-b border-[var(--card-border)]">
              <tr>
                <th className="p-3 font-medium text-neutral-300">Membre (ID)</th>
                <th className="p-3 font-medium text-neutral-300">Motif</th>
                <th className="p-3 font-medium text-neutral-300">Auteur (ID)</th>
                <th className="p-3 font-medium text-neutral-300">Date</th>
                <th className="p-3 font-medium text-right text-neutral-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {warns.map((w) => (
                <tr key={w.id} className="bg-black/20 hover:bg-black/30 transition-colors">
                  <td className="p-3 text-white">{w.userId}</td>
                  <td className="p-3 text-neutral-300">{w.reason}</td>
                  <td className="p-3 text-neutral-400">{w.authorId}</td>
                  <td className="p-3 text-neutral-500">{new Date(w.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => handleDelete(w.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import { 
  createDiscordTicketChannel, 
  sendDiscordTicketMessage, 
  closeDiscordTicketChannel 
} from "@/lib/discord-ticket";

export interface TicketMessage {
  id: string;
  authorName: string;
  authorRole: "USER" | "STAFF" | "SYSTEM";
  authorImage?: string;
  content: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketId: string;
  discordChannelId?: string;
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

import os from "os";

const DATA_DIR = path.join(process.cwd(), "data");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");
const FALLBACK_FILE = path.join(os.tmpdir(), "paranoia_tickets.json");

let memoryTickets: Ticket[] = [];

async function getFilePath(): Promise<string> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(TICKETS_FILE).catch(async () => {
      await fs.writeFile(TICKETS_FILE, JSON.stringify(memoryTickets, null, 2), "utf-8");
    });
    return TICKETS_FILE;
  } catch {
    try {
      await fs.access(FALLBACK_FILE).catch(async () => {
        await fs.writeFile(FALLBACK_FILE, JSON.stringify(memoryTickets, null, 2), "utf-8");
      });
      return FALLBACK_FILE;
    } catch {
      return "";
    }
  }
}

export async function getAllTickets(): Promise<Ticket[]> {
  try {
    const file = await getFilePath();
    if (!file) return [...memoryTickets];
    const raw = await fs.readFile(file, "utf-8");
    const tickets: Ticket[] = JSON.parse(raw);
    memoryTickets = tickets;
    return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [...memoryTickets];
  }
}

async function saveTickets(tickets: Ticket[]): Promise<void> {
  memoryTickets = tickets;
  try {
    const file = await getFilePath();
    if (file) {
      await fs.writeFile(file, JSON.stringify(tickets, null, 2), "utf-8");
    }
  } catch {}
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const tickets = await getAllTickets();
  return tickets.find(t => t.id === id || t.ticketId === id) || null;
}

export async function createTicket(payload: {
  userName: string;
  userId?: string;
  userEmail?: string;
  userImage?: string;
  minecraftName?: string;
  category: string;
  description: string;
  details?: string;
}): Promise<Ticket> {
  const tickets = await getAllTickets();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
  const ticketId = `TKT-${dateStr}-${randomHex}`;

  let uuid: string | undefined = undefined;
  let exactName = payload.minecraftName?.trim();

  if (exactName) {
    try {
      const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(exactName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          uuid = data.id;
          exactName = data.name || exactName;
        }
      }
    } catch {}
  }

  const newTicket: Ticket = {
    id: crypto.randomUUID(),
    ticketId,
    userId: payload.userId,
    userName: payload.userName || "Utilisateur",
    userEmail: payload.userEmail,
    userImage: payload.userImage,
    minecraftName: exactName || undefined,
    minecraftUuid: uuid,
    category: payload.category || "Aide",
    title: `${payload.category} - ${payload.userName}`,
    description: payload.description,
    details: payload.details,
    status: "OPEN",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    messages: [
      {
        id: crypto.randomUUID(),
        authorName: payload.userName || "Utilisateur",
        authorRole: "USER",
        authorImage: payload.userImage,
        content: payload.description,
        createdAt: now.toISOString(),
      }
    ]
  };

  const discordChannelId = await createDiscordTicketChannel({
    id: newTicket.id,
    ticketId: newTicket.ticketId,
    userName: newTicket.userName,
    minecraftName: newTicket.minecraftName,
    category: newTicket.category,
    description: newTicket.description,
    details: newTicket.details,
  }).catch(() => null);

  if (discordChannelId) {
    newTicket.discordChannelId = discordChannelId;
  }

  tickets.unshift(newTicket);
  await saveTickets(tickets);
  return newTicket;
}

export async function addMessageToTicket(
  id: string,
  message: { authorName: string; authorRole: "USER" | "STAFF" | "SYSTEM"; authorImage?: string; content: string },
  options?: { skipDiscord?: boolean }
): Promise<Ticket | null> {
  const tickets = await getAllTickets();
  const idx = tickets.findIndex(t => t.id === id || t.ticketId === id);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  const newMsg: TicketMessage = {
    id: crypto.randomUUID(),
    authorName: message.authorName,
    authorRole: message.authorRole,
    authorImage: message.authorImage,
    content: message.content,
    createdAt: now,
  };

  tickets[idx].messages.push(newMsg);
  tickets[idx].updatedAt = now;
  await saveTickets(tickets);

  if (!options?.skipDiscord && tickets[idx].discordChannelId) {
    sendDiscordTicketMessage(
      tickets[idx].discordChannelId,
      message.authorName,
      message.authorRole,
      message.content
    ).catch(() => null);
  }

  return tickets[idx];
}

export async function claimTicket(id: string, staffName: string): Promise<Ticket | null> {
  const tickets = await getAllTickets();
  const idx = tickets.findIndex(t => t.id === id || t.ticketId === id);
  if (idx === -1) return null;

  tickets[idx].status = "CLAIMED";
  tickets[idx].claimedBy = staffName;
  tickets[idx].updatedAt = new Date().toISOString();
  tickets[idx].messages.push({
    id: crypto.randomUUID(),
    authorName: "Système",
    authorRole: "SYSTEM",
    content: `Ticket pris en charge par ${staffName}.`,
    createdAt: new Date().toISOString(),
  });

  await saveTickets(tickets);
  return tickets[idx];
}

export function generateTranscriptText(ticket: Ticket): string {
  const logId = `LOG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const lines: string[] = [
    `ID du log : ${logId}`,
    `ID du ticket : ${ticket.ticketId}`,
    `Client : ${ticket.userName} (${ticket.userId || "Web"})`,
    `Pseudo MC : ${ticket.minecraftName || "Non renseigné"}${ticket.minecraftUuid ? ` (${ticket.minecraftUuid})` : ""}`,
    `Type de demande : ${ticket.category}`,
    `Admin claim : ${ticket.claimedBy || "Aucun"}`,
    `Statut : ${ticket.status}`,
    `Date d'ouverture : ${ticket.createdAt}`,
    `Date de fermeture : ${ticket.closedAt || new Date().toISOString()}`,
    "=".repeat(64),
    ""
  ];

  for (const m of ticket.messages) {
    const d = new Date(m.createdAt);
    const dateFormatted = d.toISOString().replace("T", " ").slice(0, 19);
    lines.push(`[${dateFormatted}] ${m.authorName} [${m.authorRole}]: ${m.content}`);
  }

  return lines.join("\n");
}

export async function closeTicket(id: string, closedByName: string): Promise<Ticket | null> {
  const tickets = await getAllTickets();
  const idx = tickets.findIndex(t => t.id === id || t.ticketId === id);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  tickets[idx].status = "CLOSED";
  tickets[idx].closedBy = closedByName;
  tickets[idx].closedAt = now;
  tickets[idx].updatedAt = now;
  tickets[idx].transcript = generateTranscriptText(tickets[idx]);

  tickets[idx].messages.push({
    id: crypto.randomUUID(),
    authorName: "Système",
    authorRole: "SYSTEM",
    content: `Ticket fermé par ${closedByName}.`,
    createdAt: now,
  });

  if (tickets[idx].discordChannelId) {
    closeDiscordTicketChannel(tickets[idx].discordChannelId, closedByName).catch(() => null);
  }

  await saveTickets(tickets);
  return tickets[idx];
}

export const TICKET_CATEGORIES = [
  "Signalement joueur",
  "Bug / Problème technique",
  "Question au staff",
  "Suggestion d'amélioration",
  "Demande d'aide / Support",
  "Autre",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

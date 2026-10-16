-- Échanges de cartes. À lancer une fois en prod (jamais prisma db push : il supprimerait les tables du bot).
CREATE TABLE IF NOT EXISTS "CardTrade" (
  "id" TEXT PRIMARY KEY,
  "fromId" TEXT NOT NULL,
  "toId" TEXT NOT NULL,
  "offered" TEXT[] NOT NULL,
  "requested" TEXT[] NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "CardTrade_fromId_idx" ON "CardTrade"("fromId");
CREATE INDEX IF NOT EXISTS "CardTrade_toId_idx" ON "CardTrade"("toId");

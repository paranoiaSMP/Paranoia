-- DEV UNIQUEMENT : compte factice « TestBot » avec toutes les cartes publiées, en 3 exemplaires (sans effet, Holo, Noël 2026).
-- Relançable sans doublon. Ne jamais lancer en prod.
INSERT INTO "User"(id,"minecraftName",role,"paraCoins") VALUES ('test-user','TestBot','MEMBER',5000) ON CONFLICT (id) DO NOTHING;
INSERT INTO "UserCard"(id,"userId","tradingCardId","specialEffect")
SELECT 'tb-'||c.id||'-'||e.n, 'test-user', c.id, e.fx
FROM "TradingCard" c
CROSS JOIN (VALUES (1, NULL), (2, 'Holo'), (3, 'Noël 2026')) AS e(n, fx)
ON CONFLICT (id) DO NOTHING;

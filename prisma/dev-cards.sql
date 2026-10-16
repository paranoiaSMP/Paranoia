-- DEV UNIQUEMENT : 36 cartes factices publiées (10 Communes, 8 Peu communes, 7 Rares, 5 Épiques, 4 Légendaires, 2 Mythiques), sur 2 éditions.
-- Relançable sans doublon. Ne jamais lancer en prod. Pour les supprimer : DELETE FROM "TradingCard" WHERE id LIKE 'dev-card-%';
INSERT INTO "TradingCard"(id,title,"playerId",rarity,edition,"isPublished","authorId","updatedAt")
SELECT 'dev-card-'||n,
       'Test '||r.label||' '||n,
       (SELECT "playerId" FROM "TradingCard" WHERE "playerId" IS NOT NULL LIMIT 1),
       r.key,
       CASE WHEN n % 2 = 0 THEN 'Saison 1' ELSE 'Standard' END,
       true,
       (SELECT id FROM "User" WHERE role = 'DEV' ORDER BY "createdAt" LIMIT 1),
       now()
FROM generate_series(1,36) n
JOIN LATERAL (
  SELECT CASE WHEN n <= 10 THEN 'COMMON' WHEN n <= 18 THEN 'UNCOMMON' WHEN n <= 25 THEN 'RARE'
              WHEN n <= 30 THEN 'EPIC' WHEN n <= 34 THEN 'LEGENDARY' ELSE 'MYTHIC' END AS key,
         CASE WHEN n <= 10 THEN 'Commune' WHEN n <= 18 THEN 'Peu commune' WHEN n <= 25 THEN 'Rare'
              WHEN n <= 30 THEN 'Épique' WHEN n <= 34 THEN 'Légendaire' ELSE 'Mythique' END AS label
) r ON true
ON CONFLICT (id) DO NOTHING;

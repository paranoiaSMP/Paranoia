# Tutoriels par cas d'usage

Tous les exemples utilisent des valeurs factices. L'authentification des routes admin est un **cookie de session NextAuth** (connexion Discord dans le navigateur), pas un header : on les appelle depuis le panel ou avec le cookie `next-auth.session-token` copié du navigateur. Exemples non exécutés par moi.

## Bannir un joueur (staff)

Panel : `/admin?tab=players`, chercher le joueur, **Bannir**, saisir le motif, cocher « définitif » si le launcher doit se désinstaller.

```bash
curl -X POST http://localhost:3000/api/admin/moderation/ban \
  -H 'Content-Type: application/json' \
  -H 'Cookie: next-auth.session-token=<TOKEN>' \
  -d '{"playerId":"<id du Player>","reason":"Triche","permanent":false}'
```
Succès : le joueur passe en `BANNED`. Erreurs : `401` pas staff, `400` motif ou `playerId` manquant, `404` joueur inconnu. Déban : `POST /api/admin/moderation/unban` avec `{"playerId":"…"}`.

## Donner des ParaCoins ou du VIP (staff)

```bash
curl -X POST http://localhost:3000/api/admin/users/economy \
  -H 'Content-Type: application/json' -H 'Cookie: next-auth.session-token=<TOKEN>' \
  -d '{"userId":"<id User>","action":"<action>","amount":500}'
```
Les valeurs exactes de `action` sont dans `src/app/api/admin/users/economy/route.ts` (non relevées ici). Pour le VIP, `amount` = jours (0 retire, max 3650).

## Donner une carte à un joueur (admin)

`POST /api/admin/cards/manage` avec `{"action":"GIVE","cardId":"…","minecraftName":"Pseudo"}`. Le joueur doit avoir un compte sur le site (`404` sinon). `specialEffect` optionnel, refusé s'il est inconnu. `REMOVE` retire une carte, `GIVE_BOX` donne des boosters (`userId`, `boxType`, `amount`).

## Activer la maintenance (owner)

Panel : `/admin?tab=settings`. Ou `POST /api/admin/settings` avec `{"key":"maintenance","value":"on"}`. Les visiteurs non staff sont redirigés vers `/ferme`. `value` doit être `on` ou `off` (`400` sinon).

## Promouvoir un membre du staff

Deux actions séparées : le rôle site (`PUT /api/admin/users`, `{userId, role}`) et le rôle Discord (`POST /api/admin/users/promote`). Seul un owner donne `ADMIN`/`DEV`/`OWNER`. Détails : [reference/admin.md](../reference/admin.md).

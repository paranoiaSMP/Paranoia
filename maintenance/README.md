# Mode maintenance (VPS vide sauf la page)

Activer (sur le VPS, dans le dossier du projet) :

    docker compose down            # PAS de -v : les données (Postgres, certificats) sont conservées
    docker compose -f docker-compose.maintenance.yml up -d

`SITE_DOMAIN` est lu depuis `.env` (même variable que la prod).

Revenir en production :

    docker compose -f docker-compose.maintenance.yml down
    docker compose up -d

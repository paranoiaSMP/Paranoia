FROM python:3.11-slim

# On définit le dossier de travail dans le conteneur
WORKDIR /app

# On installe les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# On copie le code du bot
COPY . .

# On lance le bot (le -u permet d'afficher les logs en temps réel)
CMD ["python", "-u", "main.py"]

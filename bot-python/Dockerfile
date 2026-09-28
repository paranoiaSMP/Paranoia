FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie du schéma prisma depuis la racine du projet
COPY ../prisma ./prisma
RUN prisma generate

COPY . .

CMD ["python", "main.py"]

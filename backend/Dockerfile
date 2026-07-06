FROM python:3.12-slim

# Binaire uv officiel (pas de pip install uv, plus rapide et reproductible)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Copie les fichiers de dépendances d'abord pour profiter du cache Docker
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --no-install-project

# Puis le code applicatif
COPY app ./app
RUN uv sync --no-dev

EXPOSE 8000

# `uv run` resynchronise l'environnement à chaque lancement par défaut (et
# retélécharge les deps dev comme ruff/pytest sans --no-dev). On fige donc le
# comportement pour ne PAS re-sync au runtime : l'image a déjà le bon venv.
ENV UV_NO_SYNC=1

# IMPORTANT : un seul worker uvicorn. L'état de la partie est un singleton Python
# en mémoire (app.state.engine) ; un deuxième worker aurait son propre état
# désynchronisé. Ne PAS ajouter --workers.
CMD ["uv", "run", "--no-dev", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

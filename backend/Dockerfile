FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
    
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy application source code
COPY app ./app
COPY models ./models
COPY pyproject.toml uv.lock README.md ./

RUN uv sync --frozen --no-cache

# Create tmp and out directories
RUN mkdir -p tmp out

ENV PORT=8000
EXPOSE 8000

CMD ["uv", "run", "fastapi", "run"]

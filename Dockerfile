# syntax=docker/dockerfile:1.6



FROM python:3.11-slim AS runtime


ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1 \
  PIP_NO_CACHE_DIR=1 \
  PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  ca-certificates \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxdamage1 libxcomposite1 libxrandr2 libxfixes3 \
  libasound2 libatspi2.0-0 libxshmfence1 libgbm1 libpango-1.0-0 \
  libcairo2 libglib2.0-0 libx11-6 libx11-xcb1 libxcb1 libxext6 \
  libxrender1 libxss1 libxtst6 \
  fonts-liberation fonts-unifont fonts-noto-color-emoji fonts-wqy-zenhei \
  xdg-utils shared-mime-info \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
  && python -m playwright install chromium

COPY . .

RUN useradd -m appuser \
  && chown -R appuser:appuser /app \
  && mkdir -p ${PLAYWRIGHT_BROWSERS_PATH} \
  && chown -R appuser:appuser ${PLAYWRIGHT_BROWSERS_PATH}

USER appuser

EXPOSE 8000

ENV GOOGLE_API_KEY="" \
  GOOGLE_CSE_ID=""

RUN mkdir -p /app/results/logs /app/results/screenshots /app/results/html

CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

FROM mcr.microsoft.com/playwright/python:v1.58.0-noble

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Asia/Seoul

WORKDIR /workspace

COPY . /workspace

RUN python -m pip install --no-cache-dir --upgrade pip \
    && apt-get update \
    && apt-get install -y --no-install-recommends openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/* \
    && python -m pip install --no-cache-dir playwright pymysql pymongo "pyspark==3.5.8" requests

CMD ["python", "data/flight/run_scheduled_pipeline.py", "--dry-run"]

FROM mcr.microsoft.com/playwright/python:v1.58.0-noble

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Asia/Seoul

WORKDIR /workspace

COPY . /workspace

RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir playwright pymysql pymongo

CMD ["python", "data/flight/run_scheduled_pipeline.py", "--dry-run"]

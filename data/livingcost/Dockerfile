FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Asia/Seoul

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
        apify_fingerprint_datapoints==0.11.0 \
        browserforge==1.2.4 \
        certifi==2026.2.25 \
        cffi==2.0.0 \
        click==8.3.1 \
        colorama==0.4.6 \
        cssselect==1.4.0 \
        curl_cffi==0.14.0 \
        greenlet==3.3.2 \
        lxml==6.0.2 \
        orjson==3.11.7 \
        playwright==1.58.0 \
        pycparser==3.0 \
        pyee==13.0.1 \
        PyMySQL==1.1.2 \
        scrapling==0.4.2 \
        tld==0.13.2 \
        typing_extensions==4.15.0 \
        w3lib==2.4.0

CMD ["python", "main.py"]

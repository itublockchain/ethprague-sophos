FROM redis:7.2-alpine

RUN apk add --no-cache \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

COPY redis.conf /usr/local/etc/redis/redis.conf

USER redis

CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]
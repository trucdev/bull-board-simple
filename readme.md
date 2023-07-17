# BULL BOARD SIMPLE

A Simple bull board for developer to monit bull queue

## Installation

```bash
npm install -g bull-board-simple
```

## Start bull board


```bash
QUEUES="events" PASSWORD=123 PREFIX="pre" REDIS_HOST=localhost REDIS_PORT=6379 REDIS_PASSWORD="" bull-board-simple
```

Default values:
- REDIS_HOST=localhost 
- REDIS_PORT=6379
- REDIS_PASSWORD=""
- PASSWORD=123456
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Telegram client with Socket.IO that serves as an integration layer between Telegram and any other application. It exposes Telegram functionality through a WebSocket API, allowing clients to connect to Telegram, send/receive messages, and fetch channel messages via Socket.IO events.

## Commands

### Development
```bash
npm run run       # Run the application with tsx (TypeScript execution)
npm run fmt       # Format code with Prettier
```

### Docker
```bash
cd docker
docker-compose up --build    # Run in Docker container
```

The application runs on port 3000 by default (configurable via PORT env var).

## Architecture

### Core Components

**src/index.ts** - Main entry point that sets up:
- Express server with static file serving (public/)
- HTTP server
- Socket.IO server with event handlers
- Shared Telegram client initialized on startup

**src/telegram-client.ts** - Telegram client wrapper that provides:
- `startTelegramClient()` - Initializes Telegram client with session
- `subscribeToUpdates()` - Registers event handler for incoming messages
- `sendMessage()` - Sends messages to recipients
- `fetchChannelMessages()` - Retrieves message history from channels
- `fetchChannelInfo()` - Gets channel metadata

### Connection Flow

1. Server starts and initializes a single shared TelegramClient using environment variables
2. Server subscribes to Telegram updates and broadcasts them to all Socket.IO clients
3. Clients connect via Socket.IO and can immediately start sending/receiving events
4. All connected clients automatically receive Telegram updates via the `tg_update` event
5. Clients can send messages and fetch channel history at any time
6. On disconnect, Socket.IO connections close but the shared TelegramClient remains active

### State Management

- A single shared TelegramClient instance is initialized when the server starts
- The `tgClient` variable tracks the shared Telegram client at module scope
- Updates are automatically broadcast to ALL connected Socket.IO clients
- The Telegram client remains connected for the lifetime of the server process

### Socket.IO Events

**Client → Server:**
- `tg_send_message` - Send message to recipient
- `tg_fetch_messages` - Get message history from channel

**Server → Client:**
- `tg_update` - New message received (broadcast to all clients)
- `tg_send_message` / `tg_send_message_error` - Send result
- `tg_fetch_messages` / `tg_fetch_messages_error` - Message history (streaming)

See README.md for complete event payload specifications.

### Environment Configuration

Required environment variables (see .env.example):
- `TELEGRAM_API_ID` - Telegram API ID (from my.telegram.org) **[REQUIRED]**
- `TELEGRAM_API_HASH` - Telegram API hash **[REQUIRED]**
- `TELEGRAM_SESSION` - Session string (obtained after first auth) **[REQUIRED]**
- `PORT` - Server port (default: 3000)

All Telegram credentials must be provided via environment variables. The server will not start without valid credentials.

## TypeScript Configuration

The project uses strict TypeScript with:
- ES2022 target
- Module preservation (CommonJS at runtime via tsx)
- No emit (runtime execution via tsx)
- Strict mode enabled with additional safety checks

## Key Implementation Details

### Session Management
The Telegram client uses StringSession for authentication. The session string must be provided in the `TELEGRAM_SESSION` environment variable before starting the server. If you don't have a session string yet, run the client once with an empty session to authenticate, then save the generated session string to your environment variables for future use.

### Message Processing
Messages are processed based on peer type (PeerChannel or PeerChat). The channelId field contains the BigInteger channel/chat ID, which should be serialized as string when transmitted over Socket.IO.

### Error Handling
Each Telegram operation (send, fetch) has corresponding error events. The client should listen for these error events to handle failures gracefully. If the Telegram client fails to initialize at startup, the server will exit with an error code.

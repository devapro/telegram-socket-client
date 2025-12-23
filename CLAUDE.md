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
- Per-connection Telegram client management

**src/telegram-client.ts** - Telegram client wrapper that provides:
- `startTelegramClient()` - Initializes Telegram client with session
- `subscribeToUpdates()` - Registers event handler for incoming messages
- `sendMessage()` - Sends messages to recipients
- `fetchChannelMessages()` - Retrieves message history from channels
- `fetchChannelInfo()` - Gets channel metadata

### Connection Flow

1. Client connects via Socket.IO
2. Client emits `tg_connect` with Telegram API credentials (apiId, apiHash, sessionString)
3. Server creates a dedicated TelegramClient instance for that socket connection
4. Client can then emit other events (subscribe, send, fetch) to interact with Telegram
5. On disconnect, the server closes the TelegramClient connection

### State Management

- Each Socket.IO connection maintains its own TelegramClient instance stored in connection scope
- `tgClient` variable tracks the active Telegram client
- `isSubscribed` flag prevents duplicate update subscriptions
- Clients are automatically disconnected when socket closes

### Socket.IO Events

**Client → Server:**
- `tg_connect` - Initialize Telegram client
- `tg_subscribe_to_updates` - Start listening for new messages
- `tg_send_message` - Send message to recipient
- `tg_fetch_messages` - Get message history from channel

**Server → Client:**
- `tg_connect_success` / `tg_connect_error` - Connection result
- `tg_subscribe_to_updates` - New message received (streaming)
- `tg_send_message` / `tg_send_message_error` - Send result
- `tg_fetch_messages` / `tg_fetch_messages_error` - Message history (streaming)

See README.md for complete event payload specifications.

### Environment Configuration

Required environment variables (see .env.example):
- `TELEGRAM_API_ID` - Telegram API ID (from my.telegram.org)
- `TELEGRAM_API_HASH` - Telegram API hash
- `TELEGRAM_SESSION` - Session string (obtained after first auth)
- `PORT` - Server port (default: 3000)

Credentials can be provided either via environment variables or in the `tg_connect` event payload.

## TypeScript Configuration

The project uses strict TypeScript with:
- ES2022 target
- Module preservation (CommonJS at runtime via tsx)
- No emit (runtime execution via tsx)
- Strict mode enabled with additional safety checks

## Key Implementation Details

### Session Management
The Telegram client uses StringSession for authentication. The session string should be saved after first successful authentication to avoid re-authenticating on subsequent connections.

### Message Processing
Messages are processed based on peer type (PeerChannel or PeerChat). The channelId field contains the BigInteger channel/chat ID, which should be serialized as string when transmitted over Socket.IO.

### Error Handling
Each Telegram operation (connect, send, fetch) has corresponding error events. The client should listen for these error events to handle failures gracefully.

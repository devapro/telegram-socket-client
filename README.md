# Telegram client with Socket.IO

A real-time Telegram integration layer that exposes Telegram functionality through Socket.IO. The server maintains a single shared Telegram client that broadcasts updates to all connected Socket.IO clients.

Test page:

![Test page](image.png)

## Features

- **Automatic Connection**: Telegram client connects automatically when the server starts
- **Real-time Updates**: All connected clients receive Telegram messages via broadcast
- **Message Sending**: Send messages to users and channels
- **Message History**: Fetch message history from channels

## Setup

### Prerequisites

You need to obtain Telegram API credentials:
1. Go to https://my.telegram.org
2. Log in with your phone number
3. Go to "API development tools"
4. Create an application to get your `api_id` and `api_hash`
5. Generate a session string (see below)

### Environment Variables

Create a `.env` file in the project root with the following **required** variables:

```bash
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION=your_session_string
PORT=3000
```

**Note**: All three Telegram credentials are required. The server will not start without them.

### Generating a Session String

If you don't have a session string yet, you'll need to authenticate once. The session string will be printed to the console after successful authentication. Save it to your `.env` file for future use.

## Running with Docker

1. Navigate to the `docker` directory:
   ```bash
   cd docker
   ```

2. Run the application using Docker Compose:
   ```bash
   docker-compose up --build
   ```

The application will be available at `http://localhost:3000`.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your `.env` file with required credentials

3. Run the application:
   ```bash
   npm run run
   ```

The application will be available at `http://localhost:3000`.

## Socket.IO API

### Client → Server Events

#### `tg_send_message`
Sends a message to a recipient (user or channel).

**Payload**: `OutgoingMessage`

```typescript
interface OutgoingMessage {
    recipient: string; // Username, phone number, or channel
    message: string;   // The content of the message
}
```

**Example**:
```javascript
socket.emit("tg_send_message", {
    recipient: "@username",
    message: "Hello from Socket.IO!"
});
```

#### `tg_fetch_messages`
Fetches message history from a specific channel.

**Payload**: `FetchMessagesPayload`

```typescript
interface FetchMessagesPayload {
    channel: string; // Channel username or URL (e.g., "telegram" or "https://t.me/telegram")
    limit: number;   // Number of messages to fetch
}
```

**Example**:
```javascript
socket.emit("tg_fetch_messages", {
    channel: "telegram",
    limit: 10
});
```

---

### Server → Client Events

#### `tg_connect_success`
Emitted immediately when a client connects to Socket.IO. Indicates that the server's Telegram client is connected and ready to use.

**Payload**: `void`

**Example**:
```javascript
socket.on("tg_connect_success", () => {
    console.log("Telegram is ready!");
});
```

#### `tg_update`
Broadcast to **all connected clients** when a new Telegram message is received. This happens automatically - no subscription needed.

**Payload**: `ChannelMessageModel`

```typescript
interface ChannelMessageModel {
    id: number;
    text: string;
    date: number;              // Unix timestamp
    isPrivate: boolean;
    channelId: bigInt.BigInteger | undefined; // Channel or chat ID
}
```

**Example**:
```javascript
socket.on("tg_update", (message) => {
    console.log("New message from channel:", message.channelId);
    console.log("Text:", message.text);
    console.log("Date:", new Date(message.date * 1000));
});
```

#### `tg_send_message`
Emitted when a message is successfully sent (sent only to the client that initiated the send).

**Payload**: `OutgoingMessage` (The message that was sent)

**Example**:
```javascript
socket.on("tg_send_message", (message) => {
    console.log("Message sent successfully:", message);
});
```

#### `tg_send_message_error`
Emitted when sending a message fails.

**Payload**: `any` (Error object)

**Example**:
```javascript
socket.on("tg_send_message_error", (error) => {
    console.error("Failed to send message:", error);
});
```

#### `tg_fetch_messages`
Emitted for each message fetched from the requested channel. Multiple events will be emitted (one per message).

**Payload**: `ChannelMessageModel`

**Example**:
```javascript
socket.on("tg_fetch_messages", (message) => {
    console.log("Fetched message:", message.text);
    console.log("Message date:", new Date(message.date * 1000));
});
```

#### `tg_fetch_messages_error`
Emitted when fetching messages fails.

**Payload**: `any` (Error object)

**Example**:
```javascript
socket.on("tg_fetch_messages_error", (error) => {
    console.error("Failed to fetch messages:", error);
});
```

---

## Architecture

- **Single Shared Client**: The server maintains one Telegram client connection shared across all Socket.IO connections
- **Automatic Broadcasting**: All connected clients automatically receive Telegram updates via `tg_update` events
- **No Manual Connection**: Clients don't need to authenticate or connect - just connect to Socket.IO and start using the API
- **Persistent Connection**: The Telegram connection persists for the lifetime of the server process

## Example Usage

```javascript
// Connect to Socket.IO
const socket = io("http://localhost:3000");

// Listen for connection
socket.on("connect", () => {
    console.log("Connected to server");
});

// Telegram is ready
socket.on("tg_connect_success", () => {
    console.log("Telegram client is connected and ready!");
});

// Listen for incoming Telegram messages (automatic broadcast)
socket.on("tg_update", (message) => {
    console.log("New Telegram message:", message);
});

// Send a message
socket.emit("tg_send_message", {
    recipient: "@username",
    message: "Hello!"
});

// Handle send confirmation
socket.on("tg_send_message", (message) => {
    console.log("Message sent:", message);
});

// Handle send error
socket.on("tg_send_message_error", (error) => {
    console.error("Send failed:", error);
});

// Fetch channel history
socket.emit("tg_fetch_messages", {
    channel: "telegram",
    limit: 10
});

// Handle fetched messages (will fire once per message)
socket.on("tg_fetch_messages", (message) => {
    console.log("Message:", message.text);
});

// Handle fetch error
socket.on("tg_fetch_messages_error", (error) => {
    console.error("Fetch failed:", error);
});
```

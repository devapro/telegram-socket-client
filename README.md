# Telegram client with Socket.IO

Can be used as integration layer between Telegram and any other application.

Test page:

![Test page](image.png)


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

## Client -> Server Events

### `tg_connect`
Initializes the Telegram client for the current socket connection. This must be called before any other Telegram-related events.

**Payload**: `TgParams`

```typescript
interface TgParams {
    apiId: string;
    apiHash: string;
    sessionString: string;
}
```

**Example**:
```javascript
socket.emit("tg_connect", {
    apiId: "123456",
    apiHash: "your_api_hash",
    sessionString: "your_session_string"
});
```

### `tg_subscribe_to_updates`
Subscribes the client to listen for incoming Telegram messages. Requires a successful `tg_connect` first.

**Payload**: `void` (No payload required)

**Example**:
```javascript
socket.emit("tg_subscribe_to_updates");
```

### `tg_send_message`
Sends a message to a recipient (user or channel).

**Payload**: `OutgoingMessage`

```typescript
interface OutgoingMessage {
    recipient: string; // Username or Phone number
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

### `tg_fetch_messages`
Fetches the last messages from a specific channel.

**Payload**: `FetchMessagesPayload`

```typescript
interface FetchMessagesPayload {
    channel: string; // Channel URL or Username
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

## Server -> Client Events

### `tg_connect_success`
Emitted when the Telegram client is successfully initialized and connected.

**Payload**: `void`

### `tg_connect_error`
Emitted when the Telegram client fails to initialize.

**Payload**: `string` (Error message)

### `tg_subscribe_to_updates`
Emitted when a new message is received after subscribing.

**Payload**: `ChannelMessageModel`

```typescript
interface ChannelMessageModel {
    id: number;
    text: string;
    date: number;
    isPrivate: boolean;
    channelId: string | undefined; // BigInt serialized as string (if applicable) or undefined
}
```

**Example**:
```javascript
socket.on("tg_subscribe_to_updates", (message) => {
    console.log("New message:", message.text);
});
```

### `tg_send_message`
Emitted when a message is successfully sent.

**Payload**: `OutgoingMessage` (The message that was sent)

### `tg_send_message_error`
Emitted when sending a message fails.

**Payload**: `any` (Error object)

### `tg_fetch_messages`
Emitted for each fetched message from the requested channel.

**Payload**: `ChannelMessageModel`

**Example**:
```javascript
socket.on("tg_fetch_messages", (message) => {
    console.log("Fetched message:", message.text);
});
```

### `tg_fetch_messages_error`
Emitted when fetching messages fails.

**Payload**: `any` (Error object)

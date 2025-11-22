# Socket API Contract

This document describes the Socket.IO events and data structures used in the application.

## Client -> Server Events

### `tg_subscribe_to_updates`
Subscribes the client to listen for incoming Telegram messages.

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

**Payload**: `string` (Channel URL or Username, e.g., `https://t.me/telegram`)

**Example**:
```javascript
socket.emit("tg_fetch_messages", "https://t.me/telegram");
```

## Server -> Client Events

### `tg_subscribe_to_updates`
Emitted when a new message is received after subscribing.

**Payload**: `ChannelMessageModel`

```typescript
interface ChannelMessageModel {
    id: number;
    text: string;
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

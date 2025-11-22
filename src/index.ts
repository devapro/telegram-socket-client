import express from 'express';
import { createServer } from 'node:http';
import { Server } from "socket.io";
import dotenv from 'dotenv';
import { fetchChannelMessages, sendMessage, startTelegramClient, subscribeToUpdates, type ChannelMessageModel, type OutgoingMessage } from './telegram-client';
import type { TelegramClient } from 'telegram';

dotenv.config();

const app = express();
app.use(express.static('public'));
const server = createServer(app);
const io = new Server(server);

type TgParams = {
    apiId: string,
    apiHash: string,
    sessionString: string
}

async function main() {
    io.on("connection", async (socket) => {
        console.log("a user connected");
        let tgClient: TelegramClient | null = null;
        let isSubscribed = false;

        socket.on("tg_connect", async (message: TgParams) => {
            console.log("user connected");
            let apiId = parseInt(message.apiId) || parseInt(process.env.TELEGRAM_API_ID || '');
            let apiHash = message.apiHash || process.env.TELEGRAM_API_HASH || '';
            let sessionString = message.sessionString || process.env.TELEGRAM_SESSION || '';
            if (apiId === -1 || apiHash === '' || sessionString === '') {
                console.log("user connect, but tgClient is not initialized");
                socket.emit("tg_connect_error", "Invalid parameters");
                return;
            }
            if (tgClient) {
                await tgClient.disconnect();
            }
            tgClient = await startTelegramClient(apiId, apiHash, sessionString);
            isSubscribed = false;
            socket.emit("tg_connect_success");
        });

        socket.on("tg_subscribe_to_updates", async () => {
            if (!tgClient) {
                console.log("user subscribe to updates, but tgClient is not initialized");
                return;
            }
            if (isSubscribed) {
                console.log("user already subscribed to updates");
                return;
            }
            subscribeToUpdates(tgClient, async (message: ChannelMessageModel) => {
                socket.emit("tg_subscribe_to_updates", message);
            });
            isSubscribed = true;
        });

        socket.on("tg_send_message", async (message: OutgoingMessage) => {
            console.log("user send message", message);
            if (!tgClient) {
                console.log("user send message, but tgClient is not initialized");
                return;
            }
            try {
                await sendMessage(tgClient, message);
                socket.emit("tg_send_message", message);
            } catch (error) {
                console.error("Error sending message", error);
                socket.emit("tg_send_message_error", error);
            }
        });

        socket.on("tg_fetch_messages", async (payload: { channel: string; limit: number }) => {
            console.log("user fetch messages", payload);
            if (!tgClient) {
                console.log("user fetch messages, but tgClient is not initialized");
                return;
            }
            try {
                await fetchChannelMessages(tgClient, payload.channel, payload.limit, async (message: ChannelMessageModel) => {
                    socket.emit("tg_fetch_messages", message);
                });
            } catch (error) {
                console.error("Error fetching messages", error);
                socket.emit("tg_fetch_messages_error", error);
            }
        });

        socket.on("disconnect", async () => {
            console.log("user disconnected");
            if (tgClient) {
                await tgClient.disconnect();
                tgClient = null;
            }
        });
    });

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
        console.log(`server running at http://localhost:${port}`);
    });
}

main();
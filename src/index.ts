import express from 'express';
import { createServer } from 'node:http';
import { Server } from "socket.io";
import dotenv from 'dotenv';
import { fetchChannelMessages, sendMessage, startTelegramClient, subscribeToUpdates, type ChannelMessageModel, type OutgoingMessage } from './telegram-client';
import type { TelegramClient } from 'telegram';

dotenv.config();

const app = express();
app.use(express.static('public'));
app.use(express.json());
const server = createServer(app);
const io = new Server(server);

async function main() {
    // Initialize Telegram client on startup
    const apiId = parseInt(process.env.TELEGRAM_API_ID || '');
    const apiHash = process.env.TELEGRAM_API_HASH || '';
    const sessionString = process.env.TELEGRAM_SESSION || '';

    if (!apiId || !apiHash || !sessionString) {
        console.error('Missing required environment variables: TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION');
        process.exit(1);
    }

    console.log('Initializing Telegram client...');
    const tgClient: TelegramClient = await startTelegramClient(apiId, apiHash, sessionString);
    console.log('Telegram client connected successfully');

    // Subscribe to updates and broadcast to all connected clients
    subscribeToUpdates(tgClient, async (message: ChannelMessageModel) => {
        io.emit("tg_update", message);
    });
    console.log('Subscribed to Telegram updates');

    // REST API endpoints
    app.post('/api/messages', async (req, res) => {
        try {
            const message: OutgoingMessage = req.body;

            if (!message.recipient || !message.message) {
                return res.status(400).json({
                    error: 'Missing required fields: recipient and message'
                });
            }

            await sendMessage(tgClient, message);
            res.json({
                success: true,
                message: 'Message sent successfully',
                data: message
            });
        } catch (error) {
            console.error('Error sending message via REST API', error);
            res.status(500).json({
                error: 'Failed to send message',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    app.get('/api/messages/:channel', async (req, res) => {
        try {
            const { channel } = req.params;
            const limit = parseInt(req.query.limit as string) || 100;

            if (!channel) {
                return res.status(400).json({
                    error: 'Missing required parameter: channel'
                });
            }

            const messages: ChannelMessageModel[] = [];
            await fetchChannelMessages(tgClient, channel, limit, async (message: ChannelMessageModel) => {
                messages.push(message);
            });

            res.json({
                success: true,
                count: messages.length,
                data: messages
            });
        } catch (error) {
            console.error('Error fetching messages via REST API', error);
            res.status(500).json({
                error: 'Failed to fetch messages',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    io.on("connection", async (socket) => {
        console.log("a user connected");

        socket.on("tg_connect", () => {
            console.log("user checking tg connection");
            socket.emit("tg_connect_success");
        });

        socket.on("tg_send_message", async (message: OutgoingMessage) => {
            console.log("user send message", message);
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
        });
    });

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
        console.log(`server running at http://localhost:${port}`);
    });
}

main();
import express from 'express';
import { createServer } from 'node:http';
import { Server } from "socket.io";
import { fetchChannelMessages, sendMessage, startTelegramClient, subscribeToUpdates, type ChannelMessageModel, type OutgoingMessage } from './telegram-client';

const app = express();
app.use(express.static('public'));
const server = createServer(app);
const io = new Server(server);

async function main() {
    const tgClient = await startTelegramClient()

    io.on("connection", (socket) => {
        console.log("a user connected");

        socket.on("tg_subscribe_to_updates", () => {
            subscribeToUpdates(tgClient, async (message: ChannelMessageModel) => {
                io.emit("tg_subscribe_to_updates", message);
            });
        });

        socket.on("tg_send_message", async (message: OutgoingMessage) => {
            console.log("user send message", message);
            try {
                await sendMessage(tgClient, message);
                io.emit("tg_send_message", message);
            } catch (error) {
                console.error("Error sending message", error);
                io.emit("tg_send_message_error", error);
            }
        });

        socket.on("tg_fetch_messages", async (channel: string) => {
            console.log("user fetch messages", channel);
            try {
                await fetchChannelMessages(tgClient, channel, async (message: ChannelMessageModel) => {
                    io.emit("tg_fetch_messages", message);
                });
            } catch (error) {
                console.error("Error fetching messages", error);
                io.emit("tg_fetch_messages_error", error);
            }
        });
    });

    server.listen(3000, () => {
        console.log('server running at http://localhost:3000');
    });
}

main();
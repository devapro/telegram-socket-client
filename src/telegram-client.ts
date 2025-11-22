import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import readline from 'readline';
import dotenv from 'dotenv';
import { NewMessage, type NewMessageEvent } from 'telegram/events';

dotenv.config();

export async function startTelegramClient(
    apiId: number,
    apiHash: string,
    sessionString: string
): Promise<TelegramClient> {
    const stringSession = new StringSession(sessionString);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log('Loading interactive example...');
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.start({
        phoneNumber: async () =>
            new Promise((resolve) => rl.question('Please enter your number: ', resolve)),
        password: async () =>
            new Promise((resolve) => rl.question('Please enter your password: ', resolve)),
        phoneCode: async () =>
            new Promise((resolve) => rl.question('Please enter the code you received: ', resolve)),
        onError: (err) => console.log(err),
    });
    console.log('You should now be connected.');
    console.log(client.session.save()); // Save this string to avoid logging in again

    rl.close();
    return client;
};


export type ChannelMessageModel = {
    id: number;
    text: string;
    date: number;
    isPrivate: boolean;
    channelId: bigInt.BigInteger | undefined;
};

export type ChannelInfo = {
    url: string;
    about: string;
    id: bigInt.BigInteger;
};

export interface OutgoingMessage {
    recipient: string;
    message: string;
}

export async function sendMessage(
    client: TelegramClient,
    message: OutgoingMessage
): Promise<void> {
    await client.sendMessage(message.recipient, {
        message: message.message,
    });
}

export async function subscribeToUpdates(
    client: TelegramClient,
    onMessage: (message: ChannelMessageModel) => Promise<void>,
): Promise<void> {
    // subscribe to messages
    client.addEventHandler(async (message: NewMessageEvent) => {

        if (message.message.peerId instanceof Api.PeerChannel) {
            console.log('Channel id:', message.message.peerId.channelId, message.isPrivate);

            console.log('Message:', message.message.text);

            onMessage({
                id: message.message.id,
                text: message.message.text,
                date: message.message.date,
                isPrivate: message.isPrivate === true,
                channelId: message.message.peerId.channelId,
            });
        } else if (message.message.peerId instanceof Api.PeerChat) {
            console.log('Chat id:', message.message.peerId.chatId);

            console.log('Message:', message.message.text);

            onMessage({
                id: message.message.id,
                text: message.message.text,
                date: message.message.date,
                isPrivate: message.isPrivate === true,
                channelId: message.message.peerId.chatId,
            });
        } else {
            console.log('Message is not from channel');
        }
    }, new NewMessage({}));
}

export async function fetchChannelInfo(
    client: TelegramClient,
    channel: string,
): Promise<ChannelInfo> {

    const result = await client.invoke(
        new Api.channels.GetFullChannel({
            channel: channel,
        }),
    );

    return {
        url: `https://t.me/${channel}`,
        about: result.fullChat.about,
        id: result.fullChat.id,
    };
}

export async function fetchChannelMessages(
    client: TelegramClient,
    channel: string,
    limit: number,
    onMessage: (message: ChannelMessageModel) => Promise<void>,
): Promise<void> {
    const messages = await client.getMessages(channel, {
        limit: limit,
    });
    const channelInfo = await fetchChannelInfo(client, channel);
    for (const message of messages) {
        onMessage({
            id: message.id,
            text: message.text,
            date: message.date,
            isPrivate: message.isPrivate === true,
            channelId: channelInfo.id
        });
    }
}


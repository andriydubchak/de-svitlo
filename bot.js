import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { Telegraf } from 'telegraf';
import { resolve } from 'path';
import cron from 'node-cron';
import fs from 'fs';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const endpoint = 'https://power-api.loe.lviv.ua/api/pw_accidents?page=1&otg.id=&city.id=693&street.id=13961';
const lightsOutGif = resolve('assets/lights-out.gif');
const electricityGif = resolve('assets/electricity-is-here.gif');
const subscriptionsFile = 'subscriptions.json';

// Load subscriptions from file
const loadSubscriptions = () => {
    try {
        if (fs.existsSync(subscriptionsFile)) {
            const data = fs.readFileSync(subscriptionsFile, 'utf-8');
            return JSON.parse(data);
        }
        // Return an empty array if the file doesn't exist or is empty
        return [];
    } catch (error) {
        console.error('Error loading subscriptions:', error);
        return [];
    }
};
// Save subscriptions to file
const saveSubscriptions = (subscriptions) => {
    fs.writeFileSync(subscriptionsFile, JSON.stringify(subscriptions, null, 2));
};

// Add a new subscription
const addSubscription = (chatId) => {
    const subscriptions = loadSubscriptions();
    if (!subscriptions.includes(chatId)) {
        subscriptions.push(chatId);
        saveSubscriptions(subscriptions);
    }
};

// Remove a subscription
const removeSubscription = (chatId) => {
    let subscriptions = loadSubscriptions();
    subscriptions = subscriptions.filter(id => id !== chatId);
    saveSubscriptions(subscriptions);
};

// Find building 17 and return formatted message
const findBuilding = (data) => {
    for (const item of data['hydra:member']) {
        const buildings = item.buildingNames.split(',').map(b => b.trim());
        if (buildings.includes('17')) {
            const timeEvent = item.dateEvent.match(/T(\d{2}:\d{2}):\d{2}/)[1];
            const timePlanIn = item.datePlanIn.match(/T(\d{2}:\d{2}):\d{2}/)[1];
            return `Обмежуємось в харчуванні.\n\nПочаток: ${timeEvent}\nКінець: ${timePlanIn}`;
        }
    }
    return null;
};

// Fetch data from the endpoint and notify subscribers
const fetchAndNotify = async () => {
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        const buildingData = findBuilding(data);
        const subscriptions = loadSubscriptions();

        for (const chatId of subscriptions) {
            if (buildingData) {
                await bot.telegram.sendAnimation(chatId, { source: lightsOutGif });
                await bot.telegram.sendMessage(chatId, buildingData);
            } else {
                await bot.telegram.sendAnimation(chatId, { source: electricityGif });
                await bot.telegram.sendMessage(chatId, 'Харчуємось, панство!\nДесь зараз має бути.');
            }
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};

// Command to start the bot
bot.start((ctx) => ctx.reply('Вітаю, шановні!\n\nЮзаємо /subscribe щоб підписатись і /unsubscribe щоб відписатись\n\n/ping щоб мануально копнути сайт на предмет інфи.\n\nПрацюємо!'));

// Command to subscribe
bot.command('subscribe', (ctx) => {
    addSubscription(ctx.chat.id);
    ctx.reply('Підписались!');
});

// Command to unsubscribe
bot.command('unsubscribe', (ctx) => {
    removeSubscription(ctx.chat.id);
    ctx.reply('Відписались(');
});

// Manual ping command
bot.command('ping', async (ctx) => {
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        const buildingData = findBuilding(data);

        if (buildingData) {
            await ctx.replyWithAnimation({ source: lightsOutGif });
            ctx.reply(buildingData);
        } else {
            await ctx.replyWithAnimation({ source: electricityGif });
            ctx.reply('Харчуємось, панство!\nДесь зараз має бути.');
        }
    } catch (error) {
        ctx.reply('Sorry, an error occurred while fetching data.');
    }
});

// Schedule the task to run at 5 and 55 minutes past every hour
cron.schedule('5,9,51,55 * * * *', fetchAndNotify);

bot.launch();
console.log('Bot is running...');

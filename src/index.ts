import "dotenv/config";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { Bot, webhookCallback } from "grammy";

const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error("BOT_TOKEN не указан в переменных окружения!");
}

const bot = new Bot(token);
const app = new Hono();
const MINI_APP_URL = "https://klirov.github.io/mini-app-demo";

app.use("*", cors());
app.use("*", logger());

bot.catch((err) => {
    console.error(
        `[grammY Error] Ошибка апдейта ${err.ctx.update.update_id}:`,
        err.error,
    );
});

app.get("/", (c) => c.text("🤖 Бот успешно запущен!"));

if (process.env.NODE_ENV === "production") {
    app.post("/api/webhook", webhookCallback(bot, "hono") as any);
}

app.post("/api/order", async (c) => {
    try {
        const order = await c.req.json();

        if (!order.userId) {
            return c.json({ success: false, error: "Missing userId" }, 400);
        }

        // Переводим элементы на HTML-теги <b>
        const itemsList = order.items
            .map((item: any) => `• <b>${item.name}</b> x${item.qty}`)
            .join("\n");

        // Используем красивый юникод-символ «─» вместо ломающих разметку дефисов или подчеркиваний
        const divider = "───────────────────────────────";

        const checkMessage = [
            `🧾 <b>ДЕМО-ЧЕК АВТОМАТИЗАЦИИ</b>`,
            divider,
            `👤 <b>Клиент:</b> @${order.customer}`,
            `📦 <b>Состав заказа:</b>`,
            itemsList,
            divider,
            `💵 <b>Итого к оплате:</b> ${order.total} ₽`,
            `\n⚡ <i>Заказ успешно оформлен через API Mini App!</i>`,
        ].join("\n");

        // Меняем parse_mode на HTML
        await bot.api.sendMessage(order.userId, checkMessage, {
            parse_mode: "HTML",
        });

        return c.json({ success: true });
    } catch (error: any) {
        console.error("[Order Route Error]:", error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

bot.command("start", async (ctx) => {
    await ctx.reply("Привет! Нажми на кнопку ниже, чтобы открыть Mini App:", {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "Открыть Mini App 🚀",
                        web_app: { url: MINI_APP_URL },
                    },
                ],
            ],
        },
    });
});

app.onError((err, c) => {
    console.error(`[Hono Runtime Error]:`, err);
    return c.text(`Internal Server Error: ${err.message}`, 500);
});

if (process.env.NODE_ENV !== "production") {
    Bun.serve({
        fetch: app.fetch,
        port: 3000,
    });
    console.log("🚀 Локальный сервер Bun запущен на http://localhost:3000");
    bot.start();
}

export const runtime = "edge";
export default app;

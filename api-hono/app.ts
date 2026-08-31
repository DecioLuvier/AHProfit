import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { env } from "./env";
import { auctionRoutes } from "./modules/auctions/routes";
import { characterRoutes, inventoryRoutes } from "./modules/characters/routes";
import { farmingRoutes } from "./modules/farming/routes";
import { itemRoutes } from "./modules/items/routes";
import "./database/db";

export const app = new Hono();

app.use("*", cors());

app.notFound((c) => c.json({ error: "Not Found" }, 404));

app.onError((err, c) => {
	if (err instanceof HTTPException) return err.getResponse();
	console.error("Unhandled Error:", err);
	return c.json({ error: "Internal Server Error" }, 500);
});

const routes = app
	.route("/items", itemRoutes)
	.route("/auctions", auctionRoutes)
	.route("/farming", farmingRoutes)
	.route("/characters", characterRoutes)
	.route("/inventory", inventoryRoutes);

export type AppType = typeof routes;

export default {
	port: env.PORT,
	fetch: app.fetch,
};

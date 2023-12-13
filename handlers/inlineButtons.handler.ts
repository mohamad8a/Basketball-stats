import { Composer, Context, InlineKeyboard } from "grammy";
import { createToken } from "../views/create_token.view";
import { MyContext } from "../bot";
import { SafeToken, TokenDeployer, getWalletAddress } from "../web3";
import { CreateWallet } from "../web3";
import { WETH, setSessions } from ".";
import { ethers, formatUnits, parseEther } from "ethers";
import { MangeTokenHandler } from "./mangeToken.handler";
import { buyTokenHandler } from "./buyToken.handler";
import { sellTokenHandler } from "./sellToken.handler";
import { instantiateERC20Token } from "../web3/instantiate";
import { getOrders, showSingleOrder } from "../controllers/balances.controller";
import { buyRouting, sellRouting } from "./routing.handler";
const Wallet = new CreateWallet();
const { WalletSigner } = Wallet;

const callBackQueryComposer = new Composer<MyContext>();
callBackQueryComposer.on("callback_query:data", async (ctx) => {
	const data = ctx.callbackQuery.data;

	await setSessions(ctx as any);

	if (data.includes("refresh-sell")) {
		const query = data.split("|")[1];
		await ctx.deleteMessage();
		await showSingleOrder(ctx, parseInt(query));
	}
	if (data.includes("prev-sell")) {
		const query = data.split("|")[1];

		if (parseInt(query) >= 0) {
			await ctx.deleteMessage();
			await showSingleOrder(ctx, parseInt(query));
		}
	}
	if (data.includes("next-sell")) {
		const query = data.split("|")[1];
		const orders = await getOrders(ctx);
		if (parseInt(query) < orders.length) {
			await ctx.deleteMessage();
			await showSingleOrder(ctx, parseInt(query));
		}
	}
	if (data == "front") {
		await ctx.deleteMessage();
	}
	if (data.includes("buy-")) {
		const query = data.split("-");
		if (query[1].toString() !== "custom") {
			console.log("jhdfjk");
			const slippage = 10;
			const amountInMax = BigInt(parseEther(query[1]));
			const tokenOut = query[2];
			const privateKey = ctx.session.privateKey;
			const amountToBuy = query[1];
			await buyRouting(
				WETH,
				tokenOut,
				privateKey,
				process.env.RPC,
				slippage,
				amountInMax,
				amountToBuy,
				ctx
			);
		} else {
			//console.log("custom");
			ctx.session.customBuyToken = query[2];
			await ctx.conversation.enter("setTradeAmountConversation");
		}
	}
	if (data.includes("sell-")) {
		const query = data.split("-");
		if (query[1].toString() !== "custom") {
			const token = query[2];
			const rpc = process.env.RPC;
			const tokenC = instantiateERC20Token(
				token,
				rpc,
				ctx.session.privateKey
			);
			const tokenBalance = await (
				await tokenC
			).balanceOf(await getWalletAddress(ctx.session.privateKey));
			const slippage = 40;
			const sellingPercent = BigInt((parseInt(query[1]) / 100) * 1000);
			const amountOut =
				BigInt(sellingPercent * tokenBalance) / BigInt(1000);
			const privateKey = ctx.session.privateKey;

			//await sellTokenHandler(slippage, amountOut, token, privateKey, ctx);
			await sellRouting(
				WETH,
				token,
				privateKey,
				rpc,
				slippage,
				amountOut,
				ctx
			);
		} else {
			ctx.session.customSellToken = query[2];
			const rpc = process.env.RPC;
			const tokenC = instantiateERC20Token(
				ctx.session.customSellToken,
				rpc,
				ctx.session.privateKey
			);
			const tokenBalance = await (
				await tokenC
			).balanceOf(await getWalletAddress(ctx.session.privateKey));
			ctx.session.tokenBalance = tokenBalance;
			// console.log("selling Custom");
			await ctx.conversation.enter("setSellTradeAmountConversation");
		}
	}

	await ctx.answerCallbackQuery();
});
export { callBackQueryComposer };

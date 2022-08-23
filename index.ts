import express, { Express, Request, Response } from "express";
import { request } from "undici";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || "3000";
const clientId = process.env.CLIENT_ID || "";
const clientSecret = process.env.CLIENT_SECRET || "";

const ids = new Set<String>();

app.get("/redirect", async ({ query }, resp: Response) => {
  const { code } = query;

  if (code) {
    try {
      const tokenResp = await request("https://discord.com/api/oauth2/token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code as string,
          grant_type: "authorization_code",
          redirect_uri: `http://localhost:${port}/redirect`,
          scope: "identify",
        }).toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const { access_token: accessToken, token_type: tokenType } =
        await tokenResp.body.json();

      const userResp = await request("https://discord.com/api/users/@me", {
        headers: {
          authorization: `${tokenType} ${accessToken}`,
        },
      });

      const { id } = await userResp.body.json();
      ids.add(id);

      resp.end(`Your id: ${id}`);
      return;
    } catch (error) {
      // NOTE: An unauthorized token will not throw an error
      // tokenResponseData.statusCode will be 401
      console.error(error);

      resp.end(`Internal server error!`);
      return;
    }
  }

  resp.end(`<a href="/">Back</a>`);
});

app.get("/ids", (_req: Request, resp: Response) => {
  const result: string[] = [];
  ids.forEach((id) => result.push(id as string));
  resp.json(result);
});

app.get("/", (_req: Request, resp: Response) => {
  resp.end(
    `<a href="https://discord.com/api/oauth2/authorize?client_id=1011578952587948053&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fredirect&response_type=code&scope=identify">Auth with Discord</a>`
  );
});

app.listen(port, () => {
  console.log(`[+] Running on port: http://localhost:${port}`);
});

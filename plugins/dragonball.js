import axios from "axios";
import * as cheerio from 'cheerio'
import FormData from "form-data";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

async function dragonBall(text) {
  try {
    const url =
      "https://en.ephoto360.com/create-dragon-ball-style-text-effects-online-809.html";

    const getPage = await axios.get(url, {
      headers: {
        "user-agent": USER_AGENT
      }
    });

    const $ = cheerio.load(getPage.data);

    const token = $('input[name="token"]').val();
    const build_server = $('input[name="build_server"]').val();
    const build_server_id = $('input[name="build_server_id"]').val();

    if (!token || !build_server || !build_server_id) {
      throw new Error("Unable to obtain the required form tokens.");
    }

    const form = new FormData();

    form.append("text[]", text);
    form.append("token", token);
    form.append("build_server", build_server);
    form.append("build_server_id", build_server_id);

    const postPage = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        "user-agent": USER_AGENT,
        cookie: getPage.headers["set-cookie"]?.join("; ") || ""
      }
    });

    const $$ = cheerio.load(postPage.data);

    const raw = $$('input[name="form_value_input"]').val();

    if (!raw) {
      throw new Error("Unable to retrieve form data.");
    }

    const json = JSON.parse(raw);

    json["text[]"] = json.text;
    delete json.text;

    const { data } = await axios.post(
      "https://en.ephoto360.com/effect/create-image",
      new URLSearchParams(json),
      {
        headers: {
          "user-agent": USER_AGENT,
          cookie: getPage.headers["set-cookie"]?.join("; ") || ""
        }
      }
    );

    return build_server + data.image;
  } catch (err) {
    throw new Error(err.message || "Unknown error.");
  }
}

let handler = async (m, { conn, text }) => {
  if (!text || text === "--help" || text === "-h") {
    return conn.reply(
      m.chat,
`🐉 Dragon Ball Text Generator

Create Dragon Ball-inspired text artwork using EPhoto360.

━━━━━━━━━━━━━━

Features

• Dragon Ball style logo
• High-quality generated artwork
• Fast generation
• Simple text input

━━━━━━━━━━━━━━

Usage

.dragonball <text>

Example

.dragonball SAURUS BALL

.dragonball Son Goku

.dragonball ChatGPT

━━━━━━━━━━━━━━

Notes

• Maximum recommended text length: 20 characters.
• Decorative symbols may not render correctly.
• Processing usually takes 5–15 seconds.

Need help?

.dragonball --help`,
      m
    );
  }

  if (text.length > 40) {
    return conn.reply(
      m.chat,
      "Please keep the text under 40 characters.",
      m
    );
  }

  await conn.reply(
    m.chat,
    "🐉 Generating your Dragon Ball artwork...\nPlease wait.",
    m
  );

  try {
    const image = await dragonBall(text.trim());

    await conn.sendFile(
      m.chat,
      image,
      "dragonball.jpg",
      `🐉 Dragon Ball Text\n\nText: ${text}`,
      m
    );
  } catch (e) {
    conn.reply(
      m.chat,
      `❌ Error\n\n${e.message}`,
      m
    );
  }
};

handler.help = ["dragonball"];
handler.command = ["dragonball"];
handler.tags = ["tools"];
handler.limit = false;

export default handler;

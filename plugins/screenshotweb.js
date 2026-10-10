import axios from "axios";

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return conn.reply(
      m.chat,
`📸 *URLBox Full Page Screenshot*

Capture a full-page screenshot of any public website.

*Features*
• Full-page screenshot
• Dark mode enabled
• Cookie banners hidden
• PNG output
• Desktop viewport (1440×1024)

*Usage*
${usedPrefix + command} https://example.com

*Example*
${usedPrefix + command} https://google.com

*Notes*
• The website must be publicly accessible.
• Some websites may block automated rendering.
• Rendering may take a few seconds.`,
      m
    );
  }

  if (!/^https?:\/\/.+/i.test(text)) {
    return conn.reply(
      m.chat,
      `❌ Please provide a valid URL.\n\nExample:\n${usedPrefix + command} https://example.com`,
      m
    );
  }

  try {
    await conn.sendMessage(m.chat, {
      react: {
        text: "⏳",
        key: m.key
      }
    });

    const { data } = await axios.post(
      "https://urlbox.com/api/render",
      {
        url: text,
        width: 1440,
        height: 1024,
        full_page: true,
        selector: "",
        dark_mode: true,
        hide_cookie_banners: true,
        format: "png"
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    if (!data?.screenshotUrl) {
      return conn.reply(
        m.chat,
        "❌ Failed to generate screenshot.\n\n```json\n" +
          JSON.stringify(data, null, 2) +
          "\n```",
        m
      );
    }

    await conn.sendFile(
      m.chat,
      data.screenshotUrl,
      "screenshot.png",
      `✅ Screenshot generated successfully.\n\n🌐 ${text}`,
      m
    );

    await conn.sendMessage(m.chat, {
      react: {
        text: "✅",
        key: m.key
      }
    });

  } catch (err) {
    console.error(err);

    let msg = "❌ Failed to render the website.";

    if (err.response?.data) {
      msg += "\n\n```json\n" +
        JSON.stringify(err.response.data, null, 2) +
        "\n```";
    } else {
      msg += `\n\n${err.message}`;
    }

    conn.reply(m.chat, msg, m);

    await conn.sendMessage(m.chat, {
      react: {
        text: "❌",
        key: m.key
      }
    });
  }
};

handler.help = ["screenshotweb"];
handler.tags = ["tools"];
handler.command = [ "screenshotweb"];
handler.limit = false;

export default handler;

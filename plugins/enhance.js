import axios from "axios";
import FormData from "form-data";

class Swiftspeed {
  constructor() {
    this.client = axios.create({
      baseURL: "https://swiftspeed.app/build",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 15; RMX3890 Build/AQ3A.240812.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/150.0.7871.124 Mobile Safari/537.36",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip",
        "Accept-Language": "id-ID,id;q=0.5",
        Referer: "https://localhost/",
        "sec-ch-ua": '"Not;A=Brand";v="8", "Chromium";v="150", "Android WebView";v="150"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    });
  }

  async _slp(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async _buf(input) {
    if (Buffer.isBuffer(input)) return input;
    if (typeof input === "string") {
      if (input.startsWith("http://") || input.startsWith("https://")) {
        const res = await axios.get(input, { responseType: "arraybuffer" });
        return Buffer.from(res?.data);
      }
      if (input.startsWith("data:image")) {
        const base64Data = input.split(",")[1] || input;
        return Buffer.from(base64Data, "base64");
      }
      return Buffer.from(input, "base64");
    }
    return null;
  }

  async upscale({ image, ...rest }) {
    try {
      if (!image) {
        return { status: "error", result: { error_message: 'Parameter "image" is required' } };
      }
      const imgBuf = await this._buf(image);
      if (!imgBuf) {
        return { status: "error", result: { error_message: "Failed to convert input image to Buffer" } };
      }

      const form = new FormData();
      form.append("file", imgBuf, { filename: "upload_image.png" });
      const payload = { scale: "4", ...rest };
      for (const [key, val] of Object.entries(payload)) {
        form.append(key, String(val));
      }

      const reqHeaders = { ...form.getHeaders(), "Accept-Encoding": "gzip" };
      const uploadRes = await this.client.post("/api/v2/tools/upscale", form, { headers: reqHeaders });
      const jobId = uploadRes?.data?.job_id || null;
      if (!jobId) {
        return { status: "error", result: { error_message: "No job_id returned by the server" } };
      }

      let state = "pending";
      let resultsData = [];
      let attempts = 0;
      const maxAttempts = 60;

      while (state !== "done" && attempts < maxAttempts) {
        attempts++;
        const checkRes = await this.client.get(`/api/v2/tools/upscale/status/${jobId}`);
        const serverStatus = checkRes?.data?.status || "pending";

        if (serverStatus === "done") {
          resultsData = checkRes?.data?.results || [];
          state = "done";
          break;
        }
        if (serverStatus === "failed") {
          return { status: "error", result: { error_message: "Server reported an upscale failure" } };
        }
        await this._slp(3000);
      }

      if (state !== "done") {
        return { status: "error", result: { error_message: "Job timed out" } };
      }

      const formattedResults = resultsData.map(item => ({
        token: item?.token || "",
        filename: item?.filename || "",
        original_size: item?.original_size || 0,
        processed_size: item?.processed_size || 0,
        preview_url: item?.preview_url ? `https://swiftspeed.app/build${item.preview_url}` : "",
        download_url: item?.download_url ? `https://swiftspeed.app/build${item.download_url}` : "",
        engine: item?.engine || "",
        engine_label: item?.engine_label || ""
      }));

      return { status: "success", result: { job_id: jobId, results: formattedResults } };
    } catch (error) {
      return { status: "error", result: { error_message: error?.message || "Internal system error" } };
    }
  }
}

let handler = async (m, { conn }) => {
  // Grab an image either from the message itself or from a quoted/replied message
  const quoted = m.quoted ? m.quoted : m;
  const mime = (quoted.msg || quoted).mimetype || "";

  if (!mime || !mime.startsWith("image")) {
    const guide = `🖼️ *Image Upscaler (4x)*

Upscale a low-resolution image to a sharper, higher-resolution version using AI.

*How to use:*
1. Send an image with the caption ${m.body?.split(" ")[0] || "upscale"}
   — or —
2. Reply to an existing image with ${m.body?.split(" ")[0] || "upscale"}

The process can take up to a couple of minutes depending on server load.`;
    return conn.sendMessage(m.chat, { text: guide }, { quoted: m });
  }

  await conn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

  try {
    const media = await quoted.download();
    const swiftspeed = new Swiftspeed();
    const res = await swiftspeed.upscale({ image: media });

    if (res.status !== "success" || !res.result?.results?.length) {
      await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      return conn.sendMessage(
        m.chat,
        { text: `Upscale failed: ${res.result?.error_message || "unknown error"}` },
        { quoted: m }
      );
    }

    const best = res.result.results[0];
    const { data: imgBuffer } = await axios.get(best.download_url, { responseType: "arraybuffer" });

    await conn.sendMessage(
      m.chat,
      {
        image: Buffer.from(imgBuffer),
        caption: `✅ Upscaled successfully\nEngine: ${best.engine_label || best.engine || "N/A"}`
      },
      { quoted: m }
    );

    await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
  } catch (e) {
    console.error(`[upscale] error: ${e.message}`);
    await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
    return conn.sendMessage(m.chat, { text: `Failed to process image: ${e.message}` }, { quoted: m });
  }
};

handler.help = ["enhance"];
handler.command = [ "enhance"];
handler.tags = ["editor"];
handler.limit = false;

export default handler;

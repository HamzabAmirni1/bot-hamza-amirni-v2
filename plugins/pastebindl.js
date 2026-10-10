import axios from 'axios';
import * as cheerio from 'cheerio'

const handler = async (m, { conn, text }) => {
  if (!text || !text.startsWith('https://pastebin.com/')) {
    return await conn.sendMessage(
      m.chat,
      { text: '❗ Please provide a valid Pastebin URL. exemple : \n\n *.pastebindl*  https://pastebin.com/0M5rH5w5' },
      { quoted: m }
    );
  }

  try {
    const { data } = await axios.get(text);
    const $ = cheerio.load(data);

    const title = $('div.info-top h1').text().trim() || 'Title not found';
    const rawLink = $('a[href^="/raw"]').attr('href');
    const downloadLink = $('a[href^="/dl"]').attr('href');

    const content = [];
    $('.source.text ol li').each((i, el) => content.push($(el).text().trim()));

    const username = $('div.username a').text().trim() || 'Username not found';
    const datePosted = $('div.date span').text().trim() || 'Date not found';
    const viewCount = $('div.visits').text().trim() || 'View count not found';

    const caption = `🍁 *Retrieve Pastebin*\n\n` +
      `📌 *Title*: ${title}\n` +
      `👤 *Uploader*: ${username}\n` +
      `📅 *Date*: ${datePosted}\n` +
      `👀 *Views*: ${viewCount}\n\n` +
      `🔗 *Raw Link*: ${rawLink ? `https://pastebin.com${rawLink}` : 'Not found'}\n` +
      `📥 *Download Link*: ${downloadLink ? `https://pastebin.com${downloadLink}` : 'Not found'}\n\n` +
      `📝 *Content*:\n${content.length ? content.join('\n') : 'No code content found.'}\n\n`;

    const documentContent = content.join('\n') || 'No content to save.';

    await conn.sendMessage(
      m.chat,
      {
        document: Buffer.from(documentContent, 'utf-8'),
        mimetype: 'application/octet-stream',
        fileName: 'pastebin_content.js',
        caption,
      },
      { quoted: m }
    );

  } catch (error) {
    console.error('Error Issue:', error);
    await conn.sendMessage(
      m.chat,
      { text: `❗ An error occurred: ${error.message}` },
      { quoted: m }
    );
  }
};

handler.command = /^(pastebindl)$/i;
handler.tags = ['downloader'];
handler.help = ['pastebindl'];
handler.limit = false 
export default handler;

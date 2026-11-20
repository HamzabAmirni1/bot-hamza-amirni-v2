let handler = async (m, { conn, text }) => {
    // Show guide if no text is provided
    if (!text) {
        return conn.reply(
            m.chat,
`🟨 *Yellow Text Generator*

This feature sends your message as a highlighted yellow rich text bubble in WhatsApp.

📖 *How to use:*
.yellowtext Your text here

✅ Example:
.yellowtext Hello World

The bot will send:
🟨 Hello World`,
            m
        )
    }

    await new AIRich(conn)
        .addText(`=={ ${text} }==`)
        .send(m.chat, { quoted: m })
}

handler.help = ['yellowtext']
handler.command = ['yellowtext']
handler.tags = ['tools']
handler.limit = false
export default handler

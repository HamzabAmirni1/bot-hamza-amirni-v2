let handler = async (m, {conn, text, config}) => {
    if (!text) return m.reply('❌ يرجى كتابة الرسالة المراد نشرها في القناة.\nمثال: .sendtochannel السلام عليكم');

    // Fallback for missing config.cenel
    const channelId = config?.cenel?.id || '120363377578749872@newsletter';
    const channelName = config?.cenel?.name || (global.namebot || 'BOT AMIRNI HAMZA');
    const thumbnailUrl = config?.img?.nekobot || 'https://raw.githubusercontent.com/HamzabAmirni1/bot-hamza-amirni-v2/master/media/menu.jpg';

    await conn.sendMessage(channelId, {
        text: text,
        contextInfo: {
            mentionedJid: [m.sender],
            forwardingScore: 9999, 
            isForwarded: true, 
            forwardedNewsletterMessageInfo: {
                newsletterJid: channelId,
                serverMessageId: 20,
                newsletterName: channelName
            },
            externalAdReply: {
                title: global.author || "Hamza Amirni", 
                body: "رسالة رسمية من " + (global.namebot || "BOT AMIRNI HAMZA"),
                thumbnailUrl: thumbnailUrl, 
                sourceUrl: null,
                mediaType: 1
            }
        }
    });

    m.reply('✅ تم إرسال ونشر الرسالة في القناة بنجاح.');
}

handler.help = ['sendtochannel <نص>', 'send-to-channel'];
handler.command = ['sendtochannel', 'send-to-channel'];
handler.tags = ['owner'];
handler.owner = true
export default handler;

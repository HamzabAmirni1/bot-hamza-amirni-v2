import { generateWAMessageFromContent, proto } from 'baileys';

// ── Design branded "رسالة من المطور" message with buttons
async function sendBroadcastMessage(conn, jid, text, mediaUrl = null, mediaType = null) {
    const buttons = [
        {
            "name": "cta_url",
            "buttonParamsJson": JSON.stringify({
                display_text: "📢 قناة الواتساب",
                url: "https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p"
            })
        },
        {
            "name": "cta_url",
            "buttonParamsJson": JSON.stringify({
                display_text: "📸 إنستغرام 01",
                url: "https://www.instagram.com/hamza_amirni_01"
            })
        },
        {
            "name": "cta_url",
            "buttonParamsJson": JSON.stringify({
                display_text: "📸 إنستغرام 02",
                url: "https://www.instagram.com/hamza_amirni_02"
            })
        },
        {
            "name": "cta_url",
            "buttonParamsJson": JSON.stringify({
                display_text: "🤖 صفحة البوت",
                url: "https://www.facebook.com/profile.php?id=61578860781418&mibextid=rS40aB7S9Ucbxw6v"
            })
        },
        {
            "name": "cta_url",
            "buttonParamsJson": JSON.stringify({
                display_text: "📘 الصفحة الرسمية",
                url: "https://www.facebook.com/hamzaamirni.official"
            })
        }
    ];

    const header_text = '📣 رسالة من المطور — حمزة اعمرني';
    const full_text = `${header_text}\n${'─'.repeat(30)}\n\n${text}\n\n${'─'.repeat(30)}\n⚡ *bot amirni hamza*`;

    try {
        // If there's media (image), send it with caption using interactive
        if (mediaUrl && mediaType === 'image') {
            const { generateWAMessageContent } = await import('baileys');
            const { imageMessage } = await generateWAMessageContent(
                { image: { url: mediaUrl } },
                { upload: conn.waUploadToServer }
            ).catch(() => ({ imageMessage: null }));

            if (imageMessage) {
                const botMsg = generateWAMessageFromContent(jid, {
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        header: proto.Message.InteractiveMessage.Header.fromObject({
                            title: header_text,
                            hasMediaAttachment: true,
                            imageMessage
                        }),
                        body: proto.Message.InteractiveMessage.Body.create({ text }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: 'bot amirni hamza • حمزة اعمرني' }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons })
                    })
                }, {});
                await conn.relayMessage(jid, botMsg.message, { messageId: botMsg.key.id });
                return;
            }
        }

        // Text only interactive message (no viewOnceMessage wrapper so Web & Phone load it cleanly)
        const botMsg = generateWAMessageFromContent(jid, {
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                body: proto.Message.InteractiveMessage.Body.create({ text: full_text }),
                footer: proto.Message.InteractiveMessage.Footer.create({ text: 'bot amirni hamza • حمزة اعمرني' }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons })
            })
        }, {});
        await conn.relayMessage(jid, botMsg.message, { messageId: botMsg.key.id });
    } catch (err) {
        // Fallback to plain text
        await conn.sendMessage(jid, { text: full_text });
    }
}

const handler = async (m, { conn, text, command, usedPrefix }) => {
    // ── Only owner can use this command
    const isROwner = global.owner.some(([num]) => m.sender.includes(num));
    if (!isROwner) return m.reply('❌ هذا الأمر خاص بالمالك فقط!');

    if (!text) return m.reply(
        `📣 *أمر البث الجماعي*\n\n` +
        `استخدم هذا الأمر لإرسال رسالة لجميع المستخدمين.\n\n` +
        `*مثال:*\n${usedPrefix}devmsg مرحباً بالجميع! تم تحديث البوت 🚀\n\n` +
        `📊 *إحصائيات الإرسال ستظهر بعد اكتمال البث.*`
    );

    // Get all registered users from database
    let users = [];
    try {
        users = Object.keys(global.db?.data?.users || {});
    } catch (_) {}

    if (!users.length) return m.reply('❌ لا يوجد مستخدمون مسجلون في قاعدة البيانات بعد.');

    // Check if quoted message has media (image)
    let mediaUrl = null;
    let mediaType = null;
    if (m.quoted) {
        const q = m.quoted;
        if (q.mtype === 'imageMessage') {
            try {
                const buffer = await q.download();
                mediaUrl = q.message?.imageMessage?.url || null;
                if (mediaUrl) mediaType = 'image';
            } catch (_) {}
        }
    }

    const total = users.length;
    let sent = 0, failed = 0;

    // Send initial status
    const statusMsg = await m.reply(`📣 *جاري إرسال الرسالة لـ ${total} مستخدم...*\n⏳ يرجى الانتظار...`);

    // Batch send with delay to avoid spam detection
    for (const jid of users) {
        try {
            if (!jid || jid.includes('@broadcast') || jid.includes('@newsletter')) continue;
            await sendBroadcastMessage(conn, jid, text, mediaUrl, mediaType);
            sent++;
            // 800ms delay between each message
            await new Promise(r => setTimeout(r, 800));
        } catch (e) {
            failed++;
        }
    }

    // Save broadcast log to Supabase
    try {
        const SB_KEY = process.env.SUPABASE_KEY || process.env.SB_KEY || '';
        const SB_URL = 'https://tpchjgdnovfbtvlhhszq.supabase.co';
        await fetch(`${SB_URL}/rest/v1/broadcasts`, {
            method: 'POST',
            headers: {
                'apikey': SB_KEY,
                'Authorization': 'Bearer ' + SB_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                text,
                sent_count: sent,
                failed_count: failed,
                total_count: total,
                sent_by: m.sender,
                has_media: !!mediaUrl,
                created_at: new Date().toISOString()
            })
        });
    } catch (_) {}

    // Final status
    await m.reply(
        `✅ *اكتمل البث الجماعي!*\n\n` +
        `📊 *إحصائيات الإرسال:*\n` +
        `• 👥 إجمالي المستخدمين: *${total}*\n` +
        `• ✅ تم الإرسال: *${sent}*\n` +
        `• ❌ فشل الإرسال: *${failed}*\n\n` +
        `⚡ *bot amirni hamza*`
    );
};

handler.help = ['devmsg <رسالة>'];
handler.tags = ['owner'];
handler.command = /^(devmsg|broadcast|bcast)$/i;
handler.owner = true;

export default handler;

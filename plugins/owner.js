import { generateWAMessageFromContent, proto } from 'baileys';

let handler = async (m, { conn, usedPrefix }) => {
    // 1. Send VCard (Contact) for the Owner
    const ownerNumber = '212612030829';
    const ownerName = 'Hamza Aamarni';
    
    const vcard = 'BEGIN:VCARD\n' // metadata of the contact card
        + 'VERSION:3.0\n' 
        + 'FN:' + ownerName + '\n' // full name
        + 'ORG:Silana Bot Owner;\n' // organization
        + 'TEL;type=CELL;type=VOICE;waid=' + ownerNumber + ':+ ' + ownerNumber + '\n' // WhatsApp ID + phone number
        + 'END:VCARD';

    await conn.sendMessage(m.chat, {
        contacts: {
            displayName: ownerName,
            contacts: [{ vcard }]
        }
    }, { quoted: m });

    // 2. Send Short Presentation & Accounts Link
    const presentationText = `👑 *بطاقة تعريف مالك ومطور البوت* 👑\n\n`
        + `👤 *الاسم الكامل:* حمزة اعمرني (Hamza Aamarni)\n`
        + `💻 *الدور:* المطور الرئيسي وصاحب مشروع البوت.\n`
        + `🌐 *الاهتمامات:* مبرمج ومصمم مواقع ويب، مهتم بالذكاء الاصطناعي وتطوير بوتات التواصل الاجتماعي.\n\n`
        + `📫 *حساباتي للتواصل:* \n`
        + `📧 *البريد الإلكتروني:* hamzaamirni1@gmail.com\n`
        + `📸 *إنستغرام:* @hamza_amirni_01\n`
        + `📢 *قناة البوت على واتساب:* تابع التحديثات الحصرية أولاً بأول!\n\n`
        + `⚡ *bot amirini hamza*`;

    // Send using custom Interactive buttons specifically for owner to look highly premium
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
                display_text: "📸 حساب إنستغرام",
                url: "https://www.instagram.com/hamza_amirni_01"
            })
        },
        {
            "name": "cta_url",
            "buttonParamsJson": JSON.stringify({
                display_text: "📧 راسلني إيميل",
                url: "mailto:hamzaamirni1@gmail.com"
            })
        }
    ];

    const botMsg = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                    body: proto.Message.InteractiveMessage.Body.create({ text: presentationText }),
                    footer: proto.Message.InteractiveMessage.Footer.create({ text: 'Hamza Amirni Presentation Card' }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                        buttons
                    })
                })
            }
        }
    }, { quoted: m });

    await conn.relayMessage(m.chat, botMsg.message, { messageId: botMsg.key.id });
};

handler.help = ['owner', 'creator'];
handler.tags = ['infobot'];
handler.command = /^(owner|creator)$/i;

export default handler;

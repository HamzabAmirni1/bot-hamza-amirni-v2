import { generateWAMessageFromContent, proto } from 'baileys';

let handler = async (m, { conn, usedPrefix }) => {
    // 1. Send VCard (Contact) for the Owner
    const ownerNumber = '212612030829';
    const ownerName = 'Hamza Amirni';
    
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

    const presentationText =
        `👑 *بطاقة تعريف مالك ومطور البوت* 👑\n` +
        `${'─'.repeat(30)}\n\n` +
        `👤 *الاسم:* حمزة اعمرني (Hamza Amirni)\n` +
        `💻 *الدور:* مطور البوت والمبرمج الرئيسي\n` +
        `🌐 *مجال العمل:* مبرمج ويب، ذكاء اصطناعي، بوتات\n\n` +
        `📫 *حساباتي للتواصل:*\n` +
        `📧 *إيميل:* hamzaamirni1@gmail.com\n` +
        `📸 *إنستغرام:* @hamza_amirni_01\n` +
        `📢 *قناة الواتساب:* اضغط الزر أدناه!\n\n` +
        `${'─'.repeat(30)}\n` +
        `⚡ *bot amirini hamza*`;

    // conn.sendMessage is already auto-wrapped with channel+instagram buttons
    await conn.sendMessage(m.chat, { text: presentationText }, { quoted: m });


};

handler.help = ['owner', 'creator'];
handler.tags = ['infobot'];
handler.command = /^(owner|creator)$/i;

export default handler;

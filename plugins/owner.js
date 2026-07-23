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
        `📱 *رقم المالك:* +212 612-030829\n` +
        `💻 *الدور:* مطور البوت والمبرمج الرئيسي\n` +
        `🌐 *مجال العمل:* مبرمج ويب، ذكاء اصطناعي، وتطوير البوتات\n\n` +
        `📫 *حساباتي للتواصل الفوري:*\n` +
        `📧 *البريد الإلكتروني:* hamzaamirni1@gmail.com\n` +
        `📸 *حساب إنستغرام:* https://www.instagram.com/hamza_amirni_01\n` +
        `📢 *قناة الواتساب الرسمية:* https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p\n\n` +
        `${'─'.repeat(30)}\n` +
        `⚡ *bot amirini hamza*`;

    await conn.sendMessage(m.chat, { text: presentationText }, { quoted: m });


};

handler.help = ['owner', 'creator'];
handler.tags = ['infobot'];
handler.command = /^(owner|creator)$/i;

export default handler;

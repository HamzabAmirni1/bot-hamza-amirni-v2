import { generateWAMessageFromContent, proto } from 'baileys';

let handler = async (m, { conn, usedPrefix }) => {
    // 1. Send VCards (Contacts) for both Owner numbers (212612030829 & 212624855939)
    const owners = [
        { name: 'Hamza Amirni', number: '212612030829' },
        { name: 'Hamza Amirni', number: '212624855939' }
    ];
    
    const contacts = owners.map(o => ({
        vcard: 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n' 
            + 'FN:' + o.name + '\n'
            + 'ORG:Silana Bot Owner;\n'
            + 'TEL;type=CELL;type=VOICE;waid=' + o.number + ':+ ' + o.number + '\n'
            + 'END:VCARD'
    }));

    await conn.sendMessage(m.chat, {
        contacts: {
            displayName: 'Hamza Amirni (Owner)',
            contacts
        }
    }, { quoted: m });

    // 2. Send presentation text with interactive CTA URL buttons (same button style as menu)
    const presentationText =
        `👑 *بطاقة تعريف مالك ومطور البوت* 👑\n` +
        `${'─'.repeat(30)}\n\n` +
        `👤 *الاسم:* حمزة اعمرني (Hamza Amirni)\n` +
        `📱 *أرقام المالك:*\n` +
        `  ▸ +212 612-030829\n` +
        `  ▸ +212 624-855939\n\n` +
        `💻 *الدور:* مطور البوت والمبرمج الرئيسي\n` +
        `🌐 *مجال العمل:* مبرمج ويب، ذكاء اصطناعي، وتطوير البوتات\n\n` +
        `📫 *حساباتي للتواصل الفوري:*\n` +
        `📧 *البريد الإلكتروني:* hamzaamirni1@gmail.com\n\n` +
        `⚡ *انقر على الأزرار أدناه للوصول السريع إلى القناة والحسابات:*`;

    await conn.sendButton(m.chat, {
        text: presentationText,
        footer: 'bot amirini hamza • حمزة اعمرني',
        buttons: [
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '📢 قناة الواتساب الرسمية',
                    url: 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p'
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '📸 حساب إنستغرام',
                    url: 'https://www.instagram.com/hamza_amirni_01'
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '📧 إرسال بريد إلكتروني',
                    url: 'mailto:hamzaamirni1@gmail.com'
                })
            }
        ]
    }, { quoted: m });
};

handler.help = ['owner', 'creator'];
handler.tags = ['infobot'];
handler.command = /^(owner|creator)$/i;

export default handler;

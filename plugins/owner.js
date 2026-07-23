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
        `📸 *إنستغرام 1:* @hamza_amirni_01\n` +
        `📸 *إنستغرام 2:* @hamza_amirni_02\n` +
        `🤖 *فيسبوك البوت:* chatbot hamza amirni\n` +
        `📘 *فيسبوك الرسمي:* Hamza Amirni Official\n\n` +
        `⚡ *انقر على الأزرار أدناه للوصول السريع إلى القناة والحسابات:*`;

    await conn.sendButton(m.chat, {
        text: presentationText,
        footer: 'bot amirni hamza • حمزة اعمرني',
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
                    display_text: '📸 إنستغرام 01',
                    url: 'https://www.instagram.com/hamza_amirni_01'
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '📸 إنستغرام 02',
                    url: 'https://www.instagram.com/hamza_amirni_02'
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🤖 صفحة البوت فيسبوك',
                    url: 'https://www.facebook.com/profile.php?id=61578860781418&mibextid=rS40aB7S9Ucbxw6v'
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '📘 الصفحة الرسمية فيسبوك',
                    url: 'https://www.facebook.com/hamzaamirni.official'
                })
            }
        ]
    }, { quoted: m });
};

handler.help = ['owner', 'creator'];
handler.tags = ['infobot'];
handler.command = /^(owner|creator)$/i;

export default handler;

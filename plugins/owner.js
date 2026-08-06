import { generateWAMessageFromContent, proto } from 'baileys';

let handler = async (m, { conn, usedPrefix }) => {
    let user = global.db.data.users[m.sender] || {};
    let lang = user.language || 'darija';

    // 1. Send VCards (Contacts) for both Owner numbers (212612030829 & 212624855939)
    const owners = [
        { name: 'Hamza Amirni', number: '212612030829' },
        { name: 'Hamza Amirni', number: '212624855939' }
    ];
    
    const contacts = owners.map(o => ({
        vcard: 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n' 
            + 'FN:' + o.name + '\n'
            + 'ORG:Bot Hamza Amirni Owner;\n'
            + 'TEL;type=CELL;type=VOICE;waid=' + o.number + ':+ ' + o.number + '\n'
            + 'END:VCARD'
    }));

    await conn.sendMessage(m.chat, {
        contacts: {
            displayName: 'Hamza Amirni (Owner)',
            contacts
        }
    }, { quoted: m });

    let presentationText = '';
    let btnTextChannel = '';
    let btnTextIg1 = '';
    let btnTextIg2 = '';
    let btnTextFbBot = '';
    let btnTextFbOfficial = '';

    if (lang === 'english') {
        presentationText =
            `👑 *Bot Owner & Developer Profile* 👑\n` +
            `${'─'.repeat(30)}\n\n` +
            `👤 *Name:* Hamza Amirni\n` +
            `📱 *Owner Numbers:*\n` +
            `  ▸ +212 612-030829\n` +
            `  ▸ +212 624-855939\n\n` +
            `💻 *Role:* Lead Developer & Programmer\n` +
            `🌐 *Specialization:* Web Development, AI & Bot Engineering\n\n` +
            `📫 *Official Accounts:*\n` +
            `📸 *Instagram 1:* @hamza_amirni_01\n` +
            `📸 *Instagram 2:* @hamza_amirni_02\n` +
            `🤖 *Bot Facebook Page:* chatbot hamza amirni\n` +
            `📘 *Official Facebook:* Hamza Amirni Official\n\n` +
            `⚡ *Click the buttons below for direct links:*`;
        btnTextChannel = '📢 Official WhatsApp Channel';
        btnTextIg1 = '📸 Instagram 01';
        btnTextIg2 = '📸 Instagram 02';
        btnTextFbBot = '🤖 Bot Facebook Page';
        btnTextFbOfficial = '📘 Official Facebook Page';
    } else if (lang === 'arabic') {
        presentationText =
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
        btnTextChannel = '📢 قناة الواتساب الرسمية';
        btnTextIg1 = '📸 إنستغرام 01';
        btnTextIg2 = '📸 إنستغرام 02';
        btnTextFbBot = '🤖 صفحة البوت فيسبوك';
        btnTextFbOfficial = '📘 الصفحة الرسمية فيسبوك';
    } else {
        presentationText =
            `👑 *بطاقة تعريف مالك ومطور البوت* 👑\n` +
            `${'─'.repeat(30)}\n\n` +
            `👤 *الاسم:* حمزة اعمرني (Hamza Amirni)\n` +
            `📱 *نمرة الساط المالك:*\n` +
            `  ▸ +212 612-030829\n` +
            `  ▸ +212 624-855939\n\n` +
            `💻 *الدور:* المطور والمبرمج الرئيسي للبوت\n` +
            `🌐 *التخصص:* تطوير الويب والذكاء الاصطناعي\n\n` +
            `📫 *الحسابات الرسمية للتواصل:*\n` +
            `📸 *إنستغرام 1:* @hamza_amirni_01\n` +
            `📸 *إنستغرام 2:* @hamza_amirni_02\n` +
            `🤖 *فيسبوك البوت:* chatbot hamza amirni\n` +
            `📘 *فيسبوك الرسمي:* Hamza Amirni Official\n\n` +
            `⚡ *برك على الأزرار لتحت باش تواصل مع المطور مباشرة:*`;
        btnTextChannel = '📢 قناة الواتساب الرسمية';
        btnTextIg1 = '📸 إنستغرام 01';
        btnTextIg2 = '📸 إنستغرام 02';
        btnTextFbBot = '🤖 صفحة البوت فيسبوك';
        btnTextFbOfficial = '📘 الصفحة الرسمية فيسبوك';
    }

    await conn.sendButton(m.chat, {
        text: presentationText,
        footer: 'bot amirni hamza • حمزة اعمرني',
        buttons: [
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: btnTextChannel,
                    url: 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p'
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: btnTextIg1,
                    url: 'https://www.instagram.com/hamza_amirni_01'
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: btnTextIg2,
                    url: 'https://www.instagram.com/hamza_amirni_02'
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: btnTextFbBot,
                    url: 'https://www.facebook.com/profile.php?id=61578860781418&mibextid=rS40aB7S9Ucbxw6v'
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: btnTextFbOfficial,
                    url: 'https://www.facebook.com/hamzaamirni.official'
                })
            },
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '🌐 Change Language',
                    id: `${_p}lang`
                })
            }
        ]
    }, { quoted: m });
};

handler.help = ['owner', 'creator'];
handler.tags = ['infobot'];
handler.command = /^(owner|creator|المطور|أونر|اونر|مالك|مالك_البوت|المالك)$/i;

export default handler;

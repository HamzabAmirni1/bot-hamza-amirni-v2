let handler = async (m, { conn, usedPrefix }) => {
    let user = global.db?.data?.users?.[m.sender] || {};
    let lang = user.language || 'darija';

    // 1. Send VCards (Contacts) for Owner numbers
    const owners = [
        { name: 'Hamza Amirni (المطور والمالك)', number: '212612030829' },
        { name: 'Hamza Amirni (المالك الثاني)', number: '212624855939' }
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
    }, { quoted: m }).catch(() => {});

    let presentationText = '';
    let btnTextChannel = '';
    let btnTextIg = '';
    let btnTextFb = '';
    let btnTextSite = '';

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
            `📸 *Instagram:* @hamza_amirni_01\n` +
            `🤖 *Facebook:* chatbot hamza amirni\n` +
            `🌐 *Control Panel:* https://gestionbothamzaamirni01.koyeb.app/\n\n` +
            `⚡ *Click the buttons below for direct links:*`;
        btnTextChannel = '📢 Official WhatsApp Channel';
        btnTextIg = '📸 Instagram Official';
        btnTextFb = '🤖 Facebook Page';
        btnTextSite = '🌐 Control Panel Website';
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
            `📸 *إنستغرام:* @hamza_amirni_01\n` +
            `🤖 *فيسبوك البوت:* chatbot hamza amirni\n` +
            `🌐 *لوحة التحكم والربط:* https://gestionbothamzaamirni01.koyeb.app/\n\n` +
            `⚡ *انقر على الأزرار أدناه للوصول السريع إلى القناة والحسابات:*`;
        btnTextChannel = '📢 قناة الواتساب الرسمية';
        btnTextIg = '📸 إنستغرام المطور';
        btnTextFb = '🤖 صفحة الفيسبوك';
        btnTextSite = '🌐 موقع لوحة التحكم';
    } else {
        presentationText =
            `👑 *بطاقة تعريف مالك ومطور البوت* 👑\n` +
            `${'─'.repeat(30)}\n\n` +
            `👤 *الاسم:* حمزة اعمرني (Hamza Amirni)\n` +
            `📱 *نمرة المالك:*\n` +
            `  ▸ +212 612-030829\n` +
            `  ▸ +212 624-855939\n\n` +
            `💻 *الدور:* المطور والمبرمج الرئيسي للبوت\n` +
            `🌐 *التخصص:* تطوير الويب والذكاء الاصطناعي\n\n` +
            `📫 *الحسابات الرسمية للتواصل:*\n` +
            `📸 *إنستغرام:* @hamza_amirni_01\n` +
            `🤖 *فيسبوك البوت:* chatbot hamza amirni\n` +
            `🌐 *لوحة التحكم والربط:* https://gestionbothamzaamirni01.koyeb.app/\n\n` +
            `⚡ *برك على الأزرار لتحت باش تواصل مع المطور مباشرة:*`;
        btnTextChannel = '📢 قناة الواتساب الرسمية';
        btnTextIg = '📸 إنستغرام المطور';
        btnTextFb = '🤖 صفحة الفيسبوك';
        btnTextSite = '🌐 موقع لوحة التحكم';
    }

    const buttons = [
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
                display_text: btnTextIg,
                url: 'https://www.instagram.com/hamza_amirni_01'
            })
        },
        {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: btnTextFb,
                url: 'https://www.facebook.com/profile.php?id=61578860781418'
            })
        },
        {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: btnTextSite,
                url: 'https://gestionbothamzaamirni01.koyeb.app/'
            })
        }
    ];

    await conn.sendButton(m.chat, {
        body: presentationText,
        footer: 'bot amirni hamza • حمزة اعمرني',
        buttons
    }, { quoted: m }).catch(async () => {
        await m.reply(presentationText).catch(() => {});
    });
};

handler.help = ['owner', 'creator'];
handler.tags = ['infobot'];
handler.command = /^(owner|creator|المطور|أونر|اونر|مالك|مالك_البوت|المالك)$/i;

export default handler;

import { generateWAMessageFromContent, proto } from 'baileys';

let handler = async (m, { conn, command, usedPrefix }) => {
    let user = global.db?.data?.users?.[m.sender] || {};
    let lang = user.language || 'darija';

    const websiteUrl = 'https://gestionbothamzaamirni01.koyeb.app/';

    // 1. Send VCards (Contacts) for Developer / Owner
    const owners = [
        { name: 'Hamza Amirni (المطور)', number: '212612030829' },
        { name: 'Hamza Amirni (المالك)', number: '212624855939' }
    ];
    
    const contacts = owners.map(o => ({
        vcard: 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n' 
            + 'FN:' + o.name + '\n'
            + 'ORG:Bot Hamza Amirni Developer;\n'
            + 'TEL;type=CELL;type=VOICE;waid=' + o.number + ':+ ' + o.number + '\n'
            + 'END:VCARD'
    }));

    await conn.sendMessage(m.chat, {
        contacts: {
            displayName: 'Hamza Amirni (المطور والمالك)',
            contacts
        }
    }, { quoted: m }).catch(() => {});

    // 2. Multilingual response text
    let msgText = '';
    if (lang === 'english') {
        msgText = 
            `🤖 *BOT PAIRING & CLONING (JADIBOT / CODE)* 🤖\n` +
            `${'─'.repeat(32)}\n\n` +
            `👋 Welcome! If you want to connect your phone number and get your own WhatsApp bot directly, please contact the developer or use the official control panel below:\n\n` +
            `🌐 *Official Panel Link:* \n${websiteUrl}\n\n` +
            `👑 *Developer:* Hamza Amirni\n` +
            `📱 *WhatsApp:* +212 612-030829 / +212 624-855939\n\n` +
            `⚡ *Steps to connect:* \n` +
            `1. Open the website: ${websiteUrl}\n` +
            `2. Log in and enter your phone number\n` +
            `3. Get your 8-digit WhatsApp pairing code & link instantly!`;
    } else if (lang === 'arabic') {
        msgText = 
            `🤖 *ربط البوت وتنصيب رقمك (JADIBOT / CODE)* 🤖\n` +
            `${'─'.repeat(32)}\n\n` +
            `👋 مرحباً بك! لربط رقمك والحصول على بوت خاص بك فـ واتساب، يرجى التواصل مع المطور أو الدخول مباشرة إلى لوحة التحكم لربط كود الإقران:\n\n` +
            `🌐 *رابط الموقع المباشر للربط:* \n${websiteUrl}\n\n` +
            `👑 *المطور والبرمج:* حمزة أميرني (Hamza Amirni)\n` +
            `📱 *واتساب المطور:* +212 612-030829 / +212 624-855939\n\n` +
            `⚡ *خطوات الربط المباشر:* \n` +
            `1. افتح الموقع: ${websiteUrl}\n` +
            `2. ادخل رقمك فـ قسم الجلسات والربط\n` +
            `3. احصل على رمز الإقران (Pairing Code) وربط البوت مباشرة!`;
    } else {
        // Darija (default)
        msgText = 
            `🤖 *ربط البوت وتنصيب نمرة جديدة (JADIBOT / CODE)* 🤖\n` +
            `${'─'.repeat(32)}\n\n` +
            `👋 أهلاً بك أ العشير! لا بغيتي تربط نمرتك ويولي عندك بوت ديالك خاص فـ الواتساب، تواصل مع المطور ولا دخل نيشان للوحة التحكم فـ الموقع تحت باش تحصل على كود الإقران:\n\n` +
            `🌐 *رابط موقع الربط المباشر:* \n${websiteUrl}\n\n` +
            `👑 *المطور والبرمج:* Hamza Amirni (حمزة أميرني)\n` +
            `📱 *واتساب المطور:* +212 612-030829 / +212 624-855939\n\n` +
            `⚡ *طريقة الربط من الموقع:* \n` +
            `1. دخل للموقع: ${websiteUrl}\n` +
            `2. اكتب نمرتك فـ صفحة الجلسات والربط\n` +
            `3. غايطلع لك رمز الإقران (Pairing Code) مباشرة فـ الواتساب!`;
    }

    // 3. Send message with interactive button for website link
    try {
        const msg = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ text: msgText }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: '⚡ Official Panel • BOT HAMZA AMIRNI v2.5' }),
                        header: proto.Message.InteractiveMessage.Header.create({
                            title: '🤖 BOT HAMZA AMIRNI',
                            subtitle: 'Jadibot & Pairing System',
                            hasMediaAttachment: false
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: [
                                {
                                    name: 'cta_url',
                                    buttonParamsJson: JSON.stringify({
                                        display_text: '🌐 فتح موقع الربط المباشر',
                                        url: websiteUrl,
                                        merchant_url: websiteUrl
                                    })
                                },
                                {
                                    name: 'cta_url',
                                    buttonParamsJson: JSON.stringify({
                                        display_text: '👑 تواصل مع المطور فـ واتساب',
                                        url: 'https://wa.me/212612030829'
                                    })
                                }
                            ]
                        })
                    })
                }
            }
        }, { quoted: m });

        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    } catch (e) {
        // Fallback simple reply if native buttons fail
        await m.reply(msgText);
    }
};

handler.help = ['jadibot', 'code', 'tansib', 'pair', 'botclone'];
handler.tags = ['main', 'tools'];
handler.command = /^(jadibot|jadibot2|code|tansib|tansib2|botclone|subbot|clone|pair|pairing|ربط|تنصيب|كود|اقتران)$/i;

export default handler;

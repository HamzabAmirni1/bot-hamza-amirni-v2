// ============================================================
// plugins/jadibot.js — JadiBot / WhatsApp Pairing & Clone System
// Supports:
// 1. Classic informative card for all users with official links & contacts
// 2. Direct Pairing Code Generation for Owner & Bot Admins (.jadibot <number>)
// 3. One-tap Quick-Reply button for Owner to generate pairing code
// ============================================================

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');

let handler = async (m, { conn, args, text, command, usedPrefix, isOwner }) => {
    let user = global.db?.data?.users?.[m.sender] || {};
    let lang = user.language || 'darija';
    const websiteUrl = 'https://gestionbothamzaamirni01.koyeb.app/';

    const senderNum = (m.sender || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const _settings = global.db?.data?.settings || {};
    const _botAdmins = Array.isArray(_settings.botAdmins) ? _settings.botAdmins : [];
    const isBotAdmin = isOwner || _botAdmins.some(a => String(a).replace(/[^0-9]/g, '') === senderNum);

    // Extract requested target number if provided
    let rawInput = (args[0] || text || '').trim();
    let targetPhone = rawInput.replace(/[^0-9]/g, '');

    // If not provided in args, check if quoting a message
    if (!targetPhone && m.quoted) {
        targetPhone = (m.quoted.sender || '').replace(/[^0-9]/g, '');
    }

    // Default target for button reference
    const defaultTarget = targetPhone || senderNum;

    // ─────────────────────────────────────────────────────────────
    // CASE A: ADMIN / OWNER PROVIDES A PHONE NUMBER -> GENERATE CODE
    // ─────────────────────────────────────────────────────────────
    if (isBotAdmin && targetPhone && targetPhone.length >= 8) {
        if (targetPhone.length > 15) {
            return m.reply('⚠️ *رقم الهاتف غير صالح.* يرجى إدخال رقم صحيح مع كود الدولة (مثال: `212612345678`).');
        }

        await m.reply(`⏳ *جاري طلب وتوليد رمز الإقران (Pairing Code)...*\n📱 *الرقم المطلوب:* +${targetPhone}\n_المرجو الانتظار بضع ثوانٍ بينما يقوم السيرفر بإنشاء الجلسة..._`);

        const port = process.env.PORT || 8000;

        // 1. Request server to spawn worker & request pairing code
        try {
            await fetch(`http://127.0.0.1:${port}/api/requestpair`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: targetPhone })
            });
        } catch (_) {
            // Also notify Supabase directly as fallback
            try {
                await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth', {
                    method: 'POST',
                    headers: {
                        'apikey': SB_KEY,
                        'Authorization': 'Bearer ' + SB_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({
                        phone_number: targetPhone,
                        session_data: null,
                        pairing_code: null,
                        status: 'requesting',
                        updated_at: new Date().toISOString()
                    })
                });
            } catch (_) {}
        }

        // 2. Poll for generated pairing code (up to 30 seconds)
        let pairingCode = null;
        for (let i = 0; i < 18; i++) {
            await new Promise(r => setTimeout(r, 1600));

            // Try local API endpoint
            try {
                const pRes = await fetch(`http://127.0.0.1:${port}/api/pairingcode?phone=${targetPhone}`);
                if (pRes.ok) {
                    const pData = await pRes.json();
                    if (pData.pairing_code && pData.pairing_code !== 'null') {
                        pairingCode = pData.pairing_code;
                        break;
                    }
                }
            } catch (_) {}

            // Try Supabase directly
            try {
                const sRes = await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth?phone_number=eq.${targetPhone}&select=pairing_code,status`, {
                    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
                });
                if (sRes.ok) {
                    const sData = await sRes.json();
                    if (sData[0]?.pairing_code && sData[0].pairing_code !== 'null') {
                        pairingCode = sData[0].pairing_code;
                        break;
                    }
                }
            } catch (_) {}
        }

        // 3. If pairing code successfully obtained
        if (pairingCode) {
            const cleanCode = String(pairingCode).trim();
            const pairMsg = `🔢 *رمز الإقران الخاص برقمك (PAIRING CODE)* 🤖\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `📱 *الرقم:* +${targetPhone}\n` +
                `🔑 *رمز الإقران:* *${cleanCode}*\n\n` +
                `⚡ *طريقة الربط في واتساب:*\n` +
                `1. افتح تطبيق واتساب في الهاتف صاحب الرقم\n` +
                `2. ادخل لـ: *الإعدادات (Settings) > الأجهزة المرتبطة (Linked Devices) > ربط جهاز (Link a Device)*\n` +
                `3. اضغط: *الربط برقم الهاتف (Link with phone number instead)*\n` +
                `4. اكتب الرمز التالي:\n` +
                `👉 *${cleanCode}*\n\n` +
                `⏱️ *صلاحية الرمز:* دقيقتان فقط\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `_⚡ bot amirni hamza • حمزة اعمرني_`;

            const buttons = [
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 نسخ رمز الإقران',
                        id: cleanCode,
                        copy_code: cleanCode
                    })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🌐 لوحة التحكم والموقع',
                        url: websiteUrl
                    })
                }
            ];

            try {
                await conn.sendButton(m.chat, {
                    body: pairMsg,
                    footer: '⚡ Official Panel • BOT HAMZA AMIRNI',
                    buttons
                }, { quoted: m });
            } catch (_) {
                await m.reply(pairMsg).catch(() => {});
            }

            // Also send plain code separately for instant tap-to-copy
            await m.reply(cleanCode).catch(() => {});
            return;
        } else {
            return m.reply(
                `⚠️ *تعذر جلب رمز الإقران تلقائياً في الوقت المحدد.*\n\n` +
                `يرجى التأكد أن الرقم (+${targetPhone}) متصل بواتساب، أو الدخول مباشرة للوحة التحكم لطلب الكود:\n${websiteUrl}`
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // CASE B: NON-ADMIN SPECIFIED A PHONE NUMBER -> ALERT OWNER + REPLY
    // ─────────────────────────────────────────────────────────────
    if (!isBotAdmin && targetPhone && targetPhone.length >= 8) {
        // Send alert to owner Hamza with one-tap generation button
        const ownerJid = '212624855939@s.whatsapp.net';
        const ownerAlert = `🔔 *طلب ربط بوت جديد (JadiBot Request)*\n━━━━━━━━━━━━━━━━━━━━\n👤 *صاحب الطلب:* +${senderNum}\n📱 *الرقم المطلوب ربطه:* +${targetPhone}\n━━━━━━━━━━━━━━━━━━━━\n_لتوليد كود الإقران له مباشرة اضغط الزر أدناه:_`;

        try {
            await conn.sendButton(ownerJid, {
                body: ownerAlert,
                footer: '⚡ Bot Amirni Hamza • JadiBot Request',
                buttons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: `⚡ توليد كود لـ +${targetPhone}`,
                            id: `${usedPrefix + command} ${targetPhone}`
                        })
                    }
                ]
            });
        } catch (_) {}
    }

    // ─────────────────────────────────────────────────────────────
    // CASE C: STANDARD INFORMATIVE MESSAGE (The Classic Message)
    // ─────────────────────────────────────────────────────────────

    // 1. Send VCards (Contacts) for Developer / Owner
    const owners = [
        { name: 'Hamza Amirni حمزة اعمرني (المطور المالك)', number: '212624855939' }
    ];
    
    const contacts = owners.map(o => ({
        vcard: 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n' 
            + 'FN:' + o.name + '\n'
            + 'ORG:Bot حمزة اعمرني Developer;\n'
            + 'TEL;type=CELL;type=VOICE;waid=' + o.number + ':+ ' + o.number + '\n'
            + 'END:VCARD'
    }));

    await conn.sendMessage(m.chat, {
        contacts: {
            displayName: 'حمزة اعمرني Hamza Amirni (المطور والمالك)',
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
            `👑 *Developer:* Hamza Amirni (حمزة اعمرني)\n` +
            `📱 *WhatsApp:* +212 624-855939\n\n` +
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
            `👑 *المطور والبرمج:* حمزة اعمرني (Hamza Amirni)\n` +
            `📱 *واتساب المطور:* +212 624-855939\n\n` +
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
            `👑 *المطور والبرمج:* Hamza Amirni (حمزة اعمرني)\n` +
            `📱 *واتساب المطور:* +212 624-855939\n\n` +
            `⚡ *طريقة الربط من الموقع:* \n` +
            `1. دخل للموقع: ${websiteUrl}\n` +
            `2. اكتب نمرتك فـ صفحة الجلسات والربط\n` +
            `3. غايطلع لك رمز الإقران (Pairing Code) مباشرة فـ الواتساب!`;
    }

    const buttons = [
        {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '🌐 فتح موقع الربط المباشر',
                url: websiteUrl
            })
        },
        {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '👑 تواصل مع المطور فـ واتساب',
                url: 'https://wa.me/212624855939'
            })
        },
        {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text: `⚡ توليد كود الإقران (Owner/Admin)`,
                id: `${usedPrefix + command} ${defaultTarget}`
            })
        }
    ];

    await conn.sendButton(m.chat, {
        body: msgText,
        footer: '⚡ Official Panel • BOT HAMZA AMIRNI v2.5',
        buttons
    }, { quoted: m }).catch(async () => {
        await m.reply(msgText).catch(() => {});
    });
};

handler.help = ['jadibot [number]', 'code [number]', 'pair [number]'];
handler.tags = ['main', 'tools'];
handler.command = /^(jadibot|jadibot2|code|tansib|tansib2|botclone|subbot|clone|pair|pairing|ربط|تنصيب|كود|اقتران)$/i;

export default handler;

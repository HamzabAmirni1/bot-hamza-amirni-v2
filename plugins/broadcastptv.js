import { generateWAMessageContent } from "baileys";

const neura = async (m, { conn, usedPrefix, command }) => {
    const q = m.quoted ? m.quoted : m;
    const mime = (m.quoted ? m.quoted : m.msg).mimetype || '';

    if (!/video/g.test(mime)) {
        return m.reply(`Please reply to a video with the command\n\n${usedPrefix + command}`);
    }

    try {
        const media = await q.download?.();
        await m.reply('Starting PTV broadcast to all groups...');

        const groups = Object.entries(await conn.groupFetchAllParticipating())
            .map(entry => entry[1]);

        const msg = await generateWAMessageContent({
            video: media
        }, {
            upload: conn.waUploadToServer
        });
        let successCount = 0;

        for (const group of groups) {
            try {
                await conn.relayMessage(group.id, {
                    ptvMessage: msg.videoMessage
                }, {});
                successCount++;

                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Failed to send to group ${group.id}:`, error);
                continue;
            }
        }

        await m.reply(`PTV broadcast completed\n\nSuccessfully sent to ${successCount} out of ${groups.length} groups`);

    } catch (error) {
        console.error('Error in broadcast:', error);
        await m.reply('An error occurred during the PTV broadcast');
    }
};

neura.help = ['broadcastptv'];
neura.tags = ['owner'];
neura.command = /^(broadcastptv)$/i;
neura.owner = true;

export default neura;

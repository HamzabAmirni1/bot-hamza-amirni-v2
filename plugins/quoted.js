async function handler(m) {
	if (!m.quoted) throw 'reply to a message!';
	
	let q = await m.getQuotedObj();
	
	if (!q.quoted)
		throw 'the message you replied to does not contain a reply!';
	
	await q.quoted.copyNForward(m.chat, true);
}

handler.help = ['quoted'];
handler.tags = ['tools'];
handler.command = /^(quoted|q)$/i;
export default handler;
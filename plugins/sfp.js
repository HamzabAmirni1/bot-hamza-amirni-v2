import fs from 'fs';
import syntaxError from 'syntax-error';

let handler = async (m, { text, usedPrefix, command }) => {
	if (!text)
		throw `uhm.. where is the text?\n\nusage:\n${usedPrefix + command} <text>\n\nexample:\n${usedPrefix + command} plugins/file.js`;

	if (!m.quoted?.text) throw `reply to the message!`;

	let code = m.quoted.text;
	let path = `./plugins/${text}.js`;

	let err = syntaxError(code, path, {
		sourceType: 'module',
		allowAwaitOutsideFunction: true,
	});

	if (err)
		throw `❌ Syntax Error

Message : ${err.message}
Line : ${err.line}
Column : ${err.column}
Annotated : ${err.annotated}`;

	fs.writeFileSync(path, code);
	m.reply(`✅ saved in ${path}`);
};

handler.help = ['sfp'];
handler.tags = ['owner'];
handler.command = /^sfp$/i;
handler.owner = true;

export default handler;
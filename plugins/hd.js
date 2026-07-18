import axios from 'axios';
import FormData from 'form-data';
import { delay } from 'baileys';

let handler = async (m, { usedPrefix, command }) => {
	let quoted = m.quoted ? m.quoted : m;
	let mime = (quoted.msg || quoted).mimetype;

	if (!/image/.test(mime))
		throw `Send/Reply to an image with the caption ${usedPrefix + command}`;

	let media = await quoted.download();
	let res;

	if (/^hdr$/i.test(command)) {
		res = await upscale(media, 4);
	} else {
		res = await upscale(media, 2);
	}

	conn.sendFile(
		m.chat,
		res?.data?.downloadUrls[0],
		'hd.png',
		"Here's the result",
		m
	);
};

handler.help = ['hd'];
handler.tags = ['tools'];
handler.command = /^(hd)$/i;
handler.limit = false;

export default handler;

async function upscale(buffer, ratio = 2) {
	const form = new FormData();

	form.append('myfile', buffer, Date.now() + '.jpg');
	form.append('scaleRadio', ratio);

	const upload = await axios.post(
		'https://get1.imglarger.com/api/UpscalerNew/UploadNew',
		form,
		{
			headers: {
				...form.getHeaders(),
				Origin: 'https://imgupscaler.com',
			},
		}
	);

	if (upload.status !== 200)
		throw new Error('Failed to upload image');

	for (let i = 0; i < 20; i++) {
		const check = await axios.post(
			'https://get1.imglarger.com/api/UpscalerNew/CheckStatusNew',
			{
				code: upload.data?.data?.code,
				scaleRadio: ratio,
			},
			{
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);

		const result = check.data;

		if (result?.data?.status === 'success') {
			return result;
		}

		await delay(5000);
	}

	throw new Error('Upscale timeout');
}
let handler = async (m) => {
	let total = Object.values(global.plugins).filter((v) => v.help && v.tags).length;
	conn.adReply(m.chat, `Current Total Bot Features: ${total}`, './media/thumbnail.jpg', m, { title: 'My Total Love for You' });
};

handler.help = ['totalfeatures'];
handler.tags = ['infobot'];
handler.command = ['totalfeatures','feature'];

export default handler;
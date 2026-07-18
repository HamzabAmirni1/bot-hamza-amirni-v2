import moment from 'moment-timezone'
import fs from 'fs'

const handler = async (m, { conn, usedPrefix: _p, command, isOwner, args }) => {

	const allTags = {
		main: 'Main Menu',
		ai: 'AI Menu',
		downloader: 'Downloader Menu',
		uploader: 'Uploader Menu',
		editor: 'Editor Menu',
		sticker: 'Sticker Menu',
		tools: 'Tools Menu',
		infobot: 'Info Menu',
		group: 'Group Menu',
		owner: 'Owner Menu',
	}

	let teks = (args[0] || '').toLowerCase()
	let tags = {}

	if (!Object.keys(allTags).includes(teks)) teks = 'all'

	tags = teks === 'all'
		? { ...allTags }
		: { [teks]: allTags[teks] }

	if (!isOwner) delete tags.owner
	if (!m.isGroup) delete tags.group

	const defaultMenu = {
		before: `
╭━━━〔 ${conn.user.name} 〕━━━⬣
┃ 👋 ${ucapan()}, %name
┃
┃ 📅 %week, %date
┃ ⏱ Uptime: %uptime
┃ 👥 Users: %rtotalreg/%totalreg
╰━━━━━━━━━━━━⬣
%readmore`.trim(),

		header: '\n╭─〔 %category 〕',
		body: '│ ◦ %cmd %flags',
		footer: '╰────────────⬣',
		after: '',
	}

	try {
		const plugins = Object.values(global.plugins).filter(p => !p.disabled)

		const help = plugins.map(p => ({
			help: Array.isArray(p.help) ? p.help : [p.help],
			tags: Array.isArray(p.tags) ? p.tags : [p.tags],
			prefix: 'customPrefix' in p,
			limit: '',
			premium: '',
			owner: p.owner ? '🄾' : '',
		}))

		const rows = Object.keys(allTags).map(tag => ({
			title: allTags[tag],
			description: `Show ${tag} menu`,
			id: `${_p + command} ${tag}`,
		}))

		const text = [
			defaultMenu.before,
			...Object.keys(tags).map(tag => {
				const items = help
					.filter(p => p.tags.includes(tag))
					.flatMap(p =>
						p.help.map(h => {
							const cmd = p.prefix ? h : `${_p}${h}`
							const flags = [p.owner].join(' ')
							return defaultMenu.body
								.replace(/%cmd/g, cmd)
								.replace(/%flags/g, flags)
						})
					).join('\n')

				return `${defaultMenu.header.replace('%category', tags[tag])}\n${items}\n${defaultMenu.footer}`
			}),
			defaultMenu.after,
		].join('\n')

		let user = global.db.data.users[m.sender]
		let { registered } = user

		let name = registered ? user.name : conn.getName(m.sender)
		let uptime = clockString(process.uptime() * 1000)

		let totalreg = Object.keys(global.db.data.users).length
		let rtotalreg = Object.values(global.db.data.users).filter(u => u.registered).length

		let d = new Date()
		let locale = 'en-US'

		let week = d.toLocaleDateString(locale, { weekday: 'long' })
		let date = d.toLocaleDateString(locale, {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		})

		const replace = {
			'%': '',
			p: _p,
			uptime,
			me: conn.user.name,
			name,
			week,
			date,
			totalreg,
			rtotalreg,
			readmore: readMore,
		}

		conn.sendButton(
			m.chat,
			{
				image: fs.readFileSync('./media/menu.jpg'),
				caption: text.replace(
					new RegExp(`%(${Object.keys(replace).join('|')})`, 'g'),
					(_, key) => replace[key]
				),
				footer: global.namebot,
				buttons: [
					{
						name: 'single_select',
						buttonParamsJson: JSON.stringify({
							title: '📂 Menu List',
							sections: [{ rows }],
						}),
					},
					{
						name: 'quick_reply',
						buttonParamsJson: JSON.stringify({
							display_text: '👑 Owner',
							id: _p + 'owner',
						}),
					},
				],
			},
			{ quoted: m }
		)

	} catch (e) {
		console.error(e)
		m.reply('Error displaying menu.')
	}
}

handler.help = ['menu']
handler.command = /^(menu|help|\?)$/i

export default handler

const more = String.fromCharCode(8206)
const readMore = more.repeat(4001)

function clockString(ms) {
	let h = Math.floor(ms / 3600000)
	let m = Math.floor(ms / 60000) % 60
	let s = Math.floor(ms / 1000) % 60
	return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

function ucapan() {
	const time = moment.tz('Asia/Jakarta').format('HH')
	if (time < 4) return 'Good Night'
	if (time < 10) return 'Good Morning'
	if (time < 15) return 'Good Afternoon'
	if (time < 18) return 'Good Evening'
	return 'Good Night'
}

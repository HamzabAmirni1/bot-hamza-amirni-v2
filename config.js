// Fix MaxListenersExceededWarning in multi-bot worker threads
process.setMaxListeners(0);

import { watchFile, unwatchFile } from 'fs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { Button, ButtonV2, Carousel, AIRich } from './lib/MessageBuilder.js';

global.Button = Button;
global.ButtonV2 = ButtonV2;
global.Carousel = Carousel;
global.AIRich = AIRich;

const defaultSettings = { public: true, autoread: true, anticall: false, gconly: false };
const safeSettingsProxy = new Proxy({}, {
	get(target, prop) {
		if (prop === '__isProxy') return true;
		if (typeof prop === 'symbol') return target[prop];
		if (!target[prop]) {
			target[prop] = { ...defaultSettings };
		}
		return target[prop];
	}
});

if (!global.db) global.db = { sqlite: null, data: null };
if (!global.db.data) {
	global.db.data = { users: {}, chats: {}, stats: {}, msgs: {}, sticker: {}, settings: safeSettingsProxy };
} else if (!global.db.data.settings || !global.db.data.settings.__isProxy) {
	global.db.data.settings = safeSettingsProxy;
}

global.pairingNumber = process.env.PAIRING_NUMBER || '';
global.owner = [
	['212624855939', 'Hamza Amirni', true],
];

global.namebot = 'bot amirni hamza';
global.author = 'Hamza Amirni';
global.source = 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p';
global.channel = 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p';
global.instagram = 'https://www.instagram.com/hamza_amirni_01';
global.facebook = 'https://www.facebook.com/hamzaamirni01';
global.telegram = 'https://t.me/hamzaamirni';
global.anticall = true;
global.ANTI_CALL = true;
global.AUTO_AI = true;
global.auto_ai = true;

global.wait = 'Loading... | جاري الانتظار';
global.eror = 'There is an error... | وقع خطأ';

global.pakasir = {
	slug: 'kilersbotz',
	apikey: 'bWDO2M8GcfruzXscdKNQJC3vw8Y8PV13',
	expired: 30, //1 = 1menit. 30 = 30menit
};

global.stickpack = 'Created By';
global.stickauth = namebot;

global.multiplier = 38; // The higher, The harder levelup

/*============== EMOJI ==============*/
global.rpg = {
	emoticon(string) {
		string = string.toLowerCase();
		let emot = {
			level: '📊',
			limit: '🎫',
			health: '❤️',
			stamina: '🔋',
			exp: '✨',
			money: '💹',
			bank: '🏦',
			potion: '🥤',
			diamond: '💎',
			common: '📦',
			uncommon: '🛍️',
			mythic: '🎁',
			legendary: '🗃️',
			superior: '💼',
			pet: '🔖',
			trash: '🗑',
			armor: '🥼',
			sword: '⚔️',
			pickaxe: '⛏️',
			fishingrod: '🎣',
			wood: '🪵',
			rock: '🪨',
			string: '🕸️',
			horse: '🐴',
			cat: '🐱',
			dog: '🐶',
			fox: '🦊',
			petFood: '🍖',
			iron: '⛓️',
			gold: '🪙',
			emerald: '❇️',
			upgrader: '🧰',
		};
		let results = Object.keys(emot)
			.map((v) => [v, new RegExp(v, 'gi')])
			.filter((v) => v[1].test(string));
		if (!results.length) return '';
		else return emot[results[0][0]];
	},
};

let file = fileURLToPath(import.meta.url);
watchFile(file, () => {
	unwatchFile(file);
	console.log(chalk.redBright("Update 'config.js'"));
	import(`${file}?update=${Date.now()}`);
});

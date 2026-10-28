import { showToast } from 'UI/Components/Toast.js';
import gameSession from './Auth/GameSession.js';
import { registrationError } from './Auth/RegistrationValidation.js';
import { loginFailureMessage, serverDisconnectMessage } from './Auth/LoginFeedback.js';
import recovery, { recoverLogin } from './Recovery/GameRecovery.js';
/**
 * Engine/LoginEngine.js
 *
 * Login Engine
 * Manage login server, connexion
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 *
 * @author Vincent Thibault
 */

// Load dependencies
import TextEncoding from 'Utils/CodepageManager.js';
import DB from 'DB/DBManager.js';
import BGM from 'Audio/BGM.js';
import Sound from 'Audio/SoundManager.js';
import Configs from 'Core/Configs.js';
import Thread from 'Core/Thread.js';
import Session from 'Engine/SessionStorage.js';
import CharEngine from 'Engine/CharEngine.js';
import Network from 'Network/NetworkManager.js';
import PACKETVER from 'Network/PacketVerManager.js';
import PACKET from 'Network/PacketStructure.js';
import PluginManager from 'Plugins/PluginManager.js';
import Renderer from 'Renderer/Renderer.js';
import UIManager from 'UI/UIManager.js';
import WinList from 'UI/Components/WinList/WinList.js';
import WinLoading from 'UI/WinLoading.js';
import Queue from 'Utils/Queue.js';
import Background from 'UI/Background.js';
import MD5 from 'Vendors/spark-md5.min.js';
import Rijndael from 'Utils/Rijndael.js';

// Version Dependent UIs
import WinLogin from 'UI/Components/WinLogin/WinLogin.js';

/**
 * @var {object} server object stored in clientinfo.xml
 */
let _server = null;

/**
 * @var {array} char-servers list
 */
let _charServers = [];

/**
 * @var {string} Stored username to send as ping
 */
let _loginID = '';

let authGeneration = 0;
let sessionTicketLogin = false;
let keepLogin = false;
let suppressAutoLogin = false;
let resumeRetries = 0;

async function resumeSession() {
	const generation = ++authGeneration;
	WinLoading.append();
	try {
		const credentials = await gameSession.resume();
		if (generation !== authGeneration) return;
		if (credentials) {
			onConnectionRequest(credentials.username, '', credentials.persistent, credentials.ticket);
			return;
		}
	} catch { /* Keep ordinary login available if the session service is offline. */ }
	if (generation !== authGeneration) return;
	WinLoading.remove();
	WinLogin.getUI().append();
}

class LoginEngine {
	/**
	 * Init Game
	 */
	static init(server) {
		++authGeneration;
		resumeRetries = 0;
		recovery.cancel();
		const q = new Queue();
		const old_server = _server;

		Configs.setServer(server);
		UIManager.removeComponents();
		Session.LangType = 'langtype' in server ? parseInt(server.langtype, 10) : 1; // default to SERVICETYPE_AMERICA

		// Renewal switch
		Session.isRenewal = Configs.get('renewal', false);
		console.log('%c[LOGIN] Game Mode: ', 'color:#007000', Session.isRenewal ? 'RENEWAL' : 'PRE-RENEWAL');

		// Setup Default Charset based on LangType
		const charset = TextEncoding.detectEncodingByLangtype(Session.LangType, Configs.get('disableKorean'));

		console.log('%c[LOGIN] Language Type: ', 'color:#007000', Session.LangType);
		console.log('%c[LOGIN] Encoding: ', 'color:#007000', charset);

		_server = server;

		// Add support for "packetver" definition in Server listing
		const packetver = String(Configs.get('packetver'));
		const remoteClient = Configs.get('remoteClient');
		const autoLogin = Configs.get('autoLogin');
		const audioExt = Configs.get('BGMFileExtension');

		// Server packetver
		if (packetver) {
			if (packetver.match(/^\d+$/)) {
				PACKETVER.value = parseInt(packetver, 10);
			}
		}

		if (!PACKETVER.value) {
			UIManager.showErrorBox('未找到 PACKETVER 配置。');
			return;
		}

		// Add support for remote client in server definition
		if (remoteClient) {
			Thread.send('SET_HOST', remoteClient);

			// Check if the selected server changed.
			if (old_server != null && (old_server.address != _server.address || old_server.port != _server.port)) {
				// Re-Loading game data with server specific files (txt, lua, lub)
				q.add(() => {
					DB.onReady = () => {
						Background.setLoginBackground(); // remove loading
						q._next();
					};
					DB.onProgress = (i, count) => {
						Background.setPercent(Math.floor((i / count) * 100));
					};
					UIManager.removeComponents();
					Background.init();
					Background.resize(Renderer.width, Renderer.height);
					Background.setLoginBackground(() => {
						DB.isLoaded = false;
						DB.init();
					});
				});
			}
		}

		// Server audio configuration
		if (audioExt) {
			BGM.setAvailableExtensions(audioExt);
		}

		// GMs account list from server
		Session.AdminList = server.adminList || [];

		// Init per server plugins
		PluginManager.init();

		// Hooking win_login
		WinLogin.selectUIVersion();
		Background.setLoginBackground();

		WinLogin.getUI().onConnectionRequest = onConnectionRequest;
		WinLogin.getUI().onExitRequest = onExitRequest;

		// Handle unexpected disconnects during login phase
		Network.onDisconnect = () => {
			WinLoading.remove();
			UIManager.showMessageBox(
				DB.getMessage(1),
				'ok',
				() => {
					UIManager.removeComponents();
					WinLogin.getUI().append();
				},
				true
			);
		};

		// Autologin features
		if (autoLogin instanceof Array && autoLogin[0] && autoLogin[1]) {
			onConnectionRequest.apply(null, autoLogin);
			Configs.set('autoLogin', null);
		} else {
			q.add(function () {
				if (suppressAutoLogin) {
					suppressAutoLogin = false;
					WinLogin.getUI().append();
				} else resumeSession();
			});
		}

		// Hook packets
		if (PACKETVER.value < 20170315) {
			Network.hookPacket(PACKET.AC.ACCEPT_LOGIN, onConnectionAccepted);
		} else {
			Network.hookPacket(PACKET.AC.ACCEPT_LOGIN3, onConnectionAccepted);
		}

		// Refuse login packets
		Network.hookPacket(PACKET.AC.REFUSE_LOGIN, onConnectionRefused);
		Network.hookPacket(PACKET.AC.REFUSE_LOGIN_R2, onConnectionRefused);
		Network.hookPacket(PACKET.AC.REFUSE_LOGIN3, onConnectionRefused);
		Network.hookPacket(PACKET.AC.REFUSE_LOGIN_EX, onConnectionRefused);

		// international refuse packets
		Network.hookPacket(PACKET.AC.REFUSE_LOGIN_USA, onInternationalConnectionRefused);

		// Taren refuse packets
		Network.hookPacket(PACKET.AC.LOGIN_TAREN_REFUSE, onTarenConnectionRefused);
		Network.hookPacket(PACKET.AC.LOGIN_TAREN_REFUSE2, onTarenConnectionRefused2);

		// forced disconnect
		Network.hookPacket(PACKET.SC.NOTIFY_BAN, onServerClosed);

		// Execute
		q.run();
	}

	/**
	 * Reload WinLogin
	 */
	static async logout() {
		++authGeneration;
		suppressAutoLogin = true;
		try { await gameSession.revoke(); }
		catch { UIManager.showErrorBox('退出登录未完成，请恢复网络后重试。'); return false; }
		return true;
	}

	static reload(preserveRecovery = false) {
		++authGeneration;
		if (!preserveRecovery) recovery.cancel();
		resumeRetries = 0;
		UIManager.removeComponents();
		WinLogin.getUI().onConnectionRequest = onConnectionRequest;
		WinLogin.getUI().onExitRequest = onExitRequest;
		Network.close();
		if (preserveRecovery && gameSession.available) resumeSession();
		else WinLogin.getUI().append();
	}

	/**
	 * setLoadedServer()
	 *
	 * Called by GameEngine when it reloads files due to a service change
	 * so we don't wind up trying to load the db twice. (Or concurrently.)
	 */
	static setLoadedServer(server) {
		_server = server;
	}
}

/**
 * Trying to connect to Login server
 *
 * @param {string} username
 * @param {string} password
 */
function onConnectionRequest(username, password, persistent = false, ticket = null) {
	if (!ticket) {
		const error = registrationError(username, password);
		if (error) {
			UIManager.showMessageBox(error, 'ok', null, true);
			return;
		}
	}
	++authGeneration;
	sessionTicketLogin = !!ticket;
	keepLogin = persistent;
	// Play "¹öÆ°¼Ò¸®.wav" (possible problem with charset)
	Sound.play('\xB9\xF6\xC6\xB0\xBC\xD2\xB8\xAE.wav');

	// Add the loading screen
	// Store the ID to use for the ping
	WinLogin.getUI().remove();
	WinLoading.append();
	_loginID = username;

	// Try to connect
	Network.connect(_server.address, _server.port, success => {
		// Fail to connect...
		if (!success) {
			WinLoading.remove();
			UIManager.showMessageBox(
				DB.getMessage(1),
				'ok',
				() => {
					UIManager.removeComponents();
					WinLogin.getUI().append();
				},
				true
			);
			return;
		}

		let pkt;
		let hash = false;

		// Get client hash
		if (Configs.get('calculateHash') && !Configs.get('development')) {
			// Calucalte hash from files (slower, more "secure")
			const files = Configs.get('hashFiles');
			let fileStatus = 0;
			const fileContents = [];

			for (let i = 0; i < files.length; i++) {
				const jsonFile = new XMLHttpRequest();
				jsonFile.open('GET', files[i], true);
				jsonFile.send();

				jsonFile.onreadystatechange = function () {
					if (jsonFile.readyState == 4 && jsonFile.status == 200) {
						fileContents[i] = jsonFile.responseText;
						fileStatus++;
					}

					if (fileStatus == files.length) {
						const contentString = fileContents.join('\r\n'); // Join strings with carrige return & newline
						hash = MD5.hash(contentString); // Just hash the whole array
						sendLogin();
					}
				};
			}
		} else {
			// Just use the predefined value (faster, less "secure")
			hash = Configs.get('clientHash');
			sendLogin();
		}

		function sendLogin() {
			if (hash) {
				// Convert hexadecimal hash to binary
				if (/^[a-f0-9]+$/i.test(hash)) {
					let str = '';
					let i;
					const count = hash.length;

					for (i = 0; i < count; i += 2) {
						str += String.fromCharCode(parseInt(hash.substr(i, 2), 16));
					}

					hash = str;
				}

				pkt = new PACKET.CA.EXE_HASHCHECK();
				pkt.HashValue = hash;
				Network.sendPacket(pkt);
			}

			if (ticket) {
				pkt = new PACKET.CA.SESSION_LOGIN();
				pkt.ID = username;
				pkt.Ticket = ticket;
				pkt.clienttype = parseInt(_server.langtype, 10);
				Network.sendPacket(pkt);
			} else if (Configs.get('loginMode') == 'han') {
				// password is encrypted with rijndael
				const paddedPassword = new Uint8Array(24);
				for (let i = 0; i < password.length; i++) {
					paddedPassword[i] = password.charCodeAt(i);
				}
				const encryptedPassword = Rijndael.encrypt(
					paddedPassword,
					Configs.get('rijndaelKey'),
					Configs.get('rijndaelChain'),
					24,
					'ecb'
				);

				if (!encryptedPassword) {
					UIManager.showErrorBox('Rijndael 加密失败，请检查 rijndaelKey 和 rijndaelChain 配置。');
					return;
				}

				pkt = new PACKET.CA.LOGIN_HAN();
				pkt.ID = username;
				pkt.Passwd = String.fromCharCode(...encryptedPassword);
				pkt.Version = parseInt(_server.version, 10);
				pkt.clienttype = parseInt(_server.langtype, 10);
				pkt.m_szIP = '192.168.0.1'; // dummy
				pkt.m_szMacAddr = '00:1A:2B:3C:4D:5E'; // dummy
				pkt.isHanGameUser = 0;
				Network.sendPacket(pkt);
			} else {
				// Try to connect
				pkt = new PACKET.CA.LOGIN();
				pkt.ID = username;
				pkt.Passwd = password;
				pkt.Version = parseInt(_server.version, 10);
				pkt.clienttype = parseInt(_server.langtype, 10);
				Network.sendPacket(pkt);
			}
		}
	});
}

/**
 * Go back to intro window
 */
async function onExitRequest() {
	if (!(await LoginEngine.logout())) return;
	recovery.cancel();
	import('Engine/GameEngine.js').then(GameEngine => {
		GameEngine.default.reload();
	});
}

/**
 * User selected a char-server
 *
 * @param {number} index in server list
 */
function onCharServerSelected(index) {
	// Play "¹öÆ°¼Ò¸®.wav" (encode to avoid problem with charset)
	Sound.play('\xB9\xF6\xC6\xB0\xBC\xD2\xB8\xAE.wav');

	WinList.remove();
	WinLoading.append();

	Session.ServerName = _charServers[index].name; // Save server name
	Network.onDisconnect = null; // Let CharEngine handle its own disconnects
	CharEngine.init(_charServers[index]);
}

/**
 * Accepted connection from char-server
 *
 * @param {object} pkt - PACKET.AC.ACCEPT_LOGIN
 */
async function onConnectionAccepted(pkt) {
	const generation = authGeneration;
	const connectionId = Network.connectionId;
	if (!sessionTicketLogin && pkt.webAuthToken) {
		try { if (!(await gameSession.create(pkt.AID, pkt.webAuthToken, keepLogin))) throw new Error('Session creation refused'); }
		catch { showToast(document.body, '登录成功，但未能保存登录状态。此次断线后需重新登录。', 'error'); }
	}
	if (generation !== authGeneration || connectionId !== Network.connectionId) return;
	sessionTicketLogin = false;
	if (Session.AID && Session.AID !== pkt.AID) UIManager.getComponent('ChatBox')?.clean();
	UIManager.removeComponents();

	Session.AuthCode = pkt.AuthCode;
	Session.AID = pkt.AID;
	Session.UserLevel = pkt.userLevel;
	Session.Sex = pkt.Sex;

	if (PACKETVER.value >= 20170315) {
		Session.WebToken = pkt.webAuthToken;
	}

	_charServers = pkt.ServerList;
	const recoveryServer = recoverLogin(pkt.AID, _charServers);

	// Build list of servers
	let i;
	const count = _charServers.length;
	const list = new Array(count);
	for (i = 0; i < count; ++i) {
		list[i] = _charServers[i].property ? DB.getMessage(482) + ' ' : '';
		list[i] += _charServers[i].name;
		list[i] += _charServers[i].state
			? DB.getMessage(484)
			: ' ' + DB.getMessage(483).replace('%d', _charServers[i].usercount);
	}

	// No choice, connect directly to the server
	if (recoveryServer || (count === 1 && Configs.get('skipServerList'))) {
		WinLoading.append();
		const selectedServer = recoveryServer || _charServers[0];
		Session.ServerName = selectedServer.name; // Save server name
		Network.onDisconnect = null; // Let CharEngine handle its own disconnects
		CharEngine.init(selectedServer);
	}

	// Have to select server in the list
	else {
		// Show window
		WinList.onIndexSelected = onCharServerSelected;
		WinList.onExitRequest = async () => {
			if (!(await LoginEngine.logout())) return;
			Network.close();
			WinList.remove();
			WinLogin.getUI().append();
		};
		WinList.append();
		WinList.setList(list);
	}

	// Set ping
	const ping = new PACKET.CA.CONNECT_INFO_CHANGED();
	ping.ID = _loginID;
	Network.setPing(() => {
		Network.sendPacket(ping);
	});

	if (PACKETVER.value >= 20170315 && Session.WebToken) {
		import('UI/Components/ShortCut/ShortCut.js').then(ShortCut => {
			ShortCut.default.loadFromServer();
		});
	}
}

/**
 * Received data from server, connection refused (Taren)
 *
 * @param {object} pkt - PACKET.AC.LOGIN_TAREN_REFUSE
 */
function onTarenConnectionRefused(pkt) {
	WinLoading.remove();
	let msg_id;

	switch (pkt.ErrorCode) {
		case 1:
			msg_id = 3196;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_ACCOUNT_NOTEXIST = This account does not exist
		case 2:
			msg_id = 3197;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_PASSWORD = Passwords does not match
		case 3:
			msg_id = 3198;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_IP = Failed to pass IP authentication
		case 4:
			msg_id = 3199;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_PERSONALNUMBER = No identification number, supplement your registration information
		case 5:
			msg_id = 3200;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_ACCOUNT_BLOCK = Account block
		case 6:
			msg_id = 3201;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_SYSTEM = System error
		case 7:
			msg_id = 3214;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_NOTACTIVATED = Account is not active
		case 9:
			msg_id = 3911;
			break; // MSI_BAN_TEENAGER = Youth access is restricted
		default:
			msg_id = 3202;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_UNKNOWN = unknown error found
	}

	UIManager.showMessageBox(
		DB.getMessage(msg_id),
		'ok',
		() => {
			UIManager.removeComponents();
			WinLogin.getUI().append();
		},
		true
	);

	Network.close();
}

/**
 * Received data from server, connection refused (Taren)
 *
 * @param {object} pkt - PACKET.AC.LOGIN_TAREN_REFUSE2
 */
function onTarenConnectionRefused2(pkt) {
	WinLoading.remove();
	let msg_id;

	switch (pkt.ErrorCode) {
		case 1:
			msg_id = 3196;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_ACCOUNT_NOTEXIST = This account does not exist.
		case 2:
			msg_id = 3197;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_PASSWORD = Passwords does not match.
		case 3:
			msg_id = 3198;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_IP = Failed to pass IP authentication
		case 4:
			msg_id = 3199;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_PERSONALNUMBER = No identification number, supplement your registration information
		case 5:
			msg_id = 3200;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_ACCOUNT_BLOCK = Account block
		case 6:
			msg_id = 3201;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_SYSTEM = System error
		case 7:
			msg_id = 3214;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_NOTACTIVATED = Account is not active
		case 8:
		case 100:
		case 102:
			msg_id = 3202;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_UNKNOWN = unknown error found.
		case 9:
			msg_id = 3911;
			break; // MSI_BAN_TEENAGER = Youth access is restricted.
		case 101:
			msg_id = 449;
			break; // MSI_LOGIN_REFUSE_BLOCKED_UNTIL = You are prohibited to log in until %s.
		default:
			msg_id = 3202;
			break; // MSI_TAREN_LOGINREFUSE_FAIL_UNKNOWN = unknown error found.
	}

	UIManager.showMessageBox(
		DB.getMessage(msg_id).replace('%s', pkt.blockDate),
		'ok',
		() => {
			UIManager.removeComponents();
			WinLogin.getUI().append();
		},
		true
	);
}

/**
 * Received data from server, connection refused (International)
 *
 * @param {object} pkt - PACKET.AC.REFUSE_LOGIN_USA
 */
function onInternationalConnectionRefused(pkt) {
	WinLoading.remove();
	let msg_id;
	switch (pkt.ErrorCode) {
		default:
		case 5200:
			msg_id = 3314;
			break; // MSI_USA_LOGINERRORMSG_UNKNOWN = UNKNOWN ERROR:%d
		case 5201:
			msg_id = 3315;
			break; // MSI_USA_LOGINERRORMSG_NOT_USER = NOT USER
		case 5202:
			msg_id = 3316;
			break; // MSI_USA_LOGINERRORMSG_ID_BLOCK = THIS ACCOUNT ID IS BLOCKED
		case 5203:
			msg_id = 3317;
			break; // MSI_USA_LOGINERRORMSG_ID_INACTIVAT = COUNTRY REJECT (OR NOT AVALIABLE USER )
		case 5204:
			msg_id = 3318;
			break; // MSI_USA_LOGINERRORMSG_PASSWORD = NOT MATCH PASSWORD
		case 5205:
			msg_id = 3319;
			break; // MSI_USA_LOGINERRORMSG_EMAIL_CERT = NOT EMAIL CERT
		case 5206:
			msg_id = 3320;
			break; // MSI_USA_LOGINERRORMSG_PAYPAL_BLOCK1 = PAYPAL BLOCK
		case 5207:
			msg_id = 3321;
			break; // MSI_USA_LOGINERRORMSG_COUNTRY_REJECT = COUNTRY REJECT
		case 5208:
			msg_id = 3322;
			break; // MSI_USA_LOGINERRORMSG_PAYPAL_BLOCK2 = PAYPAL BLOCK
		case 5209:
			msg_id = 3323;
			break; // MSI_USA_LOGINERRORMSG_WEB_BLOCK = WEB BLOCK
		case 5210:
			msg_id = 3324;
			break; // MSI_USA_LOGINERRORMSG_AGE = AGE LIMIT USER
		case 5211:
			msg_id = 3325;
			break; // MSI_USA_LOGINERRORMSG_PASSWORD_CHANGE = PASSWORD HAS NOT BEEN CHANGED FOR MORE THAN 90DAYS
		case 5212:
			msg_id = 3326;
			break; // MSI_USA_LOGINERRORMSG_INPUTDATA = INPUT DATA ERROR
		case 5213:
			msg_id = 3327;
			break; // MSI_USA_LOGINERRORMSG_DATABASE = ERROR DATABASE
		case 5214:
			msg_id = 3328;
			break; // MSI_USA_LOGINERRORMSG_SYSTEM = ERROR SYSTEM
	}

	UIManager.showMessageBox(
		DB.getMessage(msg_id).replace('%d', pkt.blockDate),
		'ok',
		() => {
			UIManager.removeComponents();
			WinLogin.getUI().append();
		},
		true
	);

	Network.close();
}

/**
 * Received data from server, connection refused
 *
 * @param {object} pkt - PACKET.AC.REFUSE_LOGIN
 */
function retryPendingSession(code) {
	if (!sessionTicketLogin || code !== 8 || resumeRetries >= 3) return false;
	resumeRetries++;
	Network.close();
	const generation = authGeneration;
	setTimeout(() => { if (generation === authGeneration) resumeSession(); }, 1500);
	return true;
}

function onConnectionRefused(pkt) {
	if (retryPendingSession(pkt.ErrorCode)) return;
	sessionTicketLogin = false;
	WinLoading.remove();

	UIManager.showMessageBox(
		loginFailureMessage(pkt.ErrorCode, pkt.blockDate),
		'ok',
		() => {
			UIManager.removeComponents();
			WinLogin.getUI().append();
		},
		true
	);

	Network.close();
}

/**
 * Received closed connection from server
 *
 * @param {object} pkt - PACKET.SC.NOTIFY_BAN
 */
function onServerClosed(pkt) {
	if (retryPendingSession(pkt.ErrorCode)) return;
	if (!sessionTicketLogin) LoginEngine.logout();
	sessionTicketLogin = false;
	recovery.cancel();
	WinLoading.remove();

	UIManager.showMessageBox(
		serverDisconnectMessage(pkt.ErrorCode),
		'ok',
		() => {
			UIManager.removeComponents();
			WinLogin.getUI().append();
		},
		true
	);
	Network.close();
}

/**
 * Export
 */
export default LoginEngine;

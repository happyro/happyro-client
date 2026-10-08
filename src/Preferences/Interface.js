import Preferences from 'Core/Preferences.js';

export const defaultInterfaceSettings = {
	toastDuration: 2,
	chatPreviewCompactLines: 3,
	chatPreviewSpaciousLines: 5,
	chatPreviewTabs: true
};
export const chatLineOptions = [2, 3, 4, 5, 6, 7, 8];
const settings = Preferences.get('Interface', { ...defaultInterfaceSettings }, 1.0);
for (const key of ['chatPreviewCompactLines', 'chatPreviewSpaciousLines']) {
	if (!chatLineOptions.includes(settings[key])) settings[key] = defaultInterfaceSettings[key];
}
export default settings;

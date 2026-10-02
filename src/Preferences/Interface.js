import Preferences from 'Core/Preferences.js';

export const defaultInterfaceSettings = { toastDuration: 2 };
export default Preferences.get('Interface', { ...defaultInterfaceSettings }, 1.0);

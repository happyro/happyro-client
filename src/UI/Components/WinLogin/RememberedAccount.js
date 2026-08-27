export function normalizeRememberedAccount(account) {
	return account.replace(/_[fm]$/i, '');
}

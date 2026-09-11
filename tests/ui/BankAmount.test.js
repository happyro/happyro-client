import { describe, expect, it } from 'vitest';
import { addValueToInput } from '../../src/UI/Components/Bank/BankAmount.js';

describe('Bank addValueToInput', () => {
	it('keeps MAX as MAX', () => {
		expect(addValueToInput('MAX', 10000000)).toBe('MAX');
	});

	it('adds to a numeric amount', () => {
		expect(addValueToInput('100', 100000)).toBe(100100);
	});

	it('treats empty input as zero', () => {
		expect(addValueToInput('', 1000000)).toBe(1000000);
	});

	it('never returns undefined', () => {
		expect(addValueToInput('MAX', 1)).not.toBeUndefined();
		expect(addValueToInput('0', 1)).not.toBeUndefined();
		expect(addValueToInput(undefined, 1)).not.toBeUndefined();
	});
});

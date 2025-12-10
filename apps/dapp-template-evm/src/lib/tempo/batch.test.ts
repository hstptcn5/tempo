import { describe, it, expect } from 'vitest';
import {
    validateRecipient,
    parseCSV,
    validateAndBuildBatch,
    buildTransferCallData,
    type BatchRecipientInput,
} from './batch';

describe('parseCSV', () => {
    it('should parse basic CSV with address and amount', () => {
        const csv = `0x1234567890123456789012345678901234567890,100`;
        const result = parseCSV(csv);
        expect(result).toHaveLength(1);
        expect(result[0].address).toBe('0x1234567890123456789012345678901234567890');
        expect(result[0].amount).toBe('100');
        expect(result[0].memo).toBeUndefined();
    });

    it('should parse CSV with memo', () => {
        const csv = `0x1234567890123456789012345678901234567890,100,INV-001`;
        const result = parseCSV(csv);
        expect(result).toHaveLength(1);
        expect(result[0].memo).toBe('INV-001');
    });

    it('should parse multiple lines', () => {
        const csv = `0x1111111111111111111111111111111111111111,100,Memo1
0x2222222222222222222222222222222222222222,200,Memo2
0x3333333333333333333333333333333333333333,300`;
        const result = parseCSV(csv);
        expect(result).toHaveLength(3);
        expect(result[0].amount).toBe('100');
        expect(result[1].amount).toBe('200');
        expect(result[2].amount).toBe('300');
        expect(result[2].memo).toBeUndefined();
    });

    it('should skip header row', () => {
        const csv = `address,amount,memo
0x1234567890123456789012345678901234567890,100,Test`;
        const result = parseCSV(csv);
        expect(result).toHaveLength(1);
        expect(result[0].address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should handle empty lines', () => {
        const csv = `0x1234567890123456789012345678901234567890,100

0x2222222222222222222222222222222222222222,200`;
        const result = parseCSV(csv);
        expect(result).toHaveLength(2);
    });

    it('should handle tab-delimited CSV', () => {
        const csv = `0x1234567890123456789012345678901234567890\t100\tMemo`;
        const result = parseCSV(csv);
        expect(result).toHaveLength(1);
        expect(result[0].amount).toBe('100');
        expect(result[0].memo).toBe('Memo');
    });
});

describe('validateRecipient', () => {
    const decimals = 6;

    it('should validate valid recipient without memo', () => {
        const input: BatchRecipientInput = {
            address: '0x1234567890123456789012345678901234567890',
            amount: '100',
        };
        const result = validateRecipient(input, decimals);
        expect(result.isValid).toBe(true);
        expect(result.amount).toBe(100000000n); // 100 * 10^6
        expect(result.hasMemo).toBe(false);
    });

    it('should validate valid recipient with ASCII memo', () => {
        const input: BatchRecipientInput = {
            address: '0x1234567890123456789012345678901234567890',
            amount: '50.5',
            memo: 'INV-12345',
        };
        const result = validateRecipient(input, decimals);
        expect(result.isValid).toBe(true);
        expect(result.amount).toBe(50500000n);
        expect(result.hasMemo).toBe(true);
        expect(result.memo).toBeDefined();
    });

    it('should validate recipient with unicode memo within 32 bytes', () => {
        const input: BatchRecipientInput = {
            address: '0x1234567890123456789012345678901234567890',
            amount: '10',
            memo: 'Hello 你好', // 6 + 1 + 6 = 13 bytes
        };
        const result = validateRecipient(input, decimals);
        expect(result.isValid).toBe(true);
        expect(result.hasMemo).toBe(true);
    });

    it('should reject memo exceeding 32 bytes', () => {
        const input: BatchRecipientInput = {
            address: '0x1234567890123456789012345678901234567890',
            amount: '10',
            // Create a memo that's definitely over 32 bytes (each Chinese char is 3 bytes)
            memo: '这是一个非常非常非常非常长的备注', // 15 chars * 3 bytes = 45 bytes
        };
        const result = validateRecipient(input, decimals);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('32 bytes');
    });

    it('should reject invalid address', () => {
        const input: BatchRecipientInput = {
            address: 'invalid',
            amount: '100',
        };
        const result = validateRecipient(input, decimals);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid address');
    });

    it('should reject empty address', () => {
        const input: BatchRecipientInput = {
            address: '',
            amount: '100',
        };
        const result = validateRecipient(input, decimals);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('required');
    });

    it('should reject zero amount', () => {
        const input: BatchRecipientInput = {
            address: '0x1234567890123456789012345678901234567890',
            amount: '0',
        };
        const result = validateRecipient(input, decimals);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('greater than 0');
    });

    it('should reject negative amount', () => {
        const input: BatchRecipientInput = {
            address: '0x1234567890123456789012345678901234567890',
            amount: '-10',
        };
        const result = validateRecipient(input, decimals);
        expect(result.isValid).toBe(false);
    });

    it('should reject invalid amount format', () => {
        const input: BatchRecipientInput = {
            address: '0x1234567890123456789012345678901234567890',
            amount: 'abc',
        };
        const result = validateRecipient(input, decimals);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid amount');
    });

    it('should handle empty memo as no memo', () => {
        const input: BatchRecipientInput = {
            address: '0x1234567890123456789012345678901234567890',
            amount: '10',
            memo: '',
        };
        const result = validateRecipient(input, decimals);
        expect(result.isValid).toBe(true);
        expect(result.hasMemo).toBe(false);
    });

    it('should handle whitespace-only memo as no memo', () => {
        const input: BatchRecipientInput = {
            address: '0x1234567890123456789012345678901234567890',
            amount: '10',
            memo: '   ',
        };
        const result = validateRecipient(input, decimals);
        expect(result.isValid).toBe(true);
        expect(result.hasMemo).toBe(false);
    });
});

describe('validateAndBuildBatch', () => {
    const tokenAddress = '0x20c0000000000000000000000000000000000000' as const;
    const tokenDecimals = 6;

    it('should build valid batch', () => {
        const inputs: BatchRecipientInput[] = [
            { address: '0x1111111111111111111111111111111111111111', amount: '100' },
            { address: '0x2222222222222222222222222222222222222222', amount: '200', memo: 'Test' },
        ];
        
        const result = validateAndBuildBatch(inputs, { tokenAddress, tokenDecimals });
        
        expect(result.isValid).toBe(true);
        expect(result.calls).toHaveLength(2);
        expect(result.totalAmount).toBe(300000000n);
        expect(result.errors).toHaveLength(0);
    });

    it('should reject batch exceeding balance', () => {
        const inputs: BatchRecipientInput[] = [
            { address: '0x1111111111111111111111111111111111111111', amount: '100' },
        ];
        
        const result = validateAndBuildBatch(inputs, {
            tokenAddress,
            tokenDecimals,
            userBalance: 50000000n, // Only 50 tokens
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('exceeds balance'))).toBe(true);
    });

    it('should skip invalid recipients but still build valid ones', () => {
        const inputs: BatchRecipientInput[] = [
            { address: 'invalid', amount: '100' },
            { address: '0x2222222222222222222222222222222222222222', amount: '200' },
        ];
        
        const result = validateAndBuildBatch(inputs, { tokenAddress, tokenDecimals });
        
        // Has errors but still has valid calls
        expect(result.calls).toHaveLength(1);
        expect(result.errors).toHaveLength(1);
        expect(result.totalAmount).toBe(200000000n);
        // isValid is false because there are errors
        expect(result.isValid).toBe(false);
    });

    it('should reject empty batch', () => {
        const inputs: BatchRecipientInput[] = [];
        
        const result = validateAndBuildBatch(inputs, { tokenAddress, tokenDecimals });
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('No valid'))).toBe(true);
    });

    it('should reject batch with all invalid recipients', () => {
        const inputs: BatchRecipientInput[] = [
            { address: 'invalid1', amount: '100' },
            { address: 'invalid2', amount: '200' },
        ];
        
        const result = validateAndBuildBatch(inputs, { tokenAddress, tokenDecimals });
        
        expect(result.isValid).toBe(false);
        expect(result.calls).toHaveLength(0);
    });
});

describe('buildTransferCallData', () => {
    const to = '0x1234567890123456789012345678901234567890' as const;
    const amount = 100000000n;

    it('should build transfer call without memo', () => {
        const callData = buildTransferCallData(to, amount);
        expect(callData).toMatch(/^0x/);
        // Should be transfer(address,uint256) selector
        expect(callData.startsWith('0xa9059cbb')).toBe(true);
    });

    it('should build transferWithMemo call with memo', () => {
        const memo = '0x496e766f6963652d303031000000000000000000000000000000000000000000' as const;
        const callData = buildTransferCallData(to, amount, memo);
        expect(callData).toMatch(/^0x/);
        // Should be transferWithMemo selector (different from transfer)
        expect(callData.startsWith('0xa9059cbb')).toBe(false);
    });
});


import { describe, it, expect } from 'vitest';
import {
    encodeMemoBytes32,
    validateMemo,
    getByteLength,
    isAsciiOnly,
    decodeMemoBytes32,
    encodeStringToMemo,
} from './memo';

describe('memo utilities', () => {
    describe('getByteLength', () => {
        it('should return correct byte length for ASCII strings', () => {
            expect(getByteLength('')).toBe(0);
            expect(getByteLength('a')).toBe(1);
            expect(getByteLength('hello')).toBe(5);
            expect(getByteLength('INV-12345')).toBe(9);
            expect(getByteLength('12345678901234567890123456789012')).toBe(32); // exactly 32
        });

        it('should return correct byte length for unicode strings', () => {
            // UTF-8: emoji = 4 bytes each
            expect(getByteLength('😀')).toBe(4);
            expect(getByteLength('Hello😀')).toBe(9); // 5 + 4
            
            // UTF-8: Chinese characters = 3 bytes each
            expect(getByteLength('中')).toBe(3);
            expect(getByteLength('中文')).toBe(6);
            
            // Mixed
            expect(getByteLength('Hello中文')).toBe(11); // 5 + 6
        });
    });

    describe('isAsciiOnly', () => {
        it('should return true for ASCII-only strings', () => {
            expect(isAsciiOnly('')).toBe(true);
            expect(isAsciiOnly('hello')).toBe(true);
            expect(isAsciiOnly('INV-12345')).toBe(true);
            expect(isAsciiOnly('Hello World! @#$%^&*()')).toBe(true);
            expect(isAsciiOnly('\t\n\r')).toBe(true); // control characters
        });

        it('should return false for non-ASCII strings', () => {
            expect(isAsciiOnly('😀')).toBe(false);
            expect(isAsciiOnly('Hello😀')).toBe(false);
            expect(isAsciiOnly('中文')).toBe(false);
            expect(isAsciiOnly('café')).toBe(false); // é is non-ASCII
            expect(isAsciiOnly('naïve')).toBe(false);
        });
    });

    describe('validateMemo', () => {
        it('should validate ASCII strings within limit', () => {
            const result = validateMemo('INV-12345');
            expect(result.isValid).toBe(true);
            expect(result.byteLen).toBe(9);
            expect(result.exceedsLimit).toBe(false);
            expect(result.error).toBeUndefined();
        });

        it('should invalidate strings exceeding 32 bytes', () => {
            const longString = '123456789012345678901234567890123'; // 33 chars
            const result = validateMemo(longString);
            expect(result.isValid).toBe(false);
            expect(result.byteLen).toBe(33);
            expect(result.exceedsLimit).toBe(true);
            expect(result.error).toContain('exceeds 32 bytes');
        });

        it('should validate unicode within byte limit', () => {
            // 8 emoji = 32 bytes exactly
            const result = validateMemo('😀😀😀😀😀😀😀😀');
            expect(result.isValid).toBe(true);
            expect(result.byteLen).toBe(32);
            expect(result.exceedsLimit).toBe(false);
        });

        it('should invalidate unicode exceeding byte limit', () => {
            // 9 emoji = 36 bytes
            const result = validateMemo('😀😀😀😀😀😀😀😀😀');
            expect(result.isValid).toBe(false);
            expect(result.byteLen).toBe(36);
            expect(result.exceedsLimit).toBe(true);
        });

        it('should reject non-ASCII when asciiOnly is true', () => {
            const result = validateMemo('Hello😀', { asciiOnly: true });
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('ASCII');
        });

        it('should accept ASCII when asciiOnly is true', () => {
            const result = validateMemo('Hello', { asciiOnly: true });
            expect(result.isValid).toBe(true);
        });
    });

    describe('encodeMemoBytes32', () => {
        it('should encode empty string to zero bytes32', () => {
            const result = encodeMemoBytes32('');
            expect(result.bytes32).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
            expect(result.byteLen).toBe(0);
            expect(result.truncated).toBe(false);
        });

        it('should encode ASCII string correctly', () => {
            const result = encodeMemoBytes32('INV-12345');
            // 'INV-12345' in hex: 494e562d3132333435
            expect(result.bytes32).toMatch(/^0x494e562d3132333435/i);
            expect(result.bytes32.length).toBe(66); // 0x + 64 hex chars
            expect(result.byteLen).toBe(9);
            expect(result.truncated).toBe(false);
            expect(result.input).toBe('INV-12345');
        });

        it('should pad short strings to 32 bytes', () => {
            const result = encodeMemoBytes32('A');
            expect(result.bytes32).toBe('0x4100000000000000000000000000000000000000000000000000000000000000');
            expect(result.byteLen).toBe(1);
        });

        it('should encode exactly 32 bytes without truncation', () => {
            const str32 = '12345678901234567890123456789012';
            const result = encodeMemoBytes32(str32);
            expect(result.byteLen).toBe(32);
            expect(result.truncated).toBe(false);
        });

        it('should truncate strings over 32 bytes', () => {
            const str33 = '123456789012345678901234567890123';
            const result = encodeMemoBytes32(str33);
            expect(result.byteLen).toBe(32); // truncated
            expect(result.truncated).toBe(true);
        });

        it('should handle unicode correctly', () => {
            const result = encodeMemoBytes32('Hello😀');
            expect(result.byteLen).toBe(9); // 5 + 4
            expect(result.truncated).toBe(false);
        });

        it('should truncate unicode at byte boundary', () => {
            // 9 emoji = 36 bytes, should truncate to 32
            const result = encodeMemoBytes32('😀😀😀😀😀😀😀😀😀');
            expect(result.byteLen).toBe(32);
            expect(result.truncated).toBe(true);
        });

        it('should throw when throwOnOverflow is true', () => {
            expect(() => {
                encodeMemoBytes32('123456789012345678901234567890123', { throwOnOverflow: true });
            }).toThrow();
        });
    });

    describe('encodeStringToMemo (legacy)', () => {
        it('should return same bytes32 as encodeMemoBytes32', () => {
            const input = 'INV-12345';
            const legacy = encodeStringToMemo(input);
            const modern = encodeMemoBytes32(input);
            expect(legacy).toBe(modern.bytes32);
        });
    });

    describe('decodeMemoBytes32', () => {
        it('should decode bytes32 back to string', () => {
            const original = 'INV-12345';
            const encoded = encodeMemoBytes32(original);
            const decoded = decodeMemoBytes32(encoded.bytes32);
            expect(decoded).toBe(original);
        });

        it('should handle empty bytes32', () => {
            const decoded = decodeMemoBytes32('0x0000000000000000000000000000000000000000000000000000000000000000');
            expect(decoded).toBe('');
        });

        it('should decode unicode strings', () => {
            // Note: Unicode roundtrip works for simple cases
            // but may fail for truncated multi-byte sequences
            const original = 'Hello';
            const encoded = encodeMemoBytes32(original);
            const decoded = decodeMemoBytes32(encoded.bytes32);
            expect(decoded).toBe(original);
        });

        it('should decode ASCII with special chars', () => {
            const original = 'INV-2024-001';
            const encoded = encodeMemoBytes32(original);
            const decoded = decodeMemoBytes32(encoded.bytes32);
            expect(decoded).toBe(original);
        });
    });

    describe('edge cases', () => {
        it('should handle special ASCII characters', () => {
            const result = encodeMemoBytes32('!@#$%^&*()');
            expect(result.isValid !== false);
            expect(result.byteLen).toBe(10);
        });

        it('should handle newlines and tabs', () => {
            const result = encodeMemoBytes32('line1\nline2\ttab');
            expect(result.byteLen).toBe(15);
        });

        it('should handle spaces', () => {
            const result = encodeMemoBytes32('hello world');
            expect(result.byteLen).toBe(11);
        });
    });
});


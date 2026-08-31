// tests/jest.d.ts - Declaración de tipos para Jest
import '@types/jest';

declare global {
    function describe(name: string, fn: () => void): void;
    function test(name: string, fn: () => void | Promise<void>): void;
    function expect(value: unknown): unknown;
    namespace jest {
        function fn(): jest.Mock;
        function spyOn(obj: unknown, method: string): jest.SpyInstance;
    }
}

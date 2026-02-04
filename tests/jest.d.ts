// tests/jest.d.ts - Declaración de tipos para Jest
import '@types/jest';

declare global {
    function describe(name: string, fn: () => void): void;
    function test(name: string, fn: () => void | Promise<void>): void;
    function expect(value: any): any;
    namespace jest {
        function fn(): jest.Mock;
        function spyOn(obj: any, method: string): jest.SpyInstance;
    }
}

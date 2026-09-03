import { ART } from '@/lib/system/asciiArt';
test('ver', () => {
    for (const [i, p] of ART.entries()) {
        if (i < 10) continue;
        console.log(`\n### ${i + 1}/${ART.length}  ${p.caption.es}   [${p.source}]\n${p.art}`);
    }
    expect(true).toBe(true);
});

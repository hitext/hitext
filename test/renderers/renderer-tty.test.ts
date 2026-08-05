import { strictEqual } from 'assert';
import { spansFromMatch, tty } from '../../src/index.js';

describe('TTY renderer', () => {
    describe('basic styling', () => {
        it('should apply foreground colors', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 1 }
                ], tty.createStyle('cyan'))
                .render('test');

            strictEqual(result, '\u001b[36mt\u001b[39mest');
        });

        it('should apply background colors', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 1 }
                ], tty.createStyle('bgRed'))
                .render('test');

            strictEqual(result, '\u001b[41mt\u001b[49mest');
        });

        it('should combine foreground and background colors', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 1 }
                ], tty.createStyle('white', 'bgBlue'))
                .render('test');

            strictEqual(result, '\u001b[37m\u001b[44mt\u001b[39m\u001b[49mest');
        });

        it('should handle multiple non-overlapping styled spans', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 1 }
                ], tty.createStyle('cyan'))
                .addLayer([
                    { start: 1, end: 2 }
                ], tty.createStyle('bgBlue', 'white'))
                .addLayer([
                    { start: 3, end: 4 }
                ], tty.createStyle('yellow'))
                .render('1234');

            strictEqual(
                result,
                '\u001b[36m1\u001b[37m\u001b[44m2\u001b[39m\u001b[49m3\u001b[33m4\u001b[39m'
            );
        });
    });

    describe('nested styles', () => {
        it('should handle nested spans with style inheritance', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 5 }
                ], tty.createStyle('bgBlue'))
                .addLayer([
                    { start: 1, end: 4 }
                ], tty.createStyle('white'))
                .render('Hello');

            // Background should continue through nested span
            strictEqual(result, '\u001b[44mH\u001b[37mell\u001b[39mo\u001b[49m');
        });

        it('should properly restore styles after nested spans', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 6 }
                ], tty.createStyle('cyan'))
                .addLayer([
                    { start: 2, end: 4 }
                ], tty.createStyle('yellow'))
                .render('abcdef');

            strictEqual(result, '\u001b[36mab\u001b[33mcd\u001b[36mef\u001b[39m');
        });

        it('should handle deeply nested styles', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 5 }
                ], tty.createStyle('red'))
                .addLayer([
                    { start: 1, end: 4 }
                ], tty.createStyle('bgYellow'))
                .addLayer([
                    { start: 2, end: 3 }
                ], tty.createStyle('white'))
                .render('12345');

            strictEqual(result, '\u001b[31m1\u001b[43m2\u001b[37m3\u001b[31m4\u001b[49m5\u001b[39m');
        });
    });

    describe('createStyleMap', () => {
        it('should map data values to styles', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 1, data: 'value' },
                    { start: 3, end: 4, data: 'other' }
                ], tty.createStyleMap({
                    'value': 'cyan',
                    'other': 'yellow'
                }))
                .render('1234');

            strictEqual(result, '\u001b[36m1\u001b[39m23\u001b[33m4\u001b[39m');
        });

        it('should support array of styles in styleMap', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 5, data: 'error' },
                    { start: 8, end: 15, data: 'warning' }
                ], tty.createStyleMap({
                    'error': ['red', 'bgWhite'],
                    'warning': ['yellow', 'bgBlack']
                }))
                .render('error & warning');

            strictEqual(result, '\u001b[31m\u001b[47merror\u001b[39m\u001b[49m & \u001b[33m\u001b[40mwarning\u001b[39m\u001b[49m');
        });

        it('should support custom data fetcher', () => {
            const result = tty()
                .addLayer<{ priority: string }>([
                    { start: 0, end: 1, data: { priority: 'high' } },
                    { start: 1, end: 2, data: { priority: 'low' } }
                ], tty.createStyleMap(
                    {
                        'high': 'red',
                        'low': 'green'
                    },
                    ({ data }) => data.priority
                ))
                .render('12');

            strictEqual(result, '\u001b[31m1\u001b[32m2\u001b[39m');
        });

        it('should work with spansFromMatch', () => {
            const result = tty()
                .addLayer(spansFromMatch(/error|warning/g), tty.createStyleMap({
                    'error': ['red', 'bgWhite'],
                    'warning': ['yellow', 'bgBlack']
                }))
                .render('error & warning');

            strictEqual(result, '\u001b[31m\u001b[47merror\u001b[39m\u001b[49m & \u001b[33m\u001b[40mwarning\u001b[39m\u001b[49m');
        });

        it('should support array-based styleMap for numeric indices', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 1, data: 0 },
                    { start: 1, end: 2, data: 1 },
                    { start: 2, end: 3, data: 2 }
                ], tty.createStyleMap([
                    'red',
                    'green',
                    'blue'
                ]))
                .render('abc');

            strictEqual(result, '\u001b[31ma\u001b[32mb\u001b[34mc\u001b[39m');
        });
    });

    describe('reset behavior', () => {
        it('should reset to default colors', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 2 }
                ], tty.createStyle('red'))
                .addLayer([
                    { start: 1, end: 2 }
                ], tty.createStyle('reset'))
                .render('abc');

            // Reset should restore to default
            strictEqual(result, '\u001b[31ma\u001b[39mbc');
        });

        it('should handle empty spans without styling', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 0 }
                ], tty.createStyle('red'))
                .render('test');

            // Empty span at position 0
            strictEqual(result, 'test');
        });
    });

    describe('overlapping styles', () => {
        it('should handle overlapping color spans', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 3 }
                ], tty.createStyle('red'))
                .addLayer([
                    { start: 2, end: 5 }
                ], tty.createStyle('blue'))
                .render('Hello');

            strictEqual(result, '\u001b[31mHel\u001b[34mlo\u001b[39m');
        });

        it('should handle overlapping foreground and background', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 3 }
                ], tty.createStyle('red'))
                .addLayer([
                    { start: 1, end: 4 }
                ], tty.createStyle('bgYellow'))
                .render('Hello');

            // Red fg at 0-3, yellow bg at 1-4, overlap at 1-3
            strictEqual(result, '\u001b[31mH\u001b[43mel\u001b[39ml\u001b[49mo');
        });
    });

    describe('edge cases', () => {
        it('should handle empty string', () => {
            const result = tty()
                .addLayer([[0, 0]], tty.createStyle('red'))
                .render('');

            strictEqual(result, '');
        });

        it('should handle text without any styles', () => {
            const result = tty().render('plain text');
            strictEqual(result, 'plain text');
        });

        it('should handle spans outside document boundaries', () => {
            const result = tty()
                .addLayer([
                    { start: -5, end: 2 },
                    { start: 3, end: 100 }
                ], tty.createStyle('red'))
                .render('abc');

            // Should clip to actual document boundaries
            strictEqual(result, '\u001b[31mab\u001b[39mc');
        });

        it('should handle styleMap with missing keys gracefully', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 1, data: 'known' },
                    { start: 1, end: 2, data: 'unknown' }
                ], tty.createStyleMap({
                    'known': 'red'
                    // 'unknown' is not in the map
                }))
                .render('ab');

            // Should handle missing key (no style applied)
            strictEqual(result, '\u001b[31ma\u001b[39mb');
        });
    });

    describe('complex scenarios', () => {
        it('should combine multiple layers with different styling approaches', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 5, data: 'keyword' }
                ], tty.createStyleMap({
                    'keyword': 'cyan'
                }))
                .addLayer([
                    { start: 6, end: 11 }
                ], tty.createStyle('bgRed', 'white'))
                .render('Hello world');

            strictEqual(result, '\u001b[36mHello\u001b[39m \u001b[37m\u001b[41mworld\u001b[39m\u001b[49m');
        });

        it('should handle syntax highlighting scenario', () => {
            const code = 'const x = 42;';
            const result = tty()
                .addLayer([
                    { start: 0, end: 5, data: 'keyword' },
                    { start: 10, end: 12, data: 'number' }
                ], tty.createStyleMap({
                    'keyword': 'magenta',
                    'number': 'green',
                    'string': 'yellow'
                }))
                .render(code);

            strictEqual(result, '\u001b[35mconst\u001b[39m x = \u001b[32m42\u001b[39m;');
        });

        it('should handle line highlighting with text styling', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 11 }
                ], tty.createStyle('bgBlack'))
                .addLayer([
                    { start: 0, end: 5 }
                ], tty.createStyle('cyan'))
                .render('Hello world');

            strictEqual(result, '\u001b[36m\u001b[40mHello\u001b[39m world\u001b[49m');
        });
    });

    describe('manual style control', () => {
        it('should allow custom hooks using pushStyle/popStyle', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 5 }
                ], {
                    createSpanHooks: ({ pushStyle, popStyle }) => ({
                        open() {
                            pushStyle({ color: '\u001b[31m' }); // Red
                            return '';
                        },
                        close() {
                            popStyle();
                            return '';
                        }
                    })
                })
                .render('Hello world');

            strictEqual(result, '\u001b[31mHello\u001b[39m world');
        });

        it('should handle multiple push/pop operations in nested spans', () => {
            const result = tty()
                .addLayer([
                    { start: 0, end: 7 }
                ], {
                    createSpanHooks: ({ pushStyle, popStyle }) => ({
                        open() {
                            pushStyle({ color: '\u001b[34m' }); // Blue
                            return '';
                        },
                        close() {
                            popStyle();
                            return '';
                        }
                    })
                })
                .addLayer([
                    { start: 2, end: 5 }
                ], {
                    createSpanHooks: ({ pushStyle, popStyle }) => ({
                        open() {
                            pushStyle({ bgColor: '\u001b[43m' }); // Yellow bg
                            return '';
                        },
                        close() {
                            popStyle();
                            return '';
                        }
                    })
                })
                .render('Hello world');

            strictEqual(result, '\u001b[34mHe\u001b[43mllo\u001b[49m w\u001b[39morld');
        });
    });
});

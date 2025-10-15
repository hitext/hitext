import { strictEqual } from 'assert';
import { tty as ttyRenderer } from '../src/index.js';

describe('TTY renderer', () => {
    describe('basic styling', () => {
        it('should apply foreground colors', () => {
            const tty = ttyRenderer();
            const result = tty
                .addLayer([
                    { start: 0, end: 1 }
                ], ttyRenderer.createStyle('cyan'))
                .render('test');

            strictEqual(result, '\u001b[36mt\u001b[39mest');
        });

        it('should apply background colors', () => {
            const tty = ttyRenderer();
            const result = tty
                .addLayer([
                    { start: 0, end: 1 }
                ], ttyRenderer.createStyle('bgRed'))
                .render('test');

            strictEqual(result, '\u001b[41mt\u001b[49mest');
        });

        it('should combine foreground and background colors', () => {
            const tty = ttyRenderer();
            const result = tty
                .addLayer([
                    { start: 0, end: 1 }
                ], ttyRenderer.createStyle('white', 'bgBlue'))
                .render('test');

            strictEqual(result, '\u001b[37m\u001b[44mt\u001b[39m\u001b[49mest');
        });

        it('should handle multiple non-overlapping styled ranges', () => {
            const tty = ttyRenderer();
            const result = tty
                .addLayer([
                    { start: 0, end: 1 }
                ], ttyRenderer.createStyle('cyan'))
                .addLayer([
                    { start: 1, end: 2 }
                ], ttyRenderer.createStyle('bgBlue', 'white'))
                .addLayer([
                    { start: 3, end: 4 }
                ], ttyRenderer.createStyle('yellow'))
                .render('1234');

            strictEqual(
                result,
                '\u001b[36m1\u001b[37m\u001b[44m2\u001b[39m\u001b[49m3\u001b[33m4\u001b[39m'
            );
        });
    });

    describe('nested styles', () => {
        it('should handle nested ranges with style inheritance', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 5 }
                ], ttyRenderer.createStyle('bgBlue'))
                .addLayer([
                    { start: 1, end: 4 }
                ], ttyRenderer.createStyle('white'))
                .render('Hello');

            // Background should continue through nested range
            strictEqual(result, '\u001b[44mH\u001b[37mell\u001b[39mo\u001b[49m');
        });

        it('should properly restore styles after nested ranges', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 6 }
                ], ttyRenderer.createStyle('cyan'))
                .addLayer([
                    { start: 2, end: 4 }
                ], ttyRenderer.createStyle('yellow'))
                .render('abcdef');

            strictEqual(result, '\u001b[36mab\u001b[33mcd\u001b[36mef\u001b[39m');
        });

        it('should handle deeply nested styles', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 5 }
                ], ttyRenderer.createStyle('red'))
                .addLayer([
                    { start: 1, end: 4 }
                ], ttyRenderer.createStyle('bgYellow'))
                .addLayer([
                    { start: 2, end: 3 }
                ], ttyRenderer.createStyle('white'))
                .render('12345');

            strictEqual(result, '\u001b[31m1\u001b[43m2\u001b[37m3\u001b[31m4\u001b[49m5\u001b[39m');
        });
    });

    describe('createStyleMap', () => {
        it('should map data values to styles', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 1, data: 'value' },
                    { start: 3, end: 4, data: 'other' }
                ], ttyRenderer.createStyleMap({
                    'value': 'cyan',
                    'other': 'yellow'
                }))
                .render('1234');

            strictEqual(result, '\u001b[36m1\u001b[39m23\u001b[33m4\u001b[39m');
        });

        it('should support array of styles in styleMap', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 1, data: 'error' },
                    { start: 1, end: 2, data: 'warning' }
                ], ttyRenderer.createStyleMap({
                    'error': ['red', 'bgWhite'],
                    'warning': ['yellow', 'bgBlack']
                }))
                .render('12');

            strictEqual(result, '\u001b[31m\u001b[47m1\u001b[33m\u001b[40m2\u001b[39m\u001b[49m');
        });

        it('should support custom data fetcher', () => {
            const result = ttyRenderer()
                .addLayer<{ priority: string }>([
                    { start: 0, end: 1, data: { priority: 'high' } },
                    { start: 1, end: 2, data: { priority: 'low' } }
                ], ttyRenderer.createStyleMap(
                    {
                        'high': 'red',
                        'low': 'green'
                    },
                    ({ data }) => data.priority
                ))
                .render('12');

            strictEqual(result, '\u001b[31m1\u001b[32m2\u001b[39m');
        });

        it('should support array-based styleMap for numeric indices', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 1, data: 0 },
                    { start: 1, end: 2, data: 1 },
                    { start: 2, end: 3, data: 2 }
                ], ttyRenderer.createStyleMap([
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
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 2 }
                ], ttyRenderer.createStyle('red'))
                .addLayer([
                    { start: 1, end: 2 }
                ], ttyRenderer.createStyle('reset'))
                .render('abc');

            // Reset should restore to default
            strictEqual(result, '\u001b[31ma\u001b[39mbc');
        });

        it('should handle empty ranges without styling', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 0 }
                ], ttyRenderer.createStyle('red'))
                .render('test');

            // Empty range at position 0
            strictEqual(result, 'test');
        });
    });

    describe('overlapping styles', () => {
        it('should handle overlapping color ranges', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 3 }
                ], ttyRenderer.createStyle('red'))
                .addLayer([
                    { start: 2, end: 5 }
                ], ttyRenderer.createStyle('blue'))
                .render('Hello');

            strictEqual(result, '\u001b[31mHel\u001b[34mlo\u001b[39m');
        });

        it('should handle overlapping foreground and background', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 3 }
                ], ttyRenderer.createStyle('red'))
                .addLayer([
                    { start: 1, end: 4 }
                ], ttyRenderer.createStyle('bgYellow'))
                .render('Hello');

            // Red fg at 0-3, yellow bg at 1-4, overlap at 1-3
            strictEqual(result, '\u001b[31mH\u001b[43mel\u001b[39ml\u001b[49mo');
        });
    });

    describe('edge cases', () => {
        it('should handle empty string', () => {
            const result = ttyRenderer()
                .addLayer([[0, 0]], ttyRenderer.createStyle('red'))
                .render('');

            strictEqual(result, '');
        });

        it('should handle text without any styles', () => {
            const result = ttyRenderer().render('plain text');
            strictEqual(result, 'plain text');
        });

        it('should handle ranges outside source boundaries', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: -5, end: 2 },
                    { start: 3, end: 100 }
                ], ttyRenderer.createStyle('red'))
                .render('abc');

            // Should clip to actual source boundaries
            strictEqual(result, '\u001b[31mab\u001b[39mc');
        });

        it('should handle styleMap with missing keys gracefully', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 1, data: 'known' },
                    { start: 1, end: 2, data: 'unknown' }
                ], ttyRenderer.createStyleMap({
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
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 5, data: 'keyword' }
                ], ttyRenderer.createStyleMap({
                    'keyword': 'cyan'
                }))
                .addLayer([
                    { start: 6, end: 11 }
                ], ttyRenderer.createStyle('bgRed', 'white'))
                .render('Hello world');

            strictEqual(result, '\u001b[36mHello\u001b[39m \u001b[37m\u001b[41mworld\u001b[39m\u001b[49m');
        });

        it('should handle syntax highlighting scenario', () => {
            const code = 'const x = 42;';
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 5, data: 'keyword' },
                    { start: 10, end: 12, data: 'number' }
                ], ttyRenderer.createStyleMap({
                    'keyword': 'magenta',
                    'number': 'green',
                    'string': 'yellow'
                }))
                .render(code);

            strictEqual(result, '\u001b[35mconst\u001b[39m x = \u001b[32m42\u001b[39m;');
        });

        it('should handle line highlighting with text styling', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 11 }
                ], ttyRenderer.createStyle('bgBlack'))
                .addLayer([
                    { start: 0, end: 5 }
                ], ttyRenderer.createStyle('cyan'))
                .render('Hello world');

            strictEqual(result, '\u001b[36m\u001b[40mHello\u001b[39m world\u001b[49m');
        });
    });

    describe('manual style control', () => {
        it('should allow custom hooks using pushStyle/popStyle', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 5 }
                ], {
                    createRangeHooks: ({ pushStyle, popStyle }) => ({
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

        it('should handle multiple push/pop operations in nested ranges', () => {
            const result = ttyRenderer()
                .addLayer([
                    { start: 0, end: 7 }
                ], {
                    createRangeHooks: ({ pushStyle, popStyle }) => ({
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
                    createRangeHooks: ({ pushStyle, popStyle }) => ({
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

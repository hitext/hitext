/**
 * Interface for working with line boundaries in a source string.
 */
export interface LineBoundaries {
    /**
     * Get the line number (1-based) for a given offset in the source.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the 1-based line number containing the offset.
     */
    getLine(offset: number, lines?: number): number;

    /**
     * Get the column number (1-based) for a given offset in the source.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the 1-based column position within the line.
     */
    getColumn(offset: number, lines?: number): number;

    /**
     * Get the offset for a given line and column (both 1-based).
     * Returns the offset in the source string.
     * If line is out of bounds, clamps to valid range.
     * If column is out of bounds for the line, clamps to line length.
     */
    getOffset(line: number, column?: number): number;

    /**
     * Get the line start offset for a given offset in the source.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the offset where the target line starts.
     */
    getLineStartForOffset(offset: number, lines?: number): number;

    /**
     * Get the line end offset for a given offset in the source.
     * If excludeNewline is true, returns offset before the newline character(s).
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the offset where the target line ends.
     */
    getLineEndForOffset(offset: number, excludeNewline?: boolean, lines?: number): number;
}

/**
 * Factory function for creating a line boundaries utility.
 * Builds line boundary information incrementally as needed for efficient offset lookups.
 * Optimized for sequential access patterns (adjacent ranges).
 */
export function createLineBoundaries(source: string): LineBoundaries {
    const newlineRegex = /\r\n|\r|\n/g; // Global regex for scanning
    const lineStarts: number[] = [0]; // Line starts cache (always includes 0)
    let lastLineStart = 0;
    let lastLineIndex = 0; // Cache for last looked up line index
    let fullyScanned = false; // Whether we've scanned the entire source

    /**
     * Ensure we have scanned enough lines.
     * If lineCount is provided, ensures we have at least that many lines cached.
     * If targetOffset is provided, scans until we've covered that offset.
     */
    function ensureLines(lineCount: number, targetOffset?: number): void {
        // Scan until we have enough lines or covered the offset or reach end of source
        while (!fullyScanned) {
            if (lineCount <= lineStarts.length &&
                (targetOffset === undefined || lastLineStart > targetOffset)) {
                break;
            }

            newlineRegex.lastIndex = lastLineStart;
            const match = newlineRegex.exec(source);

            if (match) {
                lastLineStart = newlineRegex.lastIndex;
                lineStarts.push(lastLineStart);
            } else {
                fullyScanned = true;
            }
        }
    }

    /**
     * Binary search for line index in the given range.
     */
    function binarySearchLineIndex(left: number, right: number, offset: number): number {
        while (left < right) {
            const mid = Math.floor((left + right + 1) / 2);
            if (lineStarts[mid] <= offset) {
                left = mid;
            } else {
                right = mid - 1;
            }
        }
        return left;
    }

    /**
     * Get the line index for a given offset in the source.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the index of the line containing the offset.
     */
    function getLineIndex(offset: number, lines = 0): number {
        if (offset < 0) {
            return 0;
        }
        if (offset >= source.length) {
            offset = source.length - 1;
        }

        let lineIndex: number;

        // Fast track: check if offset is within or before the cached line range
        if (offset >= lineStarts[lastLineIndex]) {
            // Offset is at or after the start of the last cached line
            if (offset < lineStarts[lastLineIndex + 1]) {
                // Offset is on the same line as last lookup - cache hit!
                lineIndex = lastLineIndex;
            } else {
                // Slow track: offset is beyond cached range or on last line
                // Scan until we cover this offset
                ensureLines(lastLineIndex + 2, offset);

                // Binary search in [lastLineIndex...lineStarts.length - 1]
                lineIndex = binarySearchLineIndex(lastLineIndex, lineStarts.length - 1, offset);
            }
        } else {
            // Offset is before last line - binary search in [0...lastLineIndex]
            lineIndex = binarySearchLineIndex(0, lastLineIndex, offset);
        }

        // Store the line index before applying lines offset
        lastLineIndex = lineIndex;

        // Apply lines offset
        if (lines !== 0) {
            const targetLineIndex = lineIndex + lines;

            if (targetLineIndex < 0) {
                lineIndex = 0;
            } else if (lines > 0) {
                ensureLines(targetLineIndex + 1);
                lineIndex = Math.min(targetLineIndex, lineStarts.length - 1);
            } else {
                lineIndex = targetLineIndex;
            }
        }

        return lineIndex;
    }

    /**
     * Get the line number (1-based) for a given offset in the source.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the 1-based line number containing the offset.
     */
    function getLine(offset: number, lines = 0): number {
        return getLineIndex(offset, lines) + 1;
    }

    /**
     * Get the column number (1-based) for a given offset in the source.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the 1-based column position within the line.
     */
    function getColumn(offset: number, lines = 0): number {
        if (offset < 0) {
            return 1;
        }
        if (offset >= source.length) {
            offset = source.length;
        }

        const lineStart = getLineStartForOffset(offset, lines);
        return offset - lineStart + 1;
    }

    /**
     * Get the offset for a given line and column (both 1-based).
     * Returns the offset in the source string.
     * If line is out of bounds, clamps to valid range.
     * If column is out of bounds for the line, clamps to line length.
     */
    function getOffset(line: number, column = 1): number {
        if (line < 1) {
            line = 1;
        }

        const lineIndex = line - 1;

        // Ensure we have scanned the requested line and the next one to know where current line ends
        ensureLines(lineIndex + 2);

        // Clamp to available lines
        const actualLineIndex = Math.min(lineIndex, lineStarts.length - 1);
        const lineStart = lineStarts[actualLineIndex];

        if (column <= 1) {
            return lineStart;
        }

        // Calculate the target offset
        const offset = lineStart + column - 1;

        // If next line exists, clamp to its start (which is current line's end)
        // Otherwise, clamp to source length
        return actualLineIndex + 1 < lineStarts.length
            ? Math.min(offset, lineStarts[actualLineIndex + 1])
            : Math.min(offset, source.length);
    }

    /**
     * Get the line start offset for a given offset in the source.
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the offset where the target line starts.
     */
    function getLineStartForOffset(offset: number, lines = 0): number {
        const lineIndex = getLineIndex(offset, lines);
        return lineStarts[lineIndex];
    }

    /**
     * Get the line end offset for a given offset in the source.
     * If excludeNewline is true, returns offset before the newline character(s).
     * If lines parameter is provided:
     *   - Positive value: move forward N lines
     *   - Negative value: move backward N lines
     * Returns the offset where the target line ends.
     */
    function getLineEndForOffset(offset: number, excludeNewline = false, lines = 0): number {
        const lineIndex = getLineIndex(offset, lines);

        // Ensure we have the next line to get the end
        ensureLines(lineIndex + 2);

        // The line end is the start of the next line, or source.length
        let lineEnd = lineIndex + 1 < lineStarts.length
            ? lineStarts[lineIndex + 1]
            : source.length;

        // Exclude newline characters if requested (\n, \r, or \r\n)
        if (excludeNewline) {
            const lineStart = lineStarts[lineIndex];

            if (lineEnd > lineStart && source[lineEnd - 1] === '\n') {
                lineEnd--;
            }

            if (lineEnd > lineStart && source[lineEnd - 1] === '\r') {
                lineEnd--;
            }
        }

        return lineEnd;
    }

    return {
        getLine,
        getColumn,
        getOffset,
        getLineStartForOffset,
        getLineEndForOffset
    };
}

// Shared instance cache
let sharedSource: string | null = null;
let sharedLineBoundaries: LineBoundaries | null = null;

/**
 * Get a LineBoundaries instance for the given source.
 * Returns the cached instance if one exists for this source, otherwise creates a new instance.
 * Note: This does NOT cache the newly created instance - use setSharedLineBoundaries() for that.
 */
export function getSharedLineBoundaries(source: string): LineBoundaries {
    return sharedSource === source && sharedLineBoundaries !== null
        ? sharedLineBoundaries
        : createLineBoundaries(source);
}

/**
 * Set a LineBoundaries instance as the shared cache.
 * This instance will be returned by getSharedLineBoundaries() for the matching source.
 * Pass a source string to create and cache a new instance.
 * Pass null to clear the cache.
 * Returns the cached instance (or null if cleared).
 */
export function setSharedLineBoundaries(source: string | null): LineBoundaries | null {
    if (typeof source === 'string') {
        sharedSource = source;
        sharedLineBoundaries = createLineBoundaries(source);
    } else {
        sharedSource = null;
        sharedLineBoundaries = null;
    }

    return sharedLineBoundaries;
}

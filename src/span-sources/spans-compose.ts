import { processSpans } from '../spans.js';
import type { GenerateSpans, SpansSource, TransformSpans } from '../types.js';

/**
 * Composes a span source with multiple transformers (left-to-right composition).
 *
 * @param spanInput - The initial span source
 * @param transformers - Transformer functions to apply in sequence
 * @returns The final composed GenerateSpans function
 *
 * @example
 * spansCompose(
 *   spansFromMatch(/error/g),
 *   applyCollapseTo('start'),
 *   applyMerge()
 * )
 */
export function spansCompose<Data, RenderOptions>(
    spanInput: SpansSource<Data, RenderOptions>
): GenerateSpans<Data, RenderOptions>;
export function spansCompose<InputData, Data1, RenderOptions>(
    spanInput: SpansSource<InputData, RenderOptions>,
    transform1: TransformSpans<InputData, RenderOptions, Data1>
): GenerateSpans<Data1, RenderOptions>;
export function spansCompose<InputData, Data1, Data2, RenderOptions>(
    spanInput: SpansSource<InputData, RenderOptions>,
    transform1: TransformSpans<InputData, RenderOptions, Data1>,
    transform2: TransformSpans<Data1, RenderOptions, Data2>
): GenerateSpans<Data2, RenderOptions>;
export function spansCompose<InputData, Data1, Data2, Data3, RenderOptions>(
    spanInput: SpansSource<InputData, RenderOptions>,
    transform1: TransformSpans<InputData, RenderOptions, Data1>,
    transform2: TransformSpans<Data1, RenderOptions, Data2>,
    transform3: TransformSpans<Data2, RenderOptions, Data3>
): GenerateSpans<Data3, RenderOptions>;
export function spansCompose<InputData, Data1, Data2, Data3, Data4, RenderOptions>(
    spanInput: SpansSource<InputData, RenderOptions>,
    transform1: TransformSpans<InputData, RenderOptions, Data1>,
    transform2: TransformSpans<Data1, RenderOptions, Data2>,
    transform3: TransformSpans<Data2, RenderOptions, Data3>,
    transform4: TransformSpans<Data3, RenderOptions, Data4>
): GenerateSpans<Data4, RenderOptions>;
export function spansCompose<InputData, Data1, Data2, Data3, Data4, Data5, RenderOptions>(
    spanInput: SpansSource<InputData, RenderOptions>,
    transform1: TransformSpans<InputData, RenderOptions, Data1>,
    transform2: TransformSpans<Data1, RenderOptions, Data2>,
    transform3: TransformSpans<Data2, RenderOptions, Data3>,
    transform4: TransformSpans<Data3, RenderOptions, Data4>,
    transform5: TransformSpans<Data4, RenderOptions, Data5>
): GenerateSpans<Data5, RenderOptions>;
export function spansCompose<RenderOptions>(
    spanInput: SpansSource<any, RenderOptions>,
    ...transformers: Array<TransformSpans<any, RenderOptions, any>>
): GenerateSpans<any, RenderOptions>;
export function spansCompose(
    spanInput: SpansSource<any, any>,
    ...transformers: Array<TransformSpans<any, any, any>>
): GenerateSpans<any, any> {
    const pipeline = transformers.reduce<SpansSource<any, any>>(
        (input, transformer) => transformer(input),
        spanInput
    );

    return (document, createSpan, context) => {
        processSpans(document, pipeline, createSpan, context);
    };
}

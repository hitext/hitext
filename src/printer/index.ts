import { forkPrinterSet } from './utils.js';
import noop from './noop.js';
import html from './html.js';
import tty from './tty.js';

export default forkPrinterSet({
    noop,
    html,
    tty
});

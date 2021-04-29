import { forkPrinterSet } from './utils';
import noop from './noop';
import html from './html';
import tty from './tty';

export default forkPrinterSet({
    noop,
    html,
    tty
});

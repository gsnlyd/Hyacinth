import * as React from 'react';
import {Link} from 'react-router-dom';

type ButtonSize = 'md' | 'lg' | 'icon';
type ButtonColor = 'gray' | 'darkGray' | 'pink' | 'darkPink' | 'fuchsia' | 'purple' | 'darkPurple' | 'darkRed';

const SIZE_CLASSES: {[key in ButtonSize]: string} = {
    md: 'px-4 py-1.5',
    lg: 'px-4 py-2',
    icon: 'p-1.5',
}

const COLOR_CLASSES: {[key in ButtonColor]: string} = {
    gray: 'bg-gray-400 hover:bg-gray-500 ring-gray-500 hover:ring-gray-600 text-black',
    darkGray: 'bg-gray-600 hover:bg-gray-700 ring-gray-600 hover:ring-gray-700 text-gray-300',
    pink: 'bg-pink-200 hover:bg-pink-300 ring-pink-200 hover:ring-pink-300 text-black',
    darkPink: 'bg-pink-900 ring-pink-900 text-gray-300',
    fuchsia: 'bg-fuchsia-300 hover:bg-fuchsia-400 ring-fuchsia-300 hover:ring-fuchsia-400 text-black',
    purple: 'bg-purple-400 hover:bg-purple-300 ring-purple-400 hover:ring-purple-300 text-black',
    darkPurple: 'bg-purple-500 bg-opacity-40 hover:bg-opacity-30 ring-purple-900 ring-opacity-20 hover:ring-opacity-10 text-gray-300',
    darkRed: 'bg-red-700 hover:bg-red-800 ring-red-700 hover:ring-red-800 text-red-50',
}

const FLEX_CLASSES = 'flex justify-center items-center';
const BUTTON_CLASSES = FLEX_CLASSES + ' font-medium rounded shadow focus:outline-none focus:ring-4 ring-opacity-50 hover:ring-opacity-50 box-border transition';
const DISABLED_CLASSES = FLEX_CLASSES + ' rounded bg-gray-600 text-gray-400 opacity-50 select-none';

interface CommonButtonProps {
    size?: ButtonSize;
    color?: ButtonColor;
    disabled?: boolean;
    children?: any;
}

interface ButtonProps extends CommonButtonProps {onClick?: Function}
interface LinkButtonProps extends CommonButtonProps {to?: string}

function Button({onClick, size = 'md', color = 'gray', disabled = false, children}: ButtonProps) {
    if (disabled) {
        const classes = [DISABLED_CLASSES, SIZE_CLASSES[size]];
        return <button className={classes.join(' ')} disabled={disabled}>{children}</button>
    }

    const classes = [BUTTON_CLASSES, SIZE_CLASSES[size], COLOR_CLASSES[color]];
    return <button onClick={() => onClick && onClick()} className={classes.join(' ')}>{children}</button>
}

function LinkButton({to, size = 'md', color = 'gray', disabled = false, children}: LinkButtonProps) {
    if (disabled) {
        const classes = [DISABLED_CLASSES, SIZE_CLASSES[size]];
        return <div className={classes.join(' ')}>{children}</div>
    }

    const classes = [BUTTON_CLASSES, SIZE_CLASSES[size], COLOR_CLASSES[color]];
    return <Link to={to} className={classes.join(' ')}>{children}</Link>
}

export {Button, LinkButton};

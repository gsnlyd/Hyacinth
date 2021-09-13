import * as React from 'react';
import {SelectorIcon} from '@heroicons/react/solid';

interface InputTextProps {
    id: string;
    label: string | null;
    placeholder: string;
    value: string;
    setValue: Function;
}

function InputText({id, label, placeholder, value, setValue}: InputTextProps) {
    return (
        <div>
            {label && <label className="text-sm text-gray-400" htmlFor={id}>{label}</label>}
            <input
                className="mt-0.5 px-3 py-1 w-full bg-gray-800 rounded text-gray-300 placeholder-gray-500 transition
                border border-gray-800 hover:border-gray-500 focus:border-gray-400
                focus:outline-none"
                id={id}
                type="text"
                placeholder={placeholder}
                value={value}
                onInput={ev => setValue(ev.currentTarget.value)}
            />
        </div>
    )
}

interface InputNumberProps {
    id: string;
    label: string;
    min?: number;
    max?: number;
    value: number;
    setValue: Function;
}

function InputNumber({id, label, value, min, max, setValue}: InputNumberProps) {
    return (
        <div className="flex-1 flex flex-col items-start">
            <label className="text-sm text-gray-400" htmlFor={id}>{label}</label>
            <input
                className="mt-1 px-3 py-1 w-full bg-gray-800 rounded shadow text-xl text-gray-300 transition
                border border-gray-800 hover:border-gray-400 focus:border-gray-400
                focus:outline-none"
                id={id}
                type="number"
                value={value.toString()}
                min={min}
                max={max}
                onInput={ev => setValue(parseInt(ev.currentTarget.value) || 0)}
            />
        </div>
    )
}

interface InputRangeProps {
    min: number;
    max: number;
    step: number;
    value: number;
    setValue: (number) => void;
}

function InputRange({min, max, step, value, setValue}: InputRangeProps) {
    const valPct = value == 0 ? 0 : ((value - min) / (max - min)) * 100;
    return (
        <input
            className="w-full"
            style={{backgroundSize: `${valPct}% 100%`}}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onInput={ev => setValue(ev.currentTarget.value)}
        />
    )
}

interface SelectProps {
    id: string;
    label: string;
    options: string[];
    value: string;
    setValue: Function;
}

function Select({id, label, options, value, setValue}: SelectProps) {
    return (
        <div className="flex flex-col items-start">
            <label className="text-sm text-gray-400" htmlFor={id}>{label}</label>
            <div className="relative w-full">
                <select
                    className="appearance-none mt-1 px-3 py-1 w-full bg-gray-800 rounded text-gray-300 transition
                    border border-gray-800 hover:border-gray-400 focus:border-gray-400
                    focus:outline-none"
                    id={id}
                    value={value}
                    onInput={ev => setValue(ev.currentTarget.value)}
                >
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <div className="absolute mr-1 inset-y-0 right-0 flex items-center">
                    <SelectorIcon className="w-5 h-5 text-gray-500" />
                </div>
            </div>
        </div>
    )
}

export {InputText, InputNumber, InputRange, Select};

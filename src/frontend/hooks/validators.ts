import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import {dbapi, SessionCategory, SessionType} from '../backend';

export interface InputValidator<T> {
    value: T;
    setValue: React.Dispatch<React.SetStateAction<T>>;
    valid: boolean;
    errors: string[];
    showErrors: boolean;
}

type ValidatorFunc<T> = (value: T, errors: string[]) => string[];

function useValidator<T>(validate: ValidatorFunc<T>, initialValue: T, deps: React.DependencyList): InputValidator<T> {
    const [value, setValue] = useState(initialValue);
    const [valid, setValid] = useState(true);
    const [errors, setErrors] = useState([]);
    const [showErrors, setShowErrors] = useState(false);
    const isInitial = useRef(true);

    // TODO: possibly refactor "valid" out altogether and just use errors.length === 0 everywhere
    useEffect(() => {
        // Sets isInitial to false once value is changed for the first time
        if (isInitial.current && value !== initialValue) isInitial.current = false;

        const errors = validate(value, []);
        setErrors(errors);
        setValid(errors.length === 0);
        // Sets showErrors to true only after the value is changed for the first time,
        // This can be used to prevent inputs from rendering errors initially even though valid=false and errors.length > 0
        setShowErrors(errors.length > 0 && !isInitial.current);
    }, [value].concat(deps));

    return {value, setValue, valid, errors, showErrors};
}

// ---------- GENERIC VALIDATORS ----------

export function useStringLengthValidator(initialValue: string, min?: number, max?: number) {
    const validate: ValidatorFunc<string> = (value, errors) => {
        if (min !== undefined && value.length < min) {
            errors.push(
                (min === 0)
                    ? 'Field cannot be empty.'
                    : `Must be at least ${min} character${min === 1 ? '' : 's'}.`
            );
        }
        if (max !== undefined && value.length > max) {
            errors.push(`Cannot be longer than ${max} character${max === 1 ? '' : 's'}.`);
        }

        return errors;
    };

    return useValidator(validate, initialValue, []);
}

export function useNumberBoundsValidator(initialValue: number, min?: number, max?: number) {
    const validate: ValidatorFunc<number> = (value, errors) => {
        if (min !== undefined && value < min) errors.push(`Min value is ${min}.`);
        if (max !== undefined && value > max) errors.push(`Max value is ${max}.`);
        return errors;
    }

    return useValidator(validate, initialValue, []);
}

// ---------- DATASET CREATION VALIDATORS ----------

export function useDatasetNameValidator(initialValue: string): InputValidator<string> {
    const validate: ValidatorFunc<string> = (value, errors) => {
        if (value.length === 0) errors.push('Field cannot be empty.');
        if (!dbapi.isDatasetNameAvailable(value)) errors.push('Dataset name is already taken.');
        return errors;
    };

    return useValidator(validate, initialValue, []);
}

// ---------- SESSION CREATION VALIDATORS ----------

export function useSessionNameValidator(initialValue: string, datasetId: number | string): InputValidator<string> {
    const validate: ValidatorFunc<string> = (value, errors) => {
        if (value.length === 0) errors.push('Field cannot be empty.');
        if (!dbapi.isLabelingSessionNameAvailable(datasetId, value)) errors.push('Session name is already taken.');
        return errors;
    };

    return useValidator(validate, initialValue, [datasetId]);
}

export function useSessionLabelOptionsValidator(initialValue: string, category: SessionCategory) {
    const validate: ValidatorFunc<string> = (value, errors) => {
        if (category === 'Classification' && value.length === 0) errors.push('Classification sessions must have at least one label.');
        return errors;
    };

    return useValidator(validate, initialValue, [category]);
}

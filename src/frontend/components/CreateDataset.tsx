import * as React from 'react';
import {useEffect, useMemo, useState} from 'react';
import {Routes, Route, useNavigate} from 'react-router-dom';
import {dbapi, fileapi, volumeapi} from '../backend';
import {Button} from './Buttons';
import {StepContainer} from './StepContainer';
import {StepHeader} from './StepHeader';
import {StepNavigation} from './StepNavigation';
import {FolderOpenIcon} from '@heroicons/react/solid';
import {InputNumber, InputText, Select} from './Inputs';
import {InformationCircleIcon} from '@heroicons/react/outline';
import {InputValidator, useDatasetNameValidator} from '../hooks/validators';

function ChooseDirectoryButton({onClick}: {onClick: Function}) {
    return (
        <Button onClick={onClick} color="purple">
            <FolderOpenIcon className="w-6 h-6" />
            <span className="ml-2 text-lg font-medium">Choose Directory</span>
        </Button>
    )
}

function DirectoryStatus({datasetRoot, chooseDatasetRoot}: {datasetRoot: string, chooseDatasetRoot: Function}) {
    return (
        <div className="flex items-center">
            <div
                className="flex-1 pl-4 pr-6 py-1.5 text-gray-400 bg-black bg-opacity-30 border border-gray-700 rounded-l"
                title={datasetRoot}
            >{datasetRoot}</div>
            <button
                className="px-3 py-1.5 rounded-r text-black transition
                bg-purple-400 hover:bg-purple-300
                border-purple-400 hover:border-purple-300
                focus:ring-4 ring-purple-400 hover:ring-purple-300 ring-opacity-50 hover:ring-opacity-50
                focus:outline-none"
                onClick={() => chooseDatasetRoot()}
            >Edit</button>
        </div>
    )
}

function ChooseDirectoryStep({datasetRoot, chooseDatasetRoot}: {datasetRoot: string, chooseDatasetRoot: Function}) {
    return (
        <div className="mt-32 flex flex-col items-center">
            {!datasetRoot
                ? <ChooseDirectoryButton onClick={chooseDatasetRoot} />
                : <DirectoryStatus datasetRoot={datasetRoot} chooseDatasetRoot={chooseDatasetRoot} />
            }
            <div className="mt-4 w-3/4 text-sm text-gray-400 text-center">
                <span>The chosen directory will be scanned for Nifti and DICOM image files to be added to this dataset.</span>
                <span> Any collaborators will have to use the same directory structure.</span>
            </div>
        </div>
    )
}

type Orientation = 'Sagittal' | 'Coronal' | 'Axial';
const ORIENTATIONS = ['Sagittal', 'Coronal', 'Axial'];

interface FilePreviewStepProps {
    datasetRoot: string;
    filePathsMatched: [string, boolean][];
    filterRegex: string;
    setFilterRegex: React.Dispatch<React.SetStateAction<string>>;
    dicomAsSeries: boolean;
    setDicomAsSeries: React.Dispatch<React.SetStateAction<boolean>>;
    imageDims: [number, number, number][] | null;
    dimFilterEnabled: boolean;
    setDimFilterEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    dimFilterOrientation: Orientation;
    setDimFilterOrientation: React.Dispatch<React.SetStateAction<Orientation>>;
    dimFilterMax: number;
    setDimFilterMax: React.Dispatch<React.SetStateAction<number>>;
}

function FilePreviewStep({datasetRoot, filePathsMatched, filterRegex, setFilterRegex, dicomAsSeries, setDicomAsSeries,
                             imageDims, dimFilterEnabled, setDimFilterEnabled, dimFilterOrientation, setDimFilterOrientation,
                             dimFilterMax, setDimFilterMax}: FilePreviewStepProps) {
    return (
        <div className="mt-4 min-h-0 flex flex-col">
            <div className="flex space-x-3">
                <div className="flex-1">
                    <InputText id="file-path-regex-text" label={null} placeholder="Filter regex" value={filterRegex} setValue={setFilterRegex} />
                </div>
                <div className="px-3 py-1 bg-black bg-opacity-30 rounded border border-gray-700 flex items-center">
                    <label className="text-xs text-gray-400 flex items-center space-x-2">
                        <span>Treat DICOM series as volumes</span>
                        <input type="checkbox" checked={dicomAsSeries} onChange={() => setDicomAsSeries(!dicomAsSeries)} />
                    </label>
                </div>
            </div>
            <div className="mt-2 flex space-x-3">
                <div className="px-3 py-1 bg-black bg-opacity-30 rounded border border-gray-700 flex items-center">
                    <label className="text-xs text-gray-400 flex items-center space-x-2">
                        <span>Dim Filter</span>
                        <input type="checkbox" checked={dimFilterEnabled} onChange={() => setDimFilterEnabled(!dimFilterEnabled)} />
                    </label>
                </div>
                <div className="w-32">
                    <Select
                        id="dim-filter-orient"
                        label={null}
                        options={ORIENTATIONS}
                        value={dimFilterOrientation}
                        setValue={setDimFilterOrientation}
                    />
                </div>
                <InputNumber id="dim-filter-max" label={null} value={dimFilterMax} setValue={setDimFilterMax} />
            </div>
            <div className="ml-1 mt-3 text-sm text-gray-400">
                {(filterRegex.length === 0)
                    ? <div>Found {filePathsMatched.filter(t => t[1]).length} images under {datasetRoot}</div>
                    : <div>Filtered {filePathsMatched.filter(t => t[1]).length} / {filePathsMatched.length} images under {datasetRoot}</div>}
            </div>
            <div className="flex-1 mt-1 px-4 py-3 bg-black bg-opacity-30 rounded text-xs leading-relaxed font-mono break-words overflow-y-scroll">
                {filePathsMatched.map(([p, m], i) =>
                    <div className="flex justify-between">
                        <span key={p} className={m ? 'text-gray-200' : 'text-gray-500'}>{p}</span>
                        {(imageDims && imageDims[i]) &&
                            <span className={(dimFilterEnabled) ? 'text-gray-400' : 'text-gray-500'}>
                                [{imageDims[i][0]}, {imageDims[i][1]}, {imageDims[i][2]}]
                            </span>
                        }
                    </div>
                )}
            </div>
        </div>
    )
}

interface ChooseNameStepProps {
    datasetName: InputValidator<string>;
    datasetRoot: string;
    numFiles: number;
}

function ChooseNameStep({datasetName, datasetRoot, numFiles}: ChooseNameStepProps) {
    return (
        <div className="mt-16">
            <div className="mx-auto w-3/4">
                <div>
                    <InputText id="dataset-name" label="Dataset Name" placeholder="My Dataset" validator={datasetName} />
                </div>
                <div className="mt-2 text-xs text-gray-400">Choose a name for this dataset. Dataset names must be unique.</div>
                <div className="mt-12 px-3 py-2 text-xs text-gray-400 rounded border border-gray-500 flex items-center">
                    <InformationCircleIcon className="w-6 h-6 text-gray-400 opacity-80" />
                    <div className="ml-3">
                        <div>{datasetName.value ? `"${datasetName.value}"` : 'Dataset'} will be created with {numFiles} image files from</div>
                        <div>{datasetRoot}</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function CreateDataset() {
    const [datasetRoot, setDatasetRoot] = useState<string | null>(null);

    const [filterRegex, setFilterRegex] = useState<string>('');
    const [dicomAsSeries, setDicomAsSeries] = useState<boolean>(false);

    const [imageDims, setImageDims] = useState<[number, number, number][] | null>(null);
    const [dimFilterEnabled, setDimFilterEnabled] = useState<boolean>(false);
    const [dimFilterOrientation, setDimFilterOrientation] = useState<Orientation>('Sagittal');
    const [dimFilterMax, setDimFilterMax] = useState<number>(0);

    const datasetName = useDatasetNameValidator('');
    const [filePaths, setFilePaths] = useState<string[]>([]);

    const navigate = useNavigate();

    const filePathsMatched: [string, boolean][] = useMemo(() => {
        let pathsFiltered;
        if (filterRegex.length > 0) {
            const filterRegexCompiled = new RegExp(filterRegex);
            pathsFiltered = filePaths.map(p => [p, filterRegexCompiled.test(p)])
        }
        else {
            pathsFiltered = filePaths.map(p => [p, true]);
        }

        if (dimFilterEnabled && imageDims !== null) {
            pathsFiltered = pathsFiltered.map(([p, filtered], i) => {
                let pass = true;
                const dims = imageDims[i];
                if (dims) {
                    pass = dims[ORIENTATIONS.indexOf(dimFilterOrientation)] <= dimFilterMax;
                }
                return [p, filtered && pass];
            });
        }

        return pathsFiltered;
    }, [filePaths, filterRegex, imageDims, dimFilterEnabled, dimFilterOrientation, dimFilterMax]);

    useEffect(() => {
        if (datasetRoot) setFilePaths(fileapi.getDatasetImages(datasetRoot, dicomAsSeries));
    }, [datasetRoot, dicomAsSeries]);

    useEffect(() => {
        if (dimFilterEnabled && imageDims === null) {
            loadImageDims();
        }
    }, [dimFilterEnabled]);

    function chooseDatasetRoot() {
        const chosenPaths = fileapi.showFolderDialog();
        if (chosenPaths) setDatasetRoot(chosenPaths[0]);
    }

    function loadImageDims() {
        const startDate = Date.now();
        setImageDims(filePaths.map(p => {
            const fullPath = datasetRoot + '/' + p;
            if (fullPath.endsWith('.nii.gz')) {
                return volumeapi.readNiftiHeader(fullPath).dims.slice(1, 4);
            }
            else {
                return null;
            }
        }));
        console.log(`Finished loading image counts in ${Date.now() - startDate}ms`);
    }

    function createDataset() {
        const filePathsFiltered = filePathsMatched.filter(([p, m]) => m).map(([p, m]) => p);
        dbapi.insertDataset(datasetName.value, datasetRoot, filePathsFiltered);
        navigate('/');
    }

    return (
        <StepContainer>
            <Routes>
                <Route path="/choose-directory" element={
                    <>
                        <div>
                            <StepHeader title="Create Dataset" stepDescription="Choose Directory" curStep={0} stepCount={3}/>
                            <ChooseDirectoryStep datasetRoot={datasetRoot} chooseDatasetRoot={chooseDatasetRoot}/>
                        </div>
                        <StepNavigation cancelTo="/" backTo={null} nextTo={datasetRoot && '/create-dataset/file-preview'} />
                    </>
                } />
                <Route path="/file-preview" element={
                    <>
                        <div className="min-h-0 flex flex-col">
                            <StepHeader title="Create Dataset" stepDescription="Review Files" curStep={1} stepCount={3}/>
                            <FilePreviewStep datasetRoot={datasetRoot} filePathsMatched={filePathsMatched} filterRegex={filterRegex} setFilterRegex={setFilterRegex}
                                             dicomAsSeries={dicomAsSeries} setDicomAsSeries={setDicomAsSeries}
                                             imageDims={imageDims} dimFilterEnabled={dimFilterEnabled} setDimFilterEnabled={setDimFilterEnabled}
                                             dimFilterOrientation={dimFilterOrientation} setDimFilterOrientation={setDimFilterOrientation}
                                             dimFilterMax={dimFilterMax} setDimFilterMax={setDimFilterMax} />
                        </div>
                        <StepNavigation cancelTo="/" backTo="/create-dataset/choose-directory" nextTo={filePaths.length > 0 && "/create-dataset/choose-name"} />
                    </>
                } />
                <Route path="/choose-name" element={
                    <>
                        <div>
                            <StepHeader title="Create Dataset" stepDescription="Choose Name" curStep={2} stepCount={3}/>
                            <ChooseNameStep datasetName={datasetName} datasetRoot={datasetRoot} numFiles={filePathsMatched.filter(([p, m]) => m).length}/>
                        </div>
                        <StepNavigation cancelTo="/" backTo="/create-dataset/file-preview" nextTo={null} finishText="Create" finishClicked={createDataset} finishDisabled={!datasetName.valid} />
                    </>
                } />
            </Routes>
        </StepContainer>
    )
}

export {CreateDataset};

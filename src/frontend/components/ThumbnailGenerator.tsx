import * as React from 'react';
import {Link, useParams} from 'react-router-dom';
import {useEffect, useMemo, useRef, useState} from 'react';
import {dbapi, fileapi} from '../backend';
import {Button} from './Buttons';
import {ArrowLeftIcon} from '@heroicons/react/solid';
import {getThumbnailName, zip} from '../utils';
import * as Render from '../render';

export function ThumbnailGenerator() {
    const {sessionId}  = useParams();
    const canvasRef = useRef(null);

    const session = useMemo(() => dbapi.selectLabelingSession(sessionId), [sessionId]);
    const slices = useMemo(() => {
        const _slices = dbapi.selectSessionSlices(sessionId)
        // Optimization: sort slices by imageId to take advantage of image caching in our renderer
        _slices.sort((a, b) => a.imageId - b.imageId);
        // Filter out slices that already have thumbnails
        const _slicesExist = zip(_slices, fileapi.thumbnailsExist(_slices.map(s => getThumbnailName(s))));
        return _slicesExist.filter(([_, exists]) => !exists).map(([s, _]) => s);
    }, [sessionId]);

    const [paused, setPaused] = useState<boolean>(false);
    const [curIndex, setCurIndex] = useState<number>(0);

    useEffect(() => {
        generateCurrentThumbnail();

        if (!paused && curIndex < (slices.length - 1)) {
            // Timeout is needed to allow for enough interactivity to pause even though
            // image rendering is blocking the thread most of the time
            const timeoutID = setTimeout(() => setCurIndex(curIndex + 1), 100);
            // Timeout must be canceled if the component is unloaded or React will warn about setting state
            // on an unloaded component
            return () => clearTimeout(timeoutID);
        }
    }, [paused, curIndex]);

    function generateCurrentThumbnail() {
        if (paused || curIndex >= slices.length) return;
        const slice = slices[curIndex];

        const imagePath = slice.datasetRootPath + '/' + slice.imageRelPath;
        const thumbnailName = getThumbnailName(slice);

        Render.loadAndRender(canvasRef.current, imagePath, slice.sliceDim, slice.sliceIndex, 99);
        fileapi.writeThumbnail(canvasRef.current, thumbnailName);
    }

    return (
        <div className="mt-24 flex flex-col justify-center items-center">
            <div className="w-96 flex justify-between items-center">
                <Link className="text-gray-400 hover:text-gray-300 space-x-1.5 transition flex items-center"
                      to={`/dataset/${session.datasetId}/session/${session.id}`}>
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>Back to {session.sessionName}</span>
                </Link>
                <div className="flex items-center space-x-4">
                    <div className="text-lg">{curIndex + 1} / {slices.length}</div>
                    <Button color="purple" disabled={curIndex >= (slices.length - 1)} onClick={() => setPaused(!paused)}>{paused ? 'Resume' : 'Pause'}</Button>
                </div>
            </div>
            <div className="mt-2 w-96 h-96 bg-black">
                <canvas className="w-full h-full" ref={canvasRef} width={0} height={0} />
            </div>
        </div>
    )
}

import {DatasetImage, SliceAttributes} from './backend';
import * as ImageLoad from './imageload';

function randomInt(max: number) {
    return Math.floor(Math.random() * max);
}

// Fisher-Yates, but partial - we only shuffle as many items as we need.
// Note that in the full shuffle case (count == arr.length), a redundant swap (0 -> 0) is performed
// at the end of the loop. This is avoided in the traditional Fisher-Yates by an "i > 0" clause in the for loop,
// however, when (count < arr.length), the last swap is NO LONGER redundant, so we must include it
// for partial shuffling via the "i > (arr.length - count - 1)" clause in the for loop.
export function sampleWithoutReplacement<Type>(arr: Type[], count: number): Type[] {
    if (count === 0) return [];
    if (count > arr.length) throw new Error(`Can't sample ${count} elements from an array of length ${arr.length}`)

    for (let i = arr.length - 1; i > (arr.length - count - 1); i--) {
        const j = randomInt(i + 1);

        const swap = arr[j];
        arr[j] = arr[i];
        arr[i] = swap;
    }

    return arr.slice(arr.length - count, arr.length);
}

function doImageSample(images: DatasetImage[], imageCount: number): DatasetImage[] {
    const imagesCopy = images.slice();
    return sampleWithoutReplacement(imagesCopy, imageCount);
}

function doSliceSample(images: {image: DatasetImage, sliceCount: number}[],
                       sliceDim: number, sliceMinPct: number, sliceMaxPct: number,
                       sliceCount: number) {
    const possibleSlices: SliceAttributes[] = [];
    for (const {image, sliceCount} of images) {
        const minSlice = Math.floor(sliceCount * (sliceMinPct / 100));
        const maxSlice = Math.ceil(sliceCount * (sliceMaxPct / 100));
        for (let i = minSlice; i < maxSlice; i++) {
            possibleSlices.push({
                imageId: image.id,
                sliceDim: sliceDim,
                sliceIndex: i,
            });
        }
    }

    if (sliceCount > possibleSlices.length) sliceCount = possibleSlices.length;
    return sampleWithoutReplacement(possibleSlices, sliceCount);
}

export interface SliceSampleOpts {
    imageCount: number;
    sliceCount: number;
    sliceDim: number;
    sliceMinPct: number;
    sliceMaxPct: number;
}

export function sampleSlices(images: DatasetImage[], options: SliceSampleOpts): SliceAttributes[] {
    const {imageCount, sliceCount, sliceDim, sliceMinPct, sliceMaxPct} = options;
    if (sliceDim < 0 || sliceDim > 2) throw new Error(`Invalid sliceDim ${sliceDim}`);
    const startMs = Date.now();

    let curMs = Date.now();
    const sampledImages = doImageSample(images, imageCount);
    console.log(`Sampled ${sampledImages.length} images in ${Date.now() - curMs}ms`);

    curMs = Date.now();
    const imagesWithCounts = sampledImages.map(img => ({
        image: img,
        sliceCount: ImageLoad.loadDims(img.datasetRootPath + '/' + img.relPath)[sliceDim],
    }));
    console.log(`Loaded ${imagesWithCounts.length} slice counts in ${Date.now() - curMs}ms`);

    curMs = Date.now();
    const slices = doSliceSample(imagesWithCounts, sliceDim, sliceMinPct, sliceMaxPct, sliceCount);
    console.log(`Sampled ${slices.length} slices in ${Date.now() - curMs}ms`);
    console.log(`Finished sampling slices in ${Date.now() - startMs}ms`);
    return slices;
}

export function sampleComparisons(sliceCount: number, comparisonCount: number): number[][] {
    const startMs = Date.now();

    let curMs = Date.now();
    const combinations = [];
    for (let i = 0; i < sliceCount; i++) {
        for (let j = i + 1; j < sliceCount; j++) {
            combinations.push([i, j]);
        }
    }
    console.log(`Generated ${combinations.length} combinations in ${Date.now() - curMs}ms`);

    curMs = Date.now();
    if (comparisonCount === -1) comparisonCount = combinations.length;
    const comparisons = sampleWithoutReplacement(combinations, comparisonCount);
    console.log(`Sampled ${comparisons.length} comparisons in ${Date.now() - curMs}ms`);
    console.log(`Finished sampling comparisons in ${Date.now() - startMs}ms`);
    return comparisons;
}

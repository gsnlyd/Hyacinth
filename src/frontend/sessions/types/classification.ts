import {PrivateSessionBase} from '../base';
import {dbapi, LabelingSession, SessionElement, SliceAttributes} from '../../backend';
import {SessionResults, SliceResult} from '../../results';
import * as Results from '../../results';
import * as Collab from '../../collaboration';

export class ClassificationSession extends PrivateSessionBase {
    createSession(datasetId: number | string, sessionName: string, prompt: string, labelOptions: string,
                         slices: SliceAttributes[], metadata: object, comparisonCount: number): number {
        return dbapi.insertLabelingSession(datasetId, 'Classification', sessionName, prompt, labelOptions,
            JSON.stringify(metadata), slices, null);
    }

    selectElementsToLabel(session: LabelingSession): SessionElement[] {
        return dbapi.selectSessionSlices(session.id);
    }

    isComparison(): boolean {
        return false;
    }

    isActive(): boolean {
        return false;
    }

    sessionTags(): string[] {
        return ['Classification Session'];
    }

    shouldWarnAboutLabelOverwrite(session: LabelingSession, index: number): boolean {
        return false;
    }

    addLabel(session: LabelingSession, element: SessionElement, labelValue: string, startTimestamp: number) {
        dbapi.insertElementLabel(element.id, labelValue, startTimestamp, Date.now());
    }

    computeResults(session: LabelingSession): SessionResults {
        const slicesWithLabels = Results.withLabels(dbapi.selectSessionSlices(session.id));
        const slicesSorted = Results.sortedByLabel(slicesWithLabels, session.labelOptions);
        const sliceResults: SliceResult[] = slicesSorted.map(([s, l]) => ({slice: s, latestLabelValue: l}))
        return {
            labelingComplete: !sliceResults.map(r => r.latestLabelValue).includes(null),
            sliceResults: sliceResults,
        }
    }

    exportToJsonString(session: LabelingSession): string {
        const sessionJson = Collab.sessionAttributesToJson(session);
        sessionJson['slices'] = Collab.slicesToJson(dbapi.selectSessionSlices(session.id));
        return Collab.jsonToString(sessionJson);
    }

    importFromJson(sessionJson: object, newSessionName: string, datasetId: number | string): number {
        const {prompt, labelOptions, metadataJson} = Collab.sessionAttributesFromJson(sessionJson);
        const slices = Collab.slicesFromSessionJson(sessionJson, datasetId);

        return dbapi.insertLabelingSession(datasetId, 'Classification', newSessionName, prompt, labelOptions,
            metadataJson, slices, null);
    }

    exportLabelsToCsv(session: LabelingSession): string {
        return Collab.sliceLabelsToCsv(session);
    }

    exportResultsToCsv(results: SliceResult[]): string {
        return Collab.sessionResultsToCsv(results);
    }
}

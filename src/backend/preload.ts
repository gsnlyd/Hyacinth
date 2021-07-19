import {contextBridge} from 'electron';
import * as dbapi from './apis/dbapi';
import * as fileapi from './apis/fileapi';
import * as volumeapi from './apis/volumeapi';

contextBridge.exposeInMainWorld('dbapi', {
    connect: dbapi.connect,
    createTables: dbapi.createTables,
    insertDataset: dbapi.insertDataset,
    insertLabelingSession: dbapi.insertLabelingSession,
    selectAllDatasets: dbapi.selectAllDatasets,
    selectDataset: dbapi.selectDataset,
});

contextBridge.exposeInMainWorld('fileapi', {
    getDatasetImages: fileapi.getDatasetImages,
});

contextBridge.exposeInMainWorld('volumeapi', {
    readNifti: volumeapi.readNifti,
});

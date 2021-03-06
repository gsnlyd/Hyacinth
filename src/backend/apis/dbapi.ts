import Database from 'better-sqlite3';

let dbConn;

export function connect(dbPath: string) {
    // Sanity check to further constrain api (prevents loading of arbitrary sqlite files)
    if (dbPath !== ':memory:' && !dbPath.endsWith('hyacinth.db')) {
        throw new Error(`Invalid dbPath (file must be named hyacinth.db): ${dbPath}`);
    }

    dbConn = new Database(dbPath);
    dbConn.pragma('foreign_keys = ON;');
    dbConn.pragma('user_version = 1;')
    console.log('Connected to ' + dbPath);
}

export function createTables() {
    const createTablesTransaction = dbConn.transaction(() => {
        // For development
        // dbConn.prepare(`DROP TABLE IF EXISTS session_elements;`).run();
        // dbConn.prepare(`DROP TABLE IF EXISTS labeling_sessions;`).run();
        // dbConn.prepare(`DROP TABLE IF EXISTS dataset_images;`).run();
        // dbConn.prepare(`DROP TABLE IF EXISTS datasets;`).run();

        dbConn.prepare(`
            CREATE TABLE IF NOT EXISTS datasets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                datasetName TEXT UNIQUE,
                rootPath TEXT
            );
        `).run();

        dbConn.prepare(`
            CREATE TABLE IF NOT EXISTS dataset_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                datasetId INTEGER,
                relPath TEXT,
                FOREIGN KEY (datasetId) REFERENCES datasets (id) ON UPDATE CASCADE ON DELETE CASCADE,
                UNIQUE (datasetId, relPath)
            );
        `).run();

        dbConn.prepare(`
            CREATE TABLE IF NOT EXISTS labeling_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                datasetId INTEGER NOT NULL,
                sessionType TEXT NOT NULL,
                sessionName TEXT NOT NULL,
                prompt TEXT NOT NULL,
                labelOptions TEXT NOT NULL,
                metadataJson TEXT NOT NULL,
                FOREIGN KEY (datasetId) REFERENCES datasets (id) ON UPDATE CASCADE ON DELETE CASCADE,
                UNIQUE (datasetId, sessionName)
            )
        `).run();

        dbConn.prepare(`
            CREATE TABLE IF NOT EXISTS session_elements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sessionId INTEGER NOT NULL,
                elementType TEXT NOT NULL,
                elementIndex INTEGER NOT NULL,
                imageId1 INTEGER NOT NULL,
                sliceDim1 INTEGER NOT NULL,
                sliceIndex1 INTEGER NOT NULL,
                imageId2 INTEGER,
                sliceDim2 INTEGER,
                sliceIndex2 INTEGER,
                FOREIGN KEY (sessionId) REFERENCES labeling_sessions (id) ON UPDATE CASCADE ON DELETE CASCADE,
                FOREIGN KEY (imageId1) REFERENCES dataset_images (id) ON UPDATE CASCADE ON DELETE CASCADE,
                FOREIGN KEY (imageId2) REFERENCES dataset_images (id) ON UPDATE CASCADE ON DELETE CASCADE
            )
        `).run();

        dbConn.prepare(`
            CREATE TABLE IF NOT EXISTS element_labels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                elementId INTEGER NOT NULL,
                labelValue TEXT NOT NULL,
                startTimestamp INTEGER NOT NULL,
                finishTimestamp INTEGER NOT NULL,
                FOREIGN KEY (elementId) REFERENCES session_elements (id) ON UPDATE CASCADE ON DELETE CASCADE
            )
        `).run();
    });

    createTablesTransaction();
    console.log('Created tables');
}

export function insertDataset(datasetName, rootPath, imageRelPaths) {
    let insertedDatasetId;
    const insertDatasetTransaction = dbConn.transaction(() => {
        const datasetInsertInfo = dbConn.prepare(`
            INSERT INTO datasets (datasetName, rootPath) VALUES (:datasetName, :rootPath);
        `).run({datasetName, rootPath});

        const datasetId = datasetInsertInfo.lastInsertRowid;
        insertedDatasetId = datasetId;

        const insertImage = dbConn.prepare(`
            INSERT INTO dataset_images (datasetId, relPath) VALUES (:datasetId, :relPath);
        `);
        for (const relPath of imageRelPaths) insertImage.run({datasetId, relPath});
    });

    insertDatasetTransaction();
    console.log(`Inserted dataset ${datasetName}`);
    return insertedDatasetId;
}

export function insertLabelingSession(datasetId: number | string, sessionType: string, name: string,
                               prompt: string, labelOptions: string, metadataJson: string,
                               slices: any, comparisons: any) {
    labelOptions = labelOptions.split(',').map(s => s.trim()).join(',');

    let insertedSessionId;
    const insertTransaction = dbConn.transaction(() => {
        const sessionInsertInfo = dbConn.prepare(`
            INSERT INTO labeling_sessions (datasetId, sessionType, sessionName, prompt, labelOptions, metadataJson)
                VALUES (:datasetId, :sessionType, :name, :prompt, :labelOptions, :metadataJson);
        `).run({datasetId, sessionType, name, prompt, labelOptions, metadataJson});

        const sessionId = sessionInsertInfo.lastInsertRowid;
        insertedSessionId = sessionId;

        const insertElement = dbConn.prepare(`
            INSERT INTO session_elements (sessionId, elementType, elementIndex, imageId1, sliceDim1, sliceIndex1, imageId2, sliceDim2, sliceIndex2)
                VALUES (:sessionId, :elementType, :elementIndex, :imageId1, :sliceDim1, :sliceIndex1, :imageId2, :sliceDim2, :sliceIndex2);
        `);

        for (const [i, slice] of slices.entries()) {
            insertElement.run({
                sessionId: sessionId,
                elementType: 'Slice',
                elementIndex: i,
                imageId1: slice.imageId,
                sliceDim1: slice.sliceDim,
                sliceIndex1: slice.sliceIndex,
                imageId2: null,
                sliceDim2: null,
                sliceIndex2: null,
            });
        }

        if (comparisons) {
            for (const [i, c] of comparisons.entries()) {
                const sl1 = slices[c[0]];
                const sl2 = slices[c[1]];

                insertElement.run({
                    sessionId: sessionId,
                    elementType: 'Comparison',
                    elementIndex: i,
                    imageId1: sl1.imageId,
                    sliceDim1: sl1.sliceDim,
                    sliceIndex1: sl1.sliceIndex,
                    imageId2: sl2.imageId,
                    sliceDim2: sl2.sliceDim,
                    sliceIndex2: sl2.sliceIndex,
                });
            }
        }
    });

    insertTransaction();
    console.log(`Inserted labeling session ${name}`);
    return insertedSessionId;
}

export function insertElementLabel(elementId: number | string, labelValue: string, startTimestamp: number, finishTimestamp: number) {
    dbConn.prepare(`
        INSERT INTO element_labels (elementId, labelValue, startTimestamp, finishTimestamp)
            VALUES (:elementId, :labelValue, :startTimestamp, :finishTimestamp);
    `).run({elementId, labelValue, startTimestamp, finishTimestamp});

    console.log(`Inserted label "${labelValue}" for element ${elementId}`);
}

export function insertComparisonLabelActive(elementId: number | string, labelValue: string,
                                            startTimestamp: number, finishTimestamp: number,
                                            nextComparison: [any, any] | null) {
    const insertTransaction = dbConn.transaction(() => {
        // Insert label
        insertElementLabel(elementId, labelValue, startTimestamp, finishTimestamp);

        // Query additional info about element
        const {sessionId, elementIndex: labeledElementIndex} = dbConn.prepare(`
            SELECT sessionId, elementIndex FROM session_elements WHERE id = :elementId
        `).get({elementId});

        // Delete all comparisons which come after the comparison being labeled
        // Active sampling will choose new comparisons based on previous, so any comparisons
        // which come after this one are invalid and must be deleted
        // (note: labels are deleted by CASCADE on foreign key)
        dbConn.prepare(`
            DELETE FROM session_elements
            WHERE sessionId = :sessionId AND elementType = 'Comparison' AND elementIndex > :labeledElementIndex;
        `).run({sessionId, labeledElementIndex});

        // Insert new comparison if one is provided
        if (nextComparison) {
            const insertStatement = dbConn.prepare(`
                INSERT INTO session_elements (sessionId, elementType, elementIndex, imageId1, sliceDim1, sliceIndex1,
                                              imageId2, sliceDim2, sliceIndex2)
                VALUES (:sessionId, :elementType, :elementIndex, :imageId1, :sliceDim1, :sliceIndex1,
                        :imageId2, :sliceDim2, :sliceIndex2);
            `);
            const [slice1, slice2] = nextComparison;
            const newComparisonIndex = labeledElementIndex + 1;
            insertStatement.run({
                sessionId: sessionId,
                elementIndex: newComparisonIndex,
                elementType: 'Comparison',
                imageId1: slice1.imageId,
                sliceDim1: slice1.sliceDim,
                sliceIndex1: slice1.sliceIndex,
                imageId2: slice2.imageId,
                sliceDim2: slice2.sliceDim,
                sliceIndex2: slice2.sliceIndex,
            });
        }
    });

    insertTransaction();
    console.log(`Inserted label "${labelValue}" for comparison element ${elementId} (plus cleared future comparisons as needed)`);
}

export function deleteLabelingSession(sessionId: number | string) {
    const deleteTransaction = dbConn.transaction(() => {
        dbConn.prepare(`
            DELETE FROM labeling_sessions WHERE id = :sessionId;
        `).run({sessionId});
    });

    deleteTransaction();
    console.log(`Deleted session ${sessionId}`);
}

export function selectAllDatasets() {
    const datasetRows = dbConn.prepare(`
        SELECT d.id, d.datasetName, d.rootPath, count(DISTINCT di.id) AS imageCount, count(DISTINCT ls.id) AS sessionCount
        FROM datasets d
            LEFT JOIN dataset_images di on d.id = di.datasetId
            LEFT JOIN labeling_sessions ls on d.id = ls.datasetId
        GROUP BY d.id;
    `).all();
    console.log(`Selected ${datasetRows.length} datasets`);
    return datasetRows;
}

export function isDatasetNameAvailable(datasetName: string): boolean {
    const resultRow = dbConn.prepare(`
        SELECT count(*) AS datasetCount FROM datasets
        WHERE datasetName = :datasetName;
    `).get({datasetName});
    console.log(`Selected datasetCount ${resultRow.datasetCount} for datasetName ${datasetName}`);
    return resultRow.datasetCount === 0;
}

export function selectDataset(datasetId: number | string) {
    const datasetRow = dbConn.prepare(`
        SELECT d.id, d.datasetName, d.rootPath, count(di.id) AS imageCount
        FROM datasets d
        INNER JOIN dataset_images di on d.id = di.datasetId
        WHERE d.id = :datasetId;
    `).get({datasetId});
    console.log(`Selected dataset ${datasetRow.id} ${datasetRow.datasetName}`);
    return datasetRow;
}

export function selectDatasetImages(datasetId: number | string) {
    const imageRows = dbConn.prepare(`
        SELECT di.id, di.datasetId, di.relPath, d.rootPath as datasetRootPath FROM dataset_images di
        INNER JOIN datasets d on di.datasetId = d.id
        WHERE di.datasetId = :datasetId;
    `).all({datasetId});
    console.log(`Selected ${imageRows.length} images for dataset ${datasetId}`);
    return imageRows;
}

export function selectDatasetSessions(datasetId: number | string) {
    const sessionRows = dbConn.prepare(`
        SELECT id, datasetId, sessionType, sessionName, prompt, labelOptions, metadataJson
        FROM labeling_sessions
        WHERE datasetId = :datasetId;
    `).all({datasetId});
    console.log(`Selected ${sessionRows.length} sessions for dataset ${datasetId}`);
    return sessionRows;
}

export function isLabelingSessionNameAvailable(datasetId: number | string, sessionName: string): boolean {
    const resultRow = dbConn.prepare(`
        SELECT count(*) AS sessionCount FROM labeling_sessions
        WHERE datasetId = :datasetId AND sessionName = :sessionName;
    `).get({datasetId, sessionName});
    console.log(`Selected sessionCount ${resultRow.sessionCount} for datasetId ${datasetId} and sessionName ${sessionName}`);
    return resultRow.sessionCount === 0;
}

export function selectLabelingSession(sessionId: number | string) {
    const sessionRow = dbConn.prepare(`
        SELECT id, datasetId, sessionType, sessionName, prompt, labelOptions, metadataJson FROM labeling_sessions
        WHERE id = :sessionId;
    `).get({sessionId});
    console.log(`Selected session ${sessionRow.id} ${sessionRow.sessionName}`);
    return sessionRow;
}

export function selectSessionSlices(sessionId: number | string) {
    const sliceRows = dbConn.prepare(`
        SELECT se.id, se.sessionId, se.elementType, se.elementIndex, se.imageId1 as imageId, se.sliceDim1 as sliceDim, se.sliceIndex1 as sliceIndex,
               d.rootPath as datasetRootPath, di.relPath as imageRelPath,
               (SELECT el.labelValue FROM element_labels el WHERE el.elementId = se.id ORDER BY el.finishTimestamp DESC, el.id DESC LIMIT 1) AS elementLabel
        FROM session_elements se
        INNER JOIN dataset_images di on se.imageId1 = di.id
        INNER JOIN datasets d on di.datasetId = d.id
        WHERE se.sessionId = :sessionId AND se.elementType = 'Slice'
        ORDER BY se.elementIndex;
    `).all({sessionId});
    console.log(`Selected ${sliceRows.length} slices for session ${sessionId}`);
    return sliceRows;
}

export function selectSessionComparisons(sessionId: number | string) {
    const comparisonRows = dbConn.prepare(`
        SELECT se.id, se.sessionId, se.elementType, se.elementIndex, se.imageId1, se.sliceDim1, se.sliceIndex1, se.imageId2, se.sliceDim2, se.sliceIndex2,
               d.rootPath AS datasetRootPath, di1.relPath AS imageRelPath1, di2.relPath AS imageRelPath2,
               (SELECT el.labelValue FROM element_labels el WHERE el.elementId = se.id ORDER BY el.finishTimestamp DESC, el.id DESC LIMIT 1) AS elementLabel
        FROM session_elements se
            INNER JOIN dataset_images di1 on se.imageId1 = di1.id
            INNER JOIN dataset_images di2 on se.imageId2 = di2.id
            INNER JOIN datasets d on di1.datasetId = d.id
        WHERE se.sessionId = :sessionId AND se.elementType = 'Comparison'
        ORDER BY se.elementIndex;
    `).all({sessionId});
    console.log(`Selected ${comparisonRows.length} comparisons for session ${sessionId}`);
    return comparisonRows;
}

export function selectElementLabels(elementId: number | string) {
    const labelRows = dbConn.prepare(`
        SELECT id, elementId, labelValue, startTimestamp, finishTimestamp
        FROM element_labels
        WHERE elementId = :elementId
        ORDER BY finishTimestamp DESC, id DESC;
    `).all({elementId});
    console.log(`Selected ${labelRows.length} labels for element ${elementId}`);
    return labelRows;
}

export function selectSessionLatestComparisonLabels(sessionId: number | string): string[] {
    const labelRows = dbConn.prepare(`
        SELECT (SELECT el.labelValue FROM element_labels el WHERE el.elementId = se.id ORDER BY el.finishTimestamp DESC, el.id DESC LIMIT 1) AS elementLabel
        FROM session_elements se
        WHERE se.sessionId = :sessionId AND se.elementType = 'Comparison'
        ORDER BY se.id;
    `).all({sessionId});
    console.log(`Selected ${labelRows.length} latest comparison labels for session ${sessionId}`);
    return labelRows.map(r => r.elementLabel);
}

export function runWithRollback(func: Function): void {
    try {
        dbConn.transaction(() => {
            func();
            throw new Error('__triggerRollback');
        })();
    }
    catch (e) {
        if (e.message !== '__triggerRollback') throw e;
    }
}

importScripts('/nihon/js/sql-wasm.js');

let SQL;
let db; // This will hold your main in-memory database instance

self.onmessage = async (event) => {
    // Use a switch statement or a series of if/else if for different actions
    switch (event.data.action) {
        case 'loadDictionary':
            console.log('[DSW] Received loadDictionary message.');
            try {
                console.log('[DSW] Initializing sql.js...');
                const sqlPromise = initSqlJs({
                    locateFile: file => `/nihon/js/sql-wasm.wasm`
                });

                SQL = await sqlPromise;
                console.log('[DSW] sql.js initialized.');

                console.log('[DSW] Fetching dictionary manifest...');
                const manifestResponse = await fetch('/nihon/db/db_manifest.json');
                const manifest = await manifestResponse.json();
                const dbFiles = manifest.files;
                console.log(`[DSW] Manifest loaded. Found ${dbFiles.length} dictionary files.`);

                let mainDb = null;

                for (let i = 0; i < dbFiles.length; i++) {
                    const dbName = dbFiles[i];
                    const dbUrl = `/nihon/db/${dbName}`;

                    console.log(`[DSW] Processing dictionary part ${i + 1} of ${dbFiles.length}: ${dbName}`);
                    self.postMessage({ action: 'progress', message: `Processing dictionary ${i + 1} of ${dbFiles.length}` });

                    console.log(`[DSW] Fetching ${dbUrl}...`);
                    const response = await fetch(dbUrl);
                    const dbData = await response.arrayBuffer();
                    console.log(`[DSW] Fetched ${dbUrl}.`);

                    console.log(`[DSW] Loading ${dbName} into temporary database...`);
                    const tempDb = new SQL.Database(new Uint8Array(dbData));
                    // Note: .exec returns an array of results, so check rows[0]
                    const rows = tempDb.exec("SELECT ent_seq, kanji, reading, gloss FROM entries");
                    tempDb.close();
                    console.log(`[DSW] Loaded ${dbName}. Found ${rows.length > 0 && rows[0].values ? rows[0].values.length : 0} entries.`);


                    if (i === 0) {
                        console.log('[DSW] Creating main in-memory database.');
                        mainDb = new SQL.Database();
                        mainDb.exec(`CREATE VIRTUAL TABLE entries USING fts5(ent_seq, kanji, reading, gloss);`);
                    }

                    if (rows.length > 0 && rows[0].values.length > 0) {
                        console.log(`[DSW] Inserting entries from ${dbName} into main database...`);
                        const stmt = mainDb.prepare("INSERT INTO entries (ent_seq, kanji, reading, gloss) VALUES (?, ?, ?, ?)");
                        for (const row of rows[0].values) {
                            stmt.run(row);
                        }
                        stmt.free();
                        console.log(`[DSW] Finished inserting entries from ${dbName}.`);
                    }
                }

                db = mainDb; // Assign the mainDb to the global 'db' variable
                console.log('[DSW] Dictionary loading complete. Sending "completed" message.');
                self.postMessage({ action: 'completed' });

            }
            catch (error) {
                console.error('[DSW] Error loading dictionary:', error);
                self.postMessage({ action: 'error', message: error.message || 'An unknown error occurred during dictionary loading.' });
            }
            break; // Don't forget the break for this case!

        case 'getExampleWord':
            if (!db) {
                self.postMessage({ action: 'exampleWordResult', result: null, error: 'Dictionary not loaded.' });
                return;
            }
            const character = event.data.character;
            const exampleQuery = `SELECT kanji AS word, reading, gloss AS meaning FROM entries WHERE kanji LIKE ? OR reading LIKE ? ORDER BY RANDOM() LIMIT 1;`;
            const exampleStmt = db.prepare(exampleQuery);
            exampleStmt.bind([`%${character}%`, `%${character}%`]);
            let exampleResult = null;
            if (exampleStmt.step()) {
                exampleResult = exampleStmt.getAsObject();
            }
            exampleStmt.free();
            self.postMessage({ action: 'exampleWordResult', result: exampleResult });
            break;

        case 'searchDictionary':
            if (!db) {
                self.postMessage({ action: 'searchResult', result: [], error: 'Dictionary not loaded.' });
                return;
            }

            const word = event.data.word;
            const searchTerm = `%${word.toLowerCase()}%`;
            const query = `
                SELECT * FROM entries
                WHERE kanji LIKE ? OR reading LIKE ? OR gloss LIKE ?
                ORDER BY
                    LENGTH(kanji) ASC,
                    LENGTH(reading) ASC,
                    CASE WHEN kanji = ? THEN 1
                         WHEN reading LIKE ? THEN 2
                         ELSE 3
                    END,
                    kanji
                LIMIT 100;
            `;

            const stmt = db.prepare(query);
            stmt.bind([searchTerm, searchTerm, searchTerm, word, `${word}%`]);

            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            self.postMessage({ action: 'searchResult', result: results });
            break;

        default:
            console.warn('[DSW] Unknown action received:', event.data.action);
            self.postMessage({ action: 'error', message: `Unknown action: ${event.data.action}` });
            break;
    }
};
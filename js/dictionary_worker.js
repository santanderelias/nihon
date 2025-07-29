importScripts('/nihon/js/sql-wasm.js');

let SQL;
let db;

self.onmessage = async (event) => {
    if (event.data.action === 'loadDictionary') {
        try {
            const sqlPromise = initSqlJs({
                locateFile: file => `/nihon/js/sql-wasm.wasm`
            });

            SQL = await sqlPromise;
            
            const manifestResponse = await fetch('/nihon/db/db_manifest.json');
            const manifest = await manifestResponse.json();
            const dbFiles = manifest.files;

            let mainDb = null;

            for (let i = 0; i < dbFiles.length; i++) {
                const dbName = dbFiles[i];
                const dbUrl = `/nihon/db/${dbName}`;
                
                self.postMessage({ action: 'progress', message: `Processing dictionary ${i + 1} of ${dbFiles.length}` });

                const response = await fetch(dbUrl);
                const dbData = await response.arrayBuffer();
                
                const tempDb = new SQL.Database(new Uint8Array(dbData));
                const rows = tempDb.exec("SELECT ent_seq, kanji, reading, gloss FROM entries");
                tempDb.close();

                if (i === 0) {
                    mainDb = new SQL.Database();
                    mainDb.exec(`CREATE VIRTUAL TABLE entries USING fts5(ent_seq, kanji, reading, gloss);`);
                }

                if (rows.length > 0 && rows[0].values.length > 0) {
                    const stmt = mainDb.prepare("INSERT INTO entries (ent_seq, kanji, reading, gloss) VALUES (?, ?, ?, ?)");
                    for (const row of rows[0].values) {
                        stmt.run(row);
                    }
                    stmt.free();
                }
            }
            
            db = mainDb;
            self.postMessage({ action: 'completed' });

        } catch (error) {
            self.postMessage({ action: 'error', message: error.message });
        }
    } else if (event.data.action === 'searchDictionary') {
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
    }
};

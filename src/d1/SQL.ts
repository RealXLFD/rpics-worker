const createImgTable = `CREATE TABLE IF NOT EXISTS Images
(
    Hash  VARCHAR(32) PRIMARY KEY,
    Scale VARCHAR(6),
    Date INTEGER
);`

const createAlbumTable = `CREATE TABLE IF NOT EXISTS Albums
(
    Hash VARCHAR(32),
    Album VARCHAR(24),
    UNIQUE(Hash,Album),
	FOREIGN KEY (Hash) REFERENCES Images(Hash)
);
`

const createImgDataTable = `CREATE TABLE IF NOT EXISTS ImageData
(
    Hash VARCHAR(32),
    Path TEXT,
    Size VARCHAR(5),
    FOREIGN KEY (Hash) REFERENCES Images(Hash)
);`

const createImgDateIndex = `CREATE INDEX IF NOT EXISTS idx_date ON Images(Date);`
const createAlbumIndexes = `CREATE INDEX IF NOT EXISTS idx_album ON Albums(Album);`


export const SQL = {
    i_a_hash: `SELECT Images.Hash FROM Images JOIN Albums ON Images.Hash = Albums.Hash `,
    i_hash: `SELECT Hash FROM Images `,
    a_hash: `SELECT DISTINCT Hash FROM Albums `,
    i_a_count: `SELECT COUNT(DISTINCT Images.Hash) AS count FROM Images JOIN Albums ON Images.Hash = Albums.Hash `,
    o_by_rand: ` ORDER BY RANDOM() LIMIT 1;`,
    o_by_date: ` ORDER BY Images.Date LIMIT 1 OFFSET ?;`,
    by_scale: ` WHERE Images.Scale = ? `,
    by_album: ` WHERE Albums.Album = ? `,
    by_album_scale: ` WHERE Albums.Album = ? AND Images.Scale = ? `,
    fixed: {
        put_img: `INSERT OR IGNORE INTO Images VALUES (?, ?, ?);`,
        put_img_data: `INSERT OR IGNORE INTO ImageData VALUES (?, ?, ?);`,
        bind_img_album: `INSERT OR IGNORE INTO Albums VALUES (? , ?);`,
        get_img_path: `SELECT Path FROM ImageData WHERE Hash = ? AND Size = ?;`,
        get_raw_img_path: `SELECT Path FROM ImageData WHERE Hash = ? AND Size = ?;`,
        get_img_scale: `SELECT Scale FROM Images WHERE Hash = ?;`,
        get_all_paths: `SELECT Path FROM ImageData WHERE Hash = ?;`,
        del_album: `DELETE FROM Albums WHERE Hash = ? AND Album = ?;`,
        del_files: [`DELETE FROM ImageData WHERE Hash = ?;`, `DELETE FROM Albums WHERE Hash = ?;`, `DELETE FROM Images WHERE Hash = ?;`],
        a_contains: `SELECT Album FROM Albums WHERE Hash = ?;`
    },
    create: {
        img: createImgTable,
        album: createAlbumTable,
        img_data: createImgDataTable,
        img_date_index: createImgDateIndex,
        album_index: createAlbumIndexes,
    }
}

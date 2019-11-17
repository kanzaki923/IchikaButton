const express = require('express');
const router = express.Router();

// mysql
const mysql = require('mysql');

const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWD,
    database: process.env.DB_USE_DB,
    multipleStatements: true
});

const GET_DATA_PARM = {
    VOICE: {
        columns: [
            "videoId",
            "video.title",
            "video.youtubeId",
            "video.uploadAt",
            "voice.word as name",
            "voice.id as dbId",
            "voice.created_at",
            "TIME_TO_SEC(startSec) as startSec",
            "TIME_TO_SEC(duration) as duration",
            "voice.fileName",
            "'voice' as type",
        ],
        where: []
    },
    SONG: {
        columns: [
            "videoId",
            "video.title",
            "video.youtubeId",
            "video.uploadAt",
            "song.songName as name",
            "song.id as dbId",
            "song.created_at",
            "TIME_TO_SEC(startSec) as startSec",
            "TIME_TO_SEC(duration) as duration",
            "'' as fileName",
            "'song' as type",
        ],
        where: []
    }
};

router.get('/contents', (req, res, next) => {

    getItemDetail(GET_DATA_PARM.VOICE, GET_DATA_PARM.SONG, (result, err) => {
        if (result) {
            res.json(result);
        } else {
            res.status(500).end();
            return;
        }
    });

});

router.get('/contents/songs', (req, res, next) => {
    getItemDetail(null, GET_DATA_PARM.SONG, (result, err) => {
        if (result) {
            res.json(result);
        } else {
            res.status(500).end();
            return;
        }
    });
});

router.get('/contents/songs/:id(\\d{1,5})', (req, res, next) => {
    let SongOption = ObjClone(GET_DATA_PARM.SONG);
    SongOption.where.push({
        name: "song.id",
        value: Number(req.params.id),
        type: "int",
        not: false
    });

    getItemDetail(null, SongOption, (result, err) => {
        if (result) {
            res.json(result);
        } else {
            res.status(500).end();
            return;
        }
    });
    SongOption = null;
});


router.get('/contents/voices', (req, res, next) => {
    getItemDetail(GET_DATA_PARM.VOICE, null, (result, err) => {
        if (result) {
            res.json(result);
        } else {
            res.status(500).end();
            return;
        }
    });
});

router.get('/contents/voices/:id(\\d{1,5})', (req, res, next) => {
    let VoiceOption = ObjClone(GET_DATA_PARM.SONG);
    VoiceOption.where.push({
        name: "voice.id",
        value: Number(req.params.id),
        type: "int",
        not: false
    });

    getItemDetail(VoiceOption, null, (result, err) => {
        if (result) {
            res.json(result);
        } else {
            res.status(500).end();
            return;
        }
    });
    VoiceOption = null;

});





/**
 * オブジェクトを複製して複製したオブジェクトを返します
 * @param {*} src 基
 */
const ObjClone = (src) => {
    return JSON.parse(JSON.stringify(src));
};

/**
 * データベースからSong,Voiceのデータを取得。
 * @param {{columns:[...string], where:[...{name:string, value:(string| int), type:("string"|"int"), not:boolean}]}} VoiceOption 
 * @param {*} SongOption 
 * @param {function} callback 
 */
const getItemDetail = (VoiceOption, SongOption, callback) => {


    //HACK: テーブルの情報もオブジェクトを見るようにするほうがいいかも
    let voiceGetSql = null;
    if (VoiceOption != null) {
        let columns = VoiceOption.columns.join(", ");
        let voiceWhereStatement = getWhereStatement(VoiceOption.where);
        voiceGetSql = `select ${columns} from voice join video on voice.videoId = video.id ${voiceWhereStatement != null ? " where " + voiceWhereStatement : ""}`;
    }

    let songGetSql = null;
    if (SongOption != null) {
        let columns = SongOption.columns.join(", ");
        let songWhereStatement = getWhereStatement(SongOption.where);
        songGetSql = `select ${columns} from song join video on song.videoId = video.id ${songWhereStatement != null ? " where " + songWhereStatement: ""}`;
    }


    // console.log(`${voiceGetSql != null ? voiceGetSql + ";" : ""}${songGetSql != null ? songGetSql + ";": ""}`);
    //console.log("voiceSQL : ", voiceGetSql);
    // console.log("SongSQL : ", songGetSql);

    //音声+アーカイブ情報を取得する
    conn.query(`${voiceGetSql != null ? voiceGetSql + ";" : ""}${songGetSql != null ? songGetSql + ";": ""}`, (err, sqlrslts, fields) => {
        if (err || sqlrslts == undefined) { //TODO: Write log file
            return callback(null, err);
        }
        let result = {
            archives: {},
            tracks: []
        };

        //HACK: 複数のSQLを実行したときと、一つのSQLを実行したときの判定が汚い
        let count = (sqlrslts.length == undefined || sqlrslts.length > 2) ? 1 : sqlrslts.length; //一つのsqlを実行したのか複数のsqlを実行したのか
        for (let i = 0; i < count; i++) {
            let resValues = (count == 1) ? sqlrslts : sqlrslts[i]; //1つのsqlを実行した場合は、ネストされないのでその処理
            resValues.forEach(row => {

                //row.nameの値が内か最初が-だったらそのアイテムは返さない
                if (row.name.length <= 0 || row.name.startsWith('-')) {
                    return;
                }

                //archives情報を、重複なく返すオブジェクトに追加
                if (!(row.youtubeId in result.archives)) {
                    result.archives[row.youtubeId] = {
                        ytid: row.youtubeId,
                        title: row.title,
                        date: row.uploadAt,
                        id: row.videoId
                    };
                }

                //track情報を返すオブジェクトに追加
                result.tracks.push({
                    type: row.type,
                    title: row.name,
                    path: row.fileName,
                    tags: [],
                    id: row.dbId,
                    createdAt: row.created_at,
                    source: {
                        begin: row.startSec,
                        end: row.startSec + row.duration,
                        ytid: row.youtubeId
                    }
                });
            });
        }
        callback(result, null);
    });
};


/**
 * whereオブジェクトからwhere文を返す。
 * valueの値しかエスケープされない
 * where: [
            {
                name: "id",
                value: val, *この値だけエスケープされる*
                type: "int"or "string",
                not: false
            }
        ]

 * @param {[{name: string, value: (string|number), type: ["string"|"int"], not: boolean}]} WhereOptions 
 */
const getWhereStatement = (WhereOptions) => {

    let _whereStr = [];
    for (const key in WhereOptions) {
        if (WhereOptions.hasOwnProperty(key)) {
            const option = WhereOptions[key];
            let safeValue = null;
            if (!("type" in option)) continue; //型情報がない場合は処理しない

            if (option.type == "int") {
                if (/\d{1,13}/.test(option.value)) { //数値であり、13桁以下であるか
                    safeValue = Number(option.value);
                }
            } else if (option.type == "string") { //type=stringはvalueをmysqlのエスケープ関数で処理
                safeValue = conn.escape(option.value);
            }

            if (safeValue == null) continue;
            _whereStr.push("" + option.name + ((option.not) ? " != " : " = ") + "" + safeValue);
        }
    }

    if (_whereStr.length <= 0) return null;

    return _whereStr.join(" and ");
};


module.exports = router;
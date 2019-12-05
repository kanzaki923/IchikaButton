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
            "video.videoLength as length",
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
            "video.videoLength as length",
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
    let VoiceOption = ObjClone(GET_DATA_PARM.VOICE);
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

router.get('/contents/archives/:ytid([a-zA-Z0-9_-]{11})?', (req, res, next) => {
    let ytid = (req.params.ytid) ? req.params.ytid : "";
    let ArchivesOption = {
        ytid,
        q: req.query.q,
        page: req.query.page,
        limit:20
    };

    getArchives(ArchivesOption, (result, err) => {
        if (result) {
            res.json(result);
        } else {
            res.status(500).end();
            return;
        }
    });

});

router.get('/contents/resiyou', (req, res, next) => {
    let ytid = (req.params.ytid) ? req.params.ytid : "";
    let options = {
        ytid: req.query.v, 
        name: req.query.name,
        videoId: req.query.vid//DB ID
    };

    getResiyou(options, (result, err) => {
        if (result) {
            res.json(result);
        } else {
            res.status(500).end();
            return;
        }
    });

});



/**
 * オブジェクトを複製して複製したオブジェクトを返します
 * @param {*} src 基
 */
const ObjClone = (src) => {
    return JSON.parse(JSON.stringify(src));
};




const getArchives = (option, callback) => {
    /*option = 
    {
        ytid: string,
        dbid: int,
        q: string,
        sort: num,
        limit:num
        page: num
    }*/
    const sortVals = [
        "v.uploadAt",
        "v.videoLength",
        "VoiceCount",
        "SongCount",
        "LisiyouCount",
        "v.title",
    ];

    const sqlVals = {
        ytid    : (option.ytid) ? conn.escape(option.ytid) : "",
        dbid    : (option.dbid) ? Number(option.dbid) : -1,
        q       : (option.q) ? conn.escape("%" +option.q + "%") : "",
        sort    : (option.sort && option.sort >= 0 && sortVals.length > option.sort) ? Number(option.sort) : 0,
        sortOrder: (option.sortOrder && ["asc", "desc"].includes(option.sortOrder)) ? conn.escape(option.sortOrder) : "asc",
        limit   : (option.limit && option.limit <= 500 && option.limit >= 1) ? Number(option.limit) : 25,
        page    : (option.page) ? Number(option.page) : 1
    };

    option = {};

    let NaNExists = Object.values(sqlVals).includes(NaN); //sqlValsにNanがあるかチェック。(数値以外の入力をチェック)
    if (NaNExists) {
        callback(null, {error: "パラメータが不正です"});
        return;
    }

    let searchSQL = "";

    if (sqlVals.q !== "" || sqlVals.ytid !== "" || sqlVals.dbid !== -1) {
        if (sqlVals.q !== "") {
            searchSQL = ` where v.id in ( select videoId from vtagMap left join vtag on vtagMap.vtagId = vtag.id where name like ${sqlVals.q}) or v.title like ${sqlVals.q} `;
        } else if (sqlVals.ytid !== "" && /[0-9a-zA-Z-_]{11}/.test(sqlVals.ytid)) {
            searchSQL = ` where v.youtubeId = ${sqlVals.ytid} `;
        } else {
            searchSQL = ` where v.id = ${sqlVals.dbid} `;
        }
    }

    let sortSQL = `order by ${sortVals[sqlVals.sort]} ${sqlVals.sortOrder}`;
    let offset = (sqlVals.page - 1) * sqlVals.limit;


    let sql = `select
        SQL_CALC_FOUND_ROWS distinct v.id, v.youtubeId, v.title, v.videoLength,v.uploadAt ,
        (select count(id) from voice where voice.videoId = v.id) as VoiceCount, 
        (select count(id) from song where song.videoId = v.id) as SongCount, 
        (select count(id) from lisiyou where lisiyou.videoId = v.id) as LisiyouCount 
        from video as v 
        ${searchSQL} 
        ${sortSQL} 
        limit ${offset}, ${sqlVals.limit} 
    ;`;


    conn.query(sql, (err, sqlrslts, fields) => {
        if (err || sqlrslts == undefined) { //TODO: Write log file
            return callback(null, err);
        }
        let result = {
            archives: [],
        };

        sqlrslts.forEach(row => {
            result.archives.push({
                ytid: row.youtubeId,
                title: row.title,
                date: row.uploadAt,
                length: row.videoLength,
                id: row.id,
                detail: {
                    voice: row.VoiceCount,
                    song: row.SongCount,
                    lisiyou: row.LisiyouCount,
                },
            });
        });
        callback(result, null);
    });
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
                        id: row.videoId,
                        length: row.length,
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


/** りしーゆーデータを取得
 * option.ytid != null　youtubeIDに一致する動画のりしーゆー一覧とそれに関するarchivesを返す
 * option.name != null  nameが含まれているりしーゆーの一覧とそれに関するarchivesを返す
 */
const getResiyou = (option, callback) => {
    // let option_ex = {
    //     ytid: "hoge{11}", 
    //     name: "ひらがな",
    //     videoId: 0//DB ID
    // };

    if (!option){
        callback(null, {error: "パラメータが不正です"});
        return;
    }

    let whereOptions = [];
    let likeStatement = "";
    if (option.ytid){
        //YoutubeIdをキーとしたwhere句を条件に追加
        whereOptions.push({
            name:"youtubeId",
            value: conn.escape(option.ytid),
            type: "string"
        });
    }
    //videoIdが存在して数値である場合
    if (option.videoId && !isNaN(Number(option.videoId))){
        //video.idをキーとしたwhere句を条件に追加
        whereOptions.push({
            name:"videoId",
            value: option.videoId,
            type: "int"
        });
    }

    if (option.name && option.name.trim().length > 0){
        let safeName = conn.escape("%" + option.name.trim()+ "%");
        likeStatement = `nameRuby like ${safeName} `;
        if (option.name.trim().length <= 1){
            //部分一致で、1文字検索は結果が多すぎるので3文字以下の人のみかえす
            //昔は一文字は検索できないようにしてたが、一文字のひとが見れないためこの処理を追加
            likeStatement += " and CHAR_LENGTH(nameRuby) <= 3 ";
        }
    }
    

    let whereStatement = getWhereStatement(whereOptions) || "";
    whereStatement += likeStatement;
    whereStatement = (whereStatement !== "") ? " where " + whereStatement : "";
    let sql = `select * from lisiyou join video on lisiyou.videoId = video.id ${whereStatement} order by nameRuby,uploadAt;`;

    conn.query(sql, (err, sqlrslts, fields) => {
        if (err || sqlrslts == undefined) { //TODO: Write log file
            callback(null, err);
            return;
        }

        if (sqlrslts.length >= 500){
            callback(null, {error: "検索結果が多すぎます。絞込んでくさだい。"});
            return;
        }

        let result = {
            archives: [],
            resiyous: {},
            resultCount :0
        };

        sqlrslts.forEach(row => {
            if (!result.archives.some((val) => {return val.ytid == row.youtubeId;})){
                result.archives.push({
                    ytid: row.youtubeId,
                    title: row.title,
                    date: row.uploadAt,
                    length: row.videoLength,
                    id: row.videoId
                });
            }
            let key = row.nameRuby;
            key = key.replace("（", "(");
            key = (key.indexOf("(") != -1) ? key.substring(0, key.indexOf("(")) : key;
            if (!result.resiyous[key]){
                result.resiyous[key] = [];
            }
            result.resiyous[key].push({
                name: row.nameRuby,
                ytid: row.youtubeId,
                archivesId: row.videoId,
                beginSec: row.startSec
            });
        });
        result.resultCount = sqlrslts.length;
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
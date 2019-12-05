var express = require('express');
var router = express.Router();
const axios = require('axios').default;


router.get("/:ytid", function (req, res, next) {
    if (/[0-9a-zA-Z_-]{11}/.test(req.params.ytid)){
        let items = getArchives(req.params.ytid).then((items) => {
            let reslt = {archives: items};
            reslt = items;
            console.log(reslt);
            if (reslt.archives.length <= 0){
                next();
                return;
            }

            res.render("content", {
                page: {
                    title: "アーカイブ",
                    contentLength: reslt.archives.length,
                    areaType: "archives-detail"
    
                },
                value: {"archives": reslt.archives}
            });
        });
    }else{
        next();
    }
    
},resNoContent);



router.get("/", function (req, res, next){
    let queryOpts = [];
    console.log(req.query.page);
    if (req.query.page && /\d{1,4}/.test(req.query.page)){
        queryOpts.push("page=" + req.query.page);
    }
    let items = getArchives("?" + queryOpts.join('&')).then((items) => {
        let reslt = {archives: items};
        reslt = items;
        res.render("content", {
            page: {
                title: "すべてのアーカイブ",
                contentLength: reslt.archives.length,
                areaType: "archives-list"

            },
            value: {"archives": reslt.archives}
        });
    });
});


function resNoContent(req, res, next){
    res.render("content", {
        page: {
            title: "アーカ!イブ",
            contentLength: 0,
            areaType: "message"
        },
        value: {"archives": {},"message": "このアーカイブは登録されていません。"}
    });
}



async function getArchives(ytid) {
    // return;
    let basePath = "";
    if (process.env.NODE_ENV == "development") {
        basePath = process.env.API_PATH_DEBUG;
    } else {
        basePath = process.env.API_PATH;
    } 
    //const dataPath = path.join(basePath, "contents");
    const dataPath = basePath + `contents/archives/${(ytid) ? ytid : ""}`;
    // console.log(dataPath);
    console.log(dataPath);
    const res = await axios.get(dataPath);
    return res.data;
}

module.exports = router;
var express = require('express');
var router = express.Router();
const path = require("path");
const axios = require('axios').default;

router.get("/", function (req, res, next) {
    let items = getArchives("songs").then((items) => {
        let result = {archives: []};


        for (const key in items.archives) {
            let item = items.archives[key];
            
            result.archives.push({
                title: item.title,
                date: item.date,
                duration: item.length,
                thumbnail_url: `https://img.youtube.com/vi/${item.ytid}/mqdefault.jpg`,
                ytid: item.ytid,
                detail: {}//TODO: 値を返すようにするか、クライアント側ajaxで取る
            });
        }

        res.render("content", {
            page: {
                title: "歌",
                contentLength: result.archives.length,
                areaType: "archives-list"
            },
            value:{ archives: result.archives }
        });
        
    });
});

router.get("/test", resSend);


async function resSend(req,res,next) {
    let result = await getArchives();
    
    res.json(result.archives);

}


async function getArchives(type = "") {
    let basePath = "";
    if (process.env.NODE_ENV == "development") {
        basePath = process.env.API_PATH_DEBUG;
    } else {
        basePath = process.env.API_PATH;
    }
    //const dataPath = path.join(basePath, "contents");
    const dataPath = basePath + "contents" + (type !== "" ? "/" + type: "") ;
    console.log(dataPath);
    const res = await axios.get(dataPath);
    return res.data;
}

module.exports = router;
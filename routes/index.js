var express = require('express');
var router = express.Router();
const path = require("path");
const axios = require('axios').default;

router.get("/", function (req, res, next) {
    let items = getArchives().then((items) => {
        let reslt = {archives: []};


        for (const key in items.archives) {
            let item = items.archives[key];
            
            reslt.archives.push({
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
                title: "すべてのコンテンツ",
                contentLength: reslt.archives.length
            },
            "archives": reslt.archives
        });
    });
});


async function getArchives() {
    let basePath = "";
    if (process.env.NODE_ENV == "development") {
        basePath = process.env.API_PATH_DEBUG;
    } else {
        basePath = process.env.API_PATH;
    }
    //const dataPath = path.join(basePath, "contents");
    const dataPath = basePath + "contents";
    // console.log(dataPath);
    const res = await axios.get(dataPath);
    return res.data;
}

module.exports = router;
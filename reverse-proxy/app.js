const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors({
    origin: '*'
}));

app.all(':endpoint([\\w\\W.]*)', function (req, res) {
    let endpoint = 'https://admin.smil-control.com' + req.url;

    console.log("METHOD: " + req.method);
    switch(req.method.toUpperCase()) {
        case 'GET':
            axios.get(endpoint).then(response => {
                res.writeHead(response.status, response.headers);
                res.end(
                    JSON.stringify(response.data)
                );
            }).catch(error => {
                res.json(error);
            });
            break;
        case 'HEAD':
            axios.head(endpoint).then(response => {
                res.writeHead(response.status, response.headers);
                res.end();
            }).catch(error => {
                let response = error.response;
                if(error.response.status == 304) {
                    // res.writeHead(200, {
                    //     'Last-Modified': 'Fri Nov 12 2021 15:23:45 GMT+0200'
                    // });
                    // res.end();
                    res.writeHead(response.status, response.headers);
                    res.end();
                } else {
                    res.json(error);
                }
            });
            break;
        case 'POST':
            axios.post(endpoint, {}).then(response => {
                res.json(response.data);
            })
            break;
    }
})

app.listen(3010);
import dotenv from 'dotenv';
dotenv.config();

import https from 'https';
import http from 'http';
import fs from 'fs';
import url from 'url';

import CacheableLookup from 'cacheable-lookup';
const cacheable = new CacheableLookup();

cacheable.install(http.globalAgent);
cacheable.install(https.globalAgent);

const toriAPI = "https://api.toriclient.com/launcher/online/detailed";
const mojangAPI = "https://playerdb.co/api/player/minecraft/";
var toriResponse = [];
var lastQuery = Date.now();

const httpOptions = {
    key: fs.readFileSync(process.env.KEY_PATH),
    cert: fs.readFileSync(process.env.CERT_PATH),
};

function queryTori() {
    try {
        https.get(toriAPI, (_response) => {
            let _body = "";
            _response.on("data", (_chunk) => {
                _body += _chunk;
            });
    
            _response.on("end", () => {
                toriResponse = JSON.parse(_body);
                queryMojang();
            });
        });
    }
    catch(_e) {
        console.error("Failed to query Tori API: " + _e);
    }
}

function queryMojang() {
    for(let _element in toriResponse["uuid"]) {
        try {
            https.get(`${mojangAPI}${_element}`, (_response) => {
                let _body = "";
    
                _response.on("data", (_chunk) => {
                    _body += _chunk;
                });
        
                _response.on("end", () => {
                    let _data = JSON.parse(_body);
                    if(_data.code == "minecraft.api_failure" || _data.code == "minecraft.invalid_username") {
                        delete toriResponse["uuid"][_element];
                    }
                    else {
                        toriResponse["uuid"][_element] = JSON.parse(_body)["data"]["player"].username;
                    }
                });
            });
        }
        catch(_e) {
            console.error("Failed to query Player API: " + _e);
        }
    }
}

// create our server
https.createServer(httpOptions, async function (_request, _response) {
    _response.setHeader("Content-Type", "text/json")
    _response.setHeader("Access-Control-Allow-Origin", "*");
    
    let _query = url.parse(_request.url, true);
    let _type = _query.pathname;

    let _params = _query.path.split("?");
    if(_params.length <= 0 || _params[1] == "") {
        _response.end();
        return;
    }
    
    try {
        switch(_type) {
            case "/api/tori_users":
                if(Date.now() - lastQuery > 16) {
                    queryTori();
                }

                _response.write(JSON.stringify(toriResponse).toString());
                _response.end();
                break;
        }
    }
    catch(_e) {
        console.error("Failed to handle HTTP request: " + _e);
    }
}).listen(25533);
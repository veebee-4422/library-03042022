const Redis = require('redis');
require('dotenv').config();

const t = 3600;
const redisClient = Redis.createClient({
    url: 'redis://:' + process.env.PASS + '@' + process.env.REDISHOST + '/0'
});

redisClient.connect()
.then(redisClient.on('error', err => {
    console.log(err);
}));


function dropCache(){
    redisClient.flushAll();
};
function getSetCache(key, callBack){
    return new Promise((resolve, reject)=>{
        redisClient.get(key)
        .then((data)=>{
            if(data!= null){ 
                // console.log('Cache hit');
                return resolve(JSON.parse(data))
            }
            // console.log('Cache miss');
            callBack()
            .then((freshData)=>{
                redisClient.setEx(key, t, JSON.stringify(freshData));
                return resolve(freshData); 
            })
            .catch(err=>console.log(err))
            
        })
        .catch((error)=>{
            reject(error);
        });
    })  //promise end
};

module.exports = {getSetCache: getSetCache, dropCache: dropCache};
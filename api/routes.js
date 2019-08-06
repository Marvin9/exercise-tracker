const router = require('koa-router');
const routers = new router();
const fs = require('fs');
const Datastore = require('nedb');
const db = new Datastore('./api/_user.db');
const request = require('request');
db.loadDatabase();

const days = ["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

function l(e) {console.log(e)};

routers.get('/', async(ctx) => {
    ctx.type = 'html';
    ctx.body = fs.createReadStream('./index.html');
});

//ip address
routers.get('/api/whoami', async(ctx) => {
    ctx.body = ctx.request.ip.toString();
});

//get log by userid
routers.get('/api/exercise/log', async(ctx) => {
    let _id = ctx.query.userid;
    if(_id)
    {
        let id = (await find_db({_id : _id}));
        if(!(id.length)) {
            ctx.type = 'text';
            ctx.body = "unknown id.";
        } else {
            ctx.type = 'json';
            let final_obj = id[0];
            if(ctx.query.limit) {
                final_obj.log = final_obj.log.slice(0, ctx.query.limit);
                ctx.body = final_obj;
            } else {
                ctx.body = final_obj;
            }
        }
    } else {
        ctx.type = 'text';
        ctx.body = 'define userid';
    }
});

//add new user
routers.post('/api/exercise/new-user', async(ctx) => {
    //parse username from form
    let username = ctx.request.body.new_user;
    
    //if username is not empty
    if(username.match(/\S/))
    {
        //check if user already exist
        let exist = (await find_db({"username" : username})).length;
        if(exist)
        {
            ctx.type = 'text';
            ctx.body = "Username already taken";
        }
        else //if not then
        {
            let user = await insert_db({"username" : username, "count" : 0, "log" : []});
            ctx.type = 'json';
            ctx.body = user;
        }
    }
    else
        ctx.body = {
            "error" : "Username must not be null."
        };
});

//add exercise
routers.post('/api/exercise/add', async(ctx) => {
    //parse userid(unique in database), description, duration and date
    let {userid, description, duration, date} = ctx.request.body, err = " required.";
    ctx.type = 'text';
    //validation
    if(is_empty(userid))
    {
        ctx.body = "Userid" + err;
    } else if(is_empty(description)) {
        ctx.body = "Description" + err;
    } else if(is_empty(duration)) {
        ctx.body = 'Duration' + err;
    } else if(duration.match(/\D/)) { //if inputed duration is not number 
        ctx.body = 'Duration should be a number';
    } else {
        //check uniqueid in database
        let id_exist = (await find_db({"_id" : userid})).length;
        if(!id_exist) { //if it don't exist
            ctx.body = 'unknown_id';
        } else {
            let date_formatted = await get_date(date); //format given date
            let updated_obj = { description : description, duration : +duration, date : date_formatted};
            //update values (push activity to log)
            await db.update({_id : userid}, {$inc : { count : 1}, $push : {log : updated_obj}});
            let uname = (await find_db({_id : userid}))[0].username;
            ctx.type = 'json';
            ctx.body = {
                "username" : uname,
                "_id" : userid,
                "description" : description,
                "duration" : +duration,
                "date" : date_formatted
            };
        }
    }
});


module.exports = routers.routes();

//manual async operations on nedb

async function find_db(obj) {
    return new Promise((resolve, reject) => {
        db.find(obj, (err, doc) => {
            if(err) reject(err);
            else
                resolve(doc);
        });
    });
}

async function insert_db(obj) {
    return new Promise((resolve, reject) => {
        db.insert(obj, (err, doc) => {
            if(err) reject(err);
            else
                resolve(doc);
        })
    })
}

async function get_date(date) {
    return new Promise((res, rej) => {
        url = 'https://marvin9-api-timestamp.glitch.me/api/timestamp/'+date;
        request(url, (err, body) =>{
            if(err) rej(err);
            else
            {
                let data = JSON.parse(body.body);
                if(data.error) res(0);
                else {
                    let utc = data.utc;
                    let date = new Date(utc);
                    let str = days[date.getDay()] + " " + months[date.getMonth()] + " " + date.getDate() + " " + date.getFullYear();
                    res(str);
                }
            }
        });
    });
}

function is_empty(str) {
    if(str.match(/\S/))
        return 0;
    return 1;
}

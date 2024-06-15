import express from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { connectDB } from './data/database.js';
import {User} from "./model/user.js";
import { sendCookie } from './utils/feature.js';
import cookieParser from 'cookie-parser';
import { WebSocketServer } from "ws";
import { Message } from './model/message.js';
import fs from 'fs';
import path from 'path';

dotenv.config();
connectDB();

const app = express();

const currentDir = ( typeof(__dirname) !== 'undefined' ) ? __dirname : process.cwd();

app.use('/uploads', express.static(path.join(currentDir, 'uploads')));
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: [process.env.FRONTEND_URL],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    })
);

async function getInfoFromReq(req){
    return new Promise((resolve, reject) => {
        const token = req.cookies?.token;
        if(token){
            jwt.verify(token, process.env.JWT_SECRET, {}, (err, data) => {
                if(err) throw err;
                resolve(data);
            })
        }
        else{
            reject('no token');
        }
    });
}

app.get("/messages/:userId", async (req, res) => {
    const {userId} = req.params;
    const data = await getInfoFromReq(req);
    const ourUserId = data.userId;
    const messages = await Message.find({
        sender : {$in:[userId, ourUserId]},
        recipient : {$in:[userId, ourUserId]}, 
    }).sort({createdAt : 1});
    res.json(messages);
});

app.get("/people", async (req, res) => {
    const users = await User.find({}, {username:1, _id:1});
    res.json(users);
})


app.get("/profile", async (req, res) => {
    const token = req.cookies?.token;   
    if(token){
        jwt.verify(token, process.env.JWT_SECRET, {}, (err,data) => {
            if(err) throw err;
            res.json(data);
        })
    }
    else{
        res.status(401).json("no token");
    }
});

app.post("/login", async (req, res) => {
    try {
        const {username, password} = req.body;
        let user = await User.findOne({username}).select("+password");
        if(!user){
            console.log("user don't exists register first");
            return res.status(500).json("error");
        }
        const isValid = await bcrypt.compare(password, user.password);
        if(!isValid){
            console.log("wrong password");
            return res.status(500).json("error");
        }
        sendCookie(user, res);
    } catch (error) {
        throw(error);
    }
})

app.post("/logout", (req, res) => {
    res.cookie('token', '', {
        expires: new Date(Date.now()),
        sameSite:'none',
        secure:true
        })
        .json('logged out');
})

app.post("/register", async (req, res) => {
    try{
        const {username, password} = req.body;
        let user = await User.findOne({username});
        if(user) {
            console.log("user already exists, do log in");
            return res.status(500).json("error");
        }
        const hashed_password = await bcrypt.hash(password, 10);
        user = await User.create({username, password : hashed_password});
        sendCookie(user, res);
    }catch(error) {
        throw(error);
    }
});

const server = app.listen(4000);

const wss = new WebSocketServer({server}) ;

wss.on('connection', (connection, req) => {

    function notifyAboutOnlinePeople() {
        // notify everyone about online users (when someone connects)
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify({
                online : [...wss.clients].map(c => ({userId:c.userId, username:c.username}))
            }));
        });
    }

    connection.isAlive = true;

    connection.timer = setInterval(() => {
        connection.ping();
        connection.deathTimer = setTimeout(() => {
            connection.isAlive = false;
            connection.terminate();
            notifyAboutOnlinePeople();
        }, 1000);
    }, 5000);

    connection.on('pong', () => {
        clearTimeout( connection.deathTimer );
    });

    // reading id and username of the logged in user
    const cookies = req.headers.cookie;
    if(cookies){
        const tokenCookieString = cookies.split(';').find((str) => str.startsWith('token='));
        const token = tokenCookieString.split('=')[1];
        if(token){
            jwt.verify(token, process.env.JWT_SECRET, {}, (err, data) => {
                if(err) throw err;
                const {userId, username} = data;
                connection.userId = userId;
                connection.username = username; 
            })
        }
    }

    // on getting message sending to recipient and in the all devices he logged in using filter
    connection.on('message', async (message) => {
        const messageData = JSON.parse(message.toString());
        const {recipient, text, file} = messageData;
        let filename = null;
        if(file){
            const parts = file.name.split('.');
            const ext = parts[parts.length - 1];
            filename = Date.now() + '.' + ext;
            const pathToFile = path.join(currentDir, 'uploads', filename);
            const bufferData = Buffer.from(file.data.split(',')[1], 'base64');
            fs.writeFile(pathToFile, bufferData, (err) => {
                if(err) console.log(err);
                else console.log('file saved: ' + pathToFile);
            });
        }
        if(recipient && (text || file)){
            const messageDoc = await Message.create({sender: connection.userId, recipient, text, file: filename});
            [...wss.clients]
            .filter(c => c.userId === recipient)
            .forEach(c => c.send(JSON.stringify({text, recipient, sender: connection.userId, _id: messageDoc._id, file: filename})));
        }
    });
    
    notifyAboutOnlinePeople();
});
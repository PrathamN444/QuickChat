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

dotenv.config();
connectDB();

const app = express();

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
    const {ourUserId} = data.userId;
    const messages = await Message.find({
        sender : {$in:[userId, ourUserId]},
        recipient : {$in:[userId, ourUserId]}, 
    }).sort({createdAt : 1});
    res.json(messages);
});


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
        const {recipient, text} = messageData;
        if(recipient && text){
            const messageDoc = await Message.create({sender: connection.userId, recipient, text});
            [...wss.clients]
            .filter(c => c.userId === recipient)
            .forEach(c => c.send(JSON.stringify({text, recipient, sender: connection.userId, id: messageDoc._id})));
        }
    });
    
    // notify everyone about online users (when someone connects)
    [...wss.clients].forEach(client => {
        client.send(JSON.stringify({
            online : [...wss.clients].map(c => ({userId:c.userId, username:c.username}))
        }));
    });
});
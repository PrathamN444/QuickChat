import { useContext, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import {uniqBy} from "lodash";
import axios from "axios";


export default function Chat() {

    const [ws, setWs] = useState(null);
    const [onlinePeople, setOnlinePeople] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [newMessages, setNewMessages] = useState('');
    const [allMessages, setAllMessages] = useState([]);
    const {id} = useContext(UserContext);
    const divUnderMessages = useRef();

    useEffect(() => {
        connectToWs();
    }, []);

    function connectToWs(){
        const socket = new WebSocket('ws://localhost:4000');
        setWs(socket);
        socket.addEventListener('message', handleMessage);
        socket.addEventListener('close', () => {
            setTimeout(() => {
                connectToWs();
            }, 1000);
        });
    }

    function showOnlinePeople(peopleArray){
        const people = {};
        peopleArray.forEach((person) => {
            people[person.userId] = person.username;
        });
        setOnlinePeople(people);
    }

    function handleMessage(e){
        const messageData = JSON.parse(e.data);
        if('online' in messageData){
            showOnlinePeople(messageData.online);
        }
        else if('text' in messageData){
            setAllMessages(prev => ([...prev, {...messageData}]));
        }
    }

    const onlinePeopleExcOurUser = {...onlinePeople};
    delete onlinePeopleExcOurUser[id];

    const messagesWithoutDuplicates = uniqBy(allMessages, 'id');

    function sendMessage(e){
        e.preventDefault();
        ws.send(JSON.stringify({
            recipient : selectedUserId,
            text : newMessages,
        }))
        setAllMessages(prev => ([...prev, {text : newMessages, recipient: selectedUserId, sender: id, id: Date.now()}]));
        setNewMessages('');
    }

    // to set div to bottom when a new message comes in chat box 
    useEffect(() => {
        const div = divUnderMessages.current;
        if(div){
            div.scrollIntoView({behaviour: 'smooth', block: 'end'});
        }
    }, [allMessages])

    useEffect(() => {
        if(selectedUserId){
            axios.get(`/messages/${selectedUserId}`).then(response => {
                setAllMessages(response.data);
            });
        }
    }, [selectedUserId]);
    

    return (
        <div className="flex h-screen">
            <div className="w-1/3 bg-white p-2">
                <Logo />
                {Object.keys(onlinePeopleExcOurUser).map(userId => (
                    <div key={userId} 
                        onClick={() => setSelectedUserId(userId)}
                        className={ "border-b border-gray-400 flex items-center cursor-pointer rounded-md " + (selectedUserId === userId ? "bg-blue-100" : "")}
                    >
                        {userId === selectedUserId && (
                            <div className="w-1 h-16 bg-blue-500 rounded-r-md"></div>
                        )}
                        <div className="flex items-center gap-3 p-2">
                            <Avatar userId={userId} username={onlinePeople[userId]}/>
                            <span className="font-bold text-gray-800"> {onlinePeople[userId]} </span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="w-2/3 bg-blue-100 flex flex-col p-2 gap-1">
                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className="flex flex-grow h-full items-center justify-center text-gray-400">send and recieve messages without any delay</div>
                    )}
                    {!!selectedUserId && (
                        <div className="relative h-full">
                            <div className="overflow-y-scroll absolute inset-0">
                                {messagesWithoutDuplicates.map((msg, i) => (
                                    <div key={i} className={" " + (msg.sender === id ? "text-right" : "text-left")}>
                                        <div className={"p-2 mx-2 my-1 text-left inline-block rounded-md " + (msg.sender === id ? "bg-green-400" : "bg-gray-400")}>
                                            sender : {msg.sender} <br/>
                                            my id : {id} <br/>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                <div ref={divUnderMessages}></div>
                            </div>
                        </div>
                    )}
                </div>
                {!!selectedUserId && (
                    <form className="flex gap-2" onSubmit={sendMessage}>
                        <input 
                            value={newMessages}
                            onChange={(e) => setNewMessages(e.target.value)}
                            type="text" 
                            placeholder="Type your message here"
                            className="border rounded-sm flex-grow p-2"
                        />
                        <button type="submit" className="p-2 bg-blue-500 border rounded-sm text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                            </svg>
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

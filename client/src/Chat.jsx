import { useContext, useEffect, useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext";


export default function Chat() {

    const [ws, setWs] = useState(null);
    const [onlinePeople, setOnlinePeople] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [newMessages, setNewMessages] = useState('');
    const [allMessages, setAllMessages] = useState([]);
    const {id} = useContext(UserContext);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:4000');
        setWs(socket);
        socket.addEventListener('message', handleMessage);
    }, []);

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
        else{
            // console.log(messageData);
            setAllMessages(prev => ([...prev, {text : messageData.text, isOur : false}]));
        }
    }

    const onlinePeopleExcOurUser = {...onlinePeople};
    delete onlinePeopleExcOurUser[id];

    function sendMessage(e){
        e.preventDefault();
        ws.send(JSON.stringify({
            recipient : selectedUserId,
            text : newMessages,
        }))
        setNewMessages('');
        setAllMessages(prev => ([...prev, {text : newMessages, isOur : true}]));
    }

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
            <div className="w-2/3 bg-blue-100 flex flex-col p-2">
                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className="flex flex-grow h-full items-center justify-center text-gray-400">send and recieve messages without any delay</div>
                    )}
                    {!!selectedUserId && (
                        <div>
                            {allMessages.map((msg, i) => (
                                <div key={i}>{msg.text}</div>
                            ))}
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

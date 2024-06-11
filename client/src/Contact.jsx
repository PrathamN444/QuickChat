import Avatar from "./Avatar";

export default function Contact({userId, username, selected, onClick, online}) {
    return (
        <div key={userId} onClick={() => onClick(userId)}
            className={ "border-b border-gray-400 flex items-center cursor-pointer rounded-md " + (selected ? "bg-blue-100" : "")}
        >
            {selected && (
                <div className="w-1 h-16 bg-blue-500 rounded-r-md"></div>
            )}
            <div className="flex items-center gap-3 p-2">
                <Avatar online={online} userId={userId} username={username}/>
                <span className="font-bold text-gray-800"> {username} </span>
            </div>
        </div>
    );
}
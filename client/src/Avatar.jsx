
export default function Avatar({username, userId}){

    const colorArr = ['bg-teal-200', 'bg-red-200', 'bg-blue-200', 'bg-orange-200', 'bg-green-200', 'bg-purple-200'];

    const userIdBase10 = parseInt(userId, 16);
    const colorIndex = userIdBase10 % colorArr.length; 
    const color = colorArr[colorIndex];

    return (
        <div className={"w-12 h-12 rounded-full flex items-center " + color}>
            <div className="text-center w-full font-bold opacity-80">{username[0]}</div>
        </div>
    );
}
import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "./UserContext";

export default function Register() {

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const {setUsername: setLoggedInUsername, setId} = useContext(UserContext);
    const [registerOrLogin, setRegisterOrLogin] = useState('register');

    async function handleSubmit (e) {
        e.preventDefault();
        const url = registerOrLogin === 'register' ? '/register' : '/login';
        const {data} = await axios.post(url, {username, password});
        setLoggedInUsername(username);
        setId(data.id);
    }

    return(
        <div className="bg-blue-50 h-screen flex items-center">
            <form className="w-64 m-auto text-center" onSubmit={handleSubmit}>
                <input 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    type="text" 
                    placeholder="username" 
                    className="block w-full p-2 mb-2 border rounded-sm" 
                />
                <input 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password" 
                    placeholder="password" 
                    className="block w-full p-2 mb-2 border rounded-sm"
                />
                <button className="block bg-blue-500 text-white w-full p-2 rounded-md">{registerOrLogin === 'register' ? 'Register' : 'Login'}</button>
                
                <div className="m-auto text-center mt-6 font-bold text-40px hover:text-lg">
                    {registerOrLogin === 'register' && (
                        <button onClick={() => setRegisterOrLogin('login')}> To Login, click here !</button>
                    )}
                    {registerOrLogin === 'login' && (
                        <button onClick={() => setRegisterOrLogin('register')}> To Register, click here !</button>
                    )}
                </div>

            </form>
        </div>
    );
}
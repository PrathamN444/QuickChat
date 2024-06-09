import mongoose from "mongoose";

export const connectDB = () => {
    mongoose.connect(process.env.MONGO_URL, {
        dbName : "QuickChat_backend",
    })
    .then((c) => console.log(`database connected to server ${c.connection.host}`))
    .catch((e) => console.log(e));
};
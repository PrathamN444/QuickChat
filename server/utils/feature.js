import jwt from "jsonwebtoken";

export const sendCookie = (createdUser, res) => {
    const token = jwt.sign({userId : createdUser._id, username : createdUser.username}, process.env.JWT_SECRET);

    res.status(201).cookie('token', token, {
        httpOnly: true,
        // maxAge: 60 * 60 * 1000,
        sameSite: 'none',
        secure: true,
    }).json("token generated");
};
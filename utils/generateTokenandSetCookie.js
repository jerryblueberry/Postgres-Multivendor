
const jwt = require('jsonwebtoken');

const generateTokenAndSetCookie = (userId, userName, userLocation, res) => {
    const token = jwt.sign({ userId, userName, userLocation }, 'MXIUuw6u5Ty0Ecih3XCjZ1+0575N2OTu0x9gsOl6pBc=', {
        expiresIn: '15d'
    });

    res.cookie("jwt", token, {
        maxAge: 15 * 60 * 60 * 24 * 1000, // milliseconds
        httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
        sameSite: "strict" // Protects against CSRF attacks
    });
}

module.exports = { generateTokenAndSetCookie };

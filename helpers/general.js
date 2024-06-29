const jwt = require("jsonwebtoken");
const { AUTH_FAILED } = require("../constants/messages");
const { OK } = require("../constants/constants");
const bcrypt = require("bcryptjs");
const nodeMailer = require("nodemailer");

module.exports.makeResponse = (res, message, code = OK, data = null) => {
  res.status(code).send({
    message,
    data,
  });
};

module.exports.getTokenData = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.SECRET, (err, data) => {
      if (err) return reject(AUTH_FAILED);
      return resolve(data);
    });
  });
};

module.exports.generateHash = async (data) => {
  let salt = await bcrypt.genSalt();
  let hash = await bcrypt.hash(data, salt);
  return hash;
};

module.exports.compareHash = async (originalData, hash) => {
  return await bcrypt.compare(originalData, hash);
};

module.exports.generateToken = (payload) => {
  return jwt.sign(payload, process.env.SECRET, {
    expiresIn: process.env.EXPIRATION_PERIOD * 60,
  });
};

module.exports.sendMail = (to, subject, html) => {
  return new Promise((resolve, reject) => {
    let transporter = nodeMailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    let options = {
      from: process.env.MAIL_USERNAME,
      to,
      subject,
      html,
    };
    transporter.sendMail(options, (err, info) => {
      if (err) return reject(err);
      return resolve("Email sent: ", info.response);
    });
  });
};

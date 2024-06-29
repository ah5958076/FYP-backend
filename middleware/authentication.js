const { UNAUTHORIZED } = require("../constants/constants");
const { AUTH_FAILED } = require("../constants/messages");
const { fetch } = require("../helpers/DBHandler");
const { getTokenData, makeResponse } = require("../helpers/general");

module.exports.authentication = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return makeResponse(res, AUTH_FAILED, UNAUTHORIZED);

  let data = await getTokenData(token);
  if (data) {
    let userID = data.userID || data.profile.userID;
    let user = await fetch(`/users/${userID}`);
    if (user && user.status === "Online") {
      delete user?.password;
      req.user = user;
      return next();
    }
  }
  return makeResponse(res, AUTH_FAILED, UNAUTHORIZED);
};
